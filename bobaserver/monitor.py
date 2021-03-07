# routes related to the boba run monitor

import os
import time
import pandas as pd
import numpy as np
from flask import jsonify, request
from .util import read_csv, read_key_safe
from bobaserver import app, socketio, scheduler
from bobaserver.bobastats import sampling, sensitivity
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
    self.decision_scores = []


  @staticmethod
  def get_fn_outcome():
    return os.path.join(app.bobarun.dir_log, 'outcomes.csv')
  @staticmethod
  def get_fn_sensitivity():
    return os.path.join(app.bobarun.dir_log, 'sensitivity.csv')
  @staticmethod
  def get_header_sensitivity():
    return ['n_samples', 'type'] + common.get_decision_list()


  def _append_csv(self, fn, header, data):
    # append to the csv if it exists, or create one
    if os.path.exists(fn):
      f = open(fn, 'a')
    else:
      f = open(fn, 'w')
      f.write(','.join(header) + '\n')
    for r in data:
      f.write(','.join([str(i) for i in r]) + '\n')
    f.close()


  def _impute_null_CI(self, data, previous, col=0):
    # impute NaN in CIs, assuming data is a 2D list [..., mean, lower, upper]
    # where col is the column index of mean. Modify data in place.
    for i, d in enumerate(data):
      for j in [col + 1, col + 2]:
        if np.isnan(d[j]):
          d[j] = data[i - 1][j] if i > 0 else (previous[-1][j] \
            if len(previous) else d[col])


  def _NaN_to_string(self, arr):
    # convert NaN to string 'nan'. It will happen in place in the input arr.
    for i in range(len(arr)):
      arr[i] = ['nan' if isinstance(r, float) and np.isnan(r) else r \
        for r in arr[i]]


  def _compute_dec_CI(self, df, col, indices, dec_list, i):
    """ Compute bootstrap CI of decision sensitivity """
    res = sampling.bootstrap_sensitivity(df, col, indices, dec_list)
    out = [[i, c] + res[f'score_{c}'].tolist() for c in ['lower', 'upper']]

    # convert NaN to string
    self._NaN_to_string(out)
    self.decision_scores += out

    # write results to disk
    self._append_csv(BobaWatcher.get_fn_sensitivity(),
      BobaWatcher.get_header_sensitivity(), out)

    # send to client
    socketio.emit('update-sensitivity', {'data': self.decision_scores,
      'header': BobaWatcher.get_header_sensitivity()})


  def update_outcome(self, done):
    step = min(5, max(1, int(app.bobarun.size / 50)))
    if len(done) - self.last_merge_index <= step:
      return

    # merge result file
    app.bobarun.run_after_execute()
    df = common.read_results('point_estimate', float)
    df = pd.merge(app.summary, df, on='uid', how='left')
    col = common.get_field_name('point_estimate')
    dec_list = common.get_decision_list()

    # compute results since the last index
    start = (int(self.last_merge_index / step) + 1) * step
    self.last_merge_index = len(done) - 1
    res = []
    sen = []
    indices = None
    for i in range(start, len(done), step):
      indices = self.order[:i+1]

      # outcome mean
      out = sampling.bootstrap_outcome(df, col, indices, self.weights)
      res.append([i] + out)

      # decision sensitivity, without CI
      # FIXME: hard coded for AD test
      ad = [sensitivity.ad_wrapper(df.iloc[indices], dec, col) \
        for dec in dec_list]
      sen.append([i, 'score'] + [s[0] for s in ad])
      sen.append([i, 'p'] + [s[1] for s in ad])

    # schedule a job to compute the decision CI, for the last index
    if (not scheduler.get_job('compute_CI')) and (indices is not None):
      scheduler.add_job(self._compute_dec_CI, id='compute_CI', 
        args=[df, col, indices, dec_list, i])

    # impute null in CI and remove null in mean
    self._impute_null_CI(res, self.outcomes, 1)
    res = [r for r in res if not np.isnan(r[1])]
    self.outcomes += res

    # convert NaN in decision sensitivity to string 'nan'
    self._NaN_to_string(sen)
    self.decision_scores += sen

    # write results to disk
    self._append_csv(BobaWatcher.get_fn_outcome(), self.header_outcome, res)
    self._append_csv(BobaWatcher.get_fn_sensitivity(),
      BobaWatcher.get_header_sensitivity(), sen)

    # send to client
    socketio.emit('update-outcome', {'data': self.outcomes, 
      'header': self.header_outcome})
    socketio.emit('update-sensitivity', {'data': self.decision_scores,
      'header': BobaWatcher.get_header_sensitivity()})


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

  # order is not a list of uid, but indices into the summary table
  # lookup again to get the actual uid
  order = common.read_summary().iloc[order]['uid'].tolist()
  # compute likelihood ratio
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
    'decision_scores': {'data': [], 'header': []},
    'size': app.bobarun.size,
    'is_running': app.bobarun.is_running()}

  # exit code
  if os.path.exists(app.bobarun.file_log):
    err, t = read_csv(app.bobarun.file_log)
    res['logs'] = t

  # outcome CI time series
  if hasattr(app, 'bobawatcher'):
    res['outcome']['data'] = app.bobawatcher.outcomes
    res['decision_scores']['data'] = app.bobawatcher.decision_scores
    res['decision_scores']['header'] = app.bobawatcher.get_header_sensitivity()
  else:
    fn = BobaWatcher.get_fn_outcome()
    if os.path.exists(fn):
      df = pd.read_csv(fn)
      res['outcome']['data'] = df.values.tolist()
    fn = BobaWatcher.get_fn_sensitivity()
    if os.path.exists(fn):
      # convert NaN to string 'nan'; client needs to convert it back to js NaN
      df = pd.read_csv(fn).fillna('nan')
      res['decision_scores']['data'] = df.values.tolist()
      res['decision_scores']['header'] = df.columns.tolist()

  # it's possible to recover outcome CI if there are no weights (ie. uniform)
  # logs = [int(r[0]) for r in res['logs']]
  # BobaWatcher(logs).update_outcome(logs)

  return jsonify(res), 200
