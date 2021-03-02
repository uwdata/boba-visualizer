# routes related to the boba run monitor

import os
import time
import pandas as pd
import numpy as np
from flask import jsonify, request
from .util import read_csv, read_key_safe
from bobaserver import app, socketio, scheduler
import bobaserver.bobastats.sampling as sampling
import bobaserver.common as common


class BobaWatcher:
  # static attributes
  header_outcome = ['n_samples', 'mean', 'lower', 'upper']

  def __init__(self, order, weights=None):
    self.start_time = time.time()

    # sampling order and weights
    self.order = [uid - 1 for uid in order]  # convert to 0-indexed
    self.weights = weights

    # results
    self.last_merge_index = 0
    self.outcomes = []


  @staticmethod
  def get_fn_outcome ():
    return os.path.join(app.bobarun.dir_log, 'outcomes.csv')


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
      out = sampling.bootstrap_outcome(df, col, indices, self.weights)

      # if mean is NaN, skip
      if np.isnan(out[0]):
        continue
      # impute NaN in CIs
      for j in [1, 2]:
        if np.isnan(out[j]):
          out[j] = res[-1][j] if len(res) else (self.outcomes[-1][j] \
            if self.outcomes else out[0])

      res.append([i] + out)
    self.outcomes += res

    # write results to disk
    fn = BobaWatcher.get_fn_outcome()
    if os.path.exists(fn):
      f = open(fn, 'a')
    else:
      f = open(fn, 'w')
      f.write(','.join(self.header_outcome) + '\n')
    for r in res:
      f.write(','.join([str(i) for i in r]) + '\n')
    f.close()

    # send to client
    socketio.emit('update-outcome', {'data': self.outcomes, 
      'header': self.header_outcome})


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
    'outcome': {'data': [], 'header': BobaWatcher.header_outcome},
    'size': app.bobarun.size,
    'is_running': app.bobarun.is_running()}

  # exit code
  if os.path.exists(app.bobarun.file_log):
    err, t = read_csv(app.bobarun.file_log)
    res['logs'] = t

  # outcome CI time series
  fn = BobaWatcher.get_fn_outcome()
  if hasattr(app, 'bobawatcher'):
    res['outcome']['data'] = app.bobawatcher.outcomes
  elif os.path.exists(fn):
    df = pd.read_csv(fn)
    res['outcome']['data'] = df.values.tolist()

  # it's possible to recover outcome CI if there are no weights (ie. uniform)
  # logs = [int(r[0]) for r in res['logs']]
  # BobaWatcher(logs).update_outcome(logs)

  return jsonify(res), 200
