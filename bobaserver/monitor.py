# routes related to the boba run monitor

import os
import time
import pandas as pd
from flask import jsonify, request
from .util import read_csv, read_key_safe
from bobaserver import app, socketio, scheduler
import bobaserver.bobastats.sampling as sampling
import bobaserver.common as common


class BobaWatcher:
  def __init__(self, order, weights=None):
    self.start_time = time.time()

    # sampling order and weights
    self.order = [uid - 1 for uid in order]  # convert to 0-indexed
    self.weights = weights

    # results
    self.last_merge_index = 0
    self.outcomes = []


  def update_outcome(self, done):
    step = min(5, max(1, int(app.bobarun.size / 50)))
    if len(done) - self.last_merge_index < step:
      return

    # merge result file
    app.bobarun.run_after_execute()
    df = common.read_results('point_estimate', float)
    df = pd.merge(app.summary, df, on='uid', how='left')
    col = common.get_field_name('point_estimate')

    # compute results since the last index
    start = (int(self.last_merge_index / step) + 1) * step
    self.last_merge_index = len(done) - 1
    res = []
    for i in range(start, len(done), step):
      indices = self.order[:i+1]
      res.append([i] + sampling.bootstrap_outcome(df, col, indices, self.weights))
    self.outcomes += res

    # TODO: write results to file
    # TODO: send to client


  def check_progress(self):
    # remove self from scheduled jobs if boba run has finished
    if not app.bobarun.is_running():
      scheduler.remove_job('watcher')
    print('check progress')

    # estimate remaining time
    logs = app.bobarun.exit_code
    done = max(1, len(logs)) # avoid division by 0
    elapsed = time.time() - self.start_time
    remain = app.bobarun.size - done
    remain = int(elapsed * remain / done)

    # schedule jobs to compute results
    if not scheduler.get_job('update_outcome'):
      scheduler.add_job(self.update_outcome, args=[logs], id='update_outcome')

    res = {'status': 'success',
      'logs': logs,
      'time_left': remain,
      'is_running': app.bobarun.is_running()}

    socketio.emit('update', res)


def check_stopped():
  # after client issued stop command, check if boba has indeed stopped
  if not app.bobarun.is_running():
    scheduler.remove_job('check_stopped')
    socketio.emit('stopped')


# entry (already defined in routes)
# @app.route('/')
# def index():
#   return app.send_static_file('index.html')


@app.route('/api/monitor/start_runtime', methods=['POST'])
def start_runtime():
  # compute sampling order and weights
  # TODO: allow users to specify the sampling method
  df = common.get_decision_df()
  order, weights = sampling.round_robin(df, df.shape[0])
  order = order.tolist()
  if weights is not None:
    weights = 1 / (weights * df.shape[0])

  fresh = not app.bobarun.is_running()

  # if last run is completed, instead of stopped, the job will still remain
  # in the scheduler. We need to remove the job to start again.
  if fresh and scheduler.get_job('bobarun'):
    scheduler.remove_job('bobarun')

  if fresh:
    # periodic check for progress
    app.bobawatcher = BobaWatcher(order, weights)
    scheduler.add_job(app.bobawatcher.check_progress, 'interval', seconds=5,
      id='watcher', replace_existing=True)

  # set batch size to 1 so the log would be updated more frequently
  app.bobarun.batch_size = 1

  # the scheduler will ensure that we have only 1 running instance
  scheduler.add_job(app.bobarun.run_multiverse, args=[order], id='bobarun')

  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/stop_runtime', methods=['POST'])
def stop_runtime():
  # ask boba run to stop, but post_exe.sh will still run
  app.bobarun.stop()

  # periodically check if boba run has indeed stopped
  scheduler.add_job(check_stopped, 'interval', seconds=1, id='check_stopped')

  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/inquire_progress', methods=['POST'])
def inquire_progress():
  res = {'status': 'success',
    'logs': [],
    'size': app.bobarun.size,
    'is_running': app.bobarun.is_running()}

  if os.path.exists(app.bobarun.file_log):
    err, t = read_csv(app.bobarun.file_log)
    res['logs'] = t

  return jsonify(res), 200
