# routes related to the boba run monitor

import os
import time
import pandas as pd
import numpy as np
from flask import jsonify, request
from .util import read_csv, read_json, write_json
from bobaserver import app, socketio, scheduler
from bobaserver.bobastats import sampling, sensitivity
import bobaserver.common as common


class BobaWatcher:
  # static attributes
  header_outcome = ['n_samples', 'mean', 'lower', 'upper']

  def __init__(self, order, weights=None):
    self.start_time = None
    self.prev_time = 0  # for resume

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
  def get_fn_save():
    return os.path.join(app.bobarun.dir_log, 'execution_plan.json')
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
    elapsed = self.get_elapsed()
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


  def stop(self):
    # stop timer
    t = 0 if self.start_time is None else time.time() - self.start_time
    self.prev_time += t
    self.start_time = None


  def start(self):
    # start timer and add job
    self.start_time = time.time()
    scheduler.add_job(self.check_progress, 'interval', seconds=5,
      id='watcher', replace_existing=True)


  def get_elapsed(self):
    t = 0 if self.start_time is None else time.time() - self.start_time
    return t + self.prev_time


  def save_to_file(self):
    # save data to file, so it is possible to resume later
    data = {'order': list(self.order), 'elapsed': self.get_elapsed()}
    if self.weights is not None:
      data['weights'] = list(self.weights)
    write_json(data, self.get_fn_save())


  def init_from_file(self):
    # resume from the previous save
    err, data = read_json(self.get_fn_save())
    if not err:
      self.order = data['order']
      self.weights = np.asarray(data['weights']) if 'weights' in data else None
      self.prev_time = data['elapsed']

    # read outcome and sensitivity progress
    fn = BobaWatcher.get_fn_outcome()
    if os.path.exists(fn):
      df = pd.read_csv(fn)
      self.last_merge_index = df['n_samples'].max()
      self.outcomes = df.values.tolist()
    fn = BobaWatcher.get_fn_sensitivity()
    if os.path.exists(fn):
      # convert NaN to string 'nan'; client needs to convert it back to js NaN
      df = pd.read_csv(fn).fillna('nan')
      self.decision_scores = df.values.tolist()


def check_stopped():
  # after client issued stop command, check if boba has indeed stopped
  if not app.bobarun.is_running():
    scheduler.remove_job('check_stopped')
    socketio.emit('stopped')


def merge_error ():
  """ Merge the error logs into errors.csv """
  fn = os.path.join(app.bobarun.dir_log, 'errors.csv')
  logs = []
  merged = []
  df = None

  # exit code
  if os.path.exists(app.bobarun.file_log):
    status = pd.read_csv(app.bobarun.file_log, index_col='uid')
    logs = status.index.tolist()

  # previous merged error
  if os.path.exists(fn):
    df = pd.read_csv(fn, na_filter=False)
    merged = df['uid'].tolist()

  # these are the new logs
  remain = set(logs).difference(set(merged))
  res = []
  for f in os.listdir(app.bobarun.dir_log):
    if f.startswith('error') and f.endswith('txt'):
      uid = int(os.path.splitext(f)[0].split('_')[1])
      if uid in remain:
        with open(os.path.join(app.bobarun.dir_log, f), 'r') as fo:
          data = fo.read()
          code = status.loc[uid]['exit_code']
          res.append([uid, code, data])

  # cluster errors into groups
  res = pd.DataFrame(res, columns=['uid', 'exit_code', 'message'])
  res = common.cluster_error(res)

  # save file and return
  df = res if df is None else pd.concat([df, res], ignore_index=True)
  df.to_csv(fn, index=False)
  return df, status


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
    app.bobawatcher.start()

  # set batch size to 1 so the log would be updated more frequently
  app.bobarun.batch_size = 1

  # the scheduler will ensure that we have only 1 running instance
  scheduler.add_job(app.bobarun.run_multiverse, args=[order], id='bobarun')

  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/resume_runtime', methods=['POST'])
def resume_runtime():
  # return error if bobarun is still running
  if app.bobarun.is_running():
    return jsonify({'status': 'fail', 'message': 'Boba is still running'}), 200

  # initialize boba watcher if this is a new instance
  if not hasattr(app, 'bobawatcher'):
    app.bobawatcher = BobaWatcher([])
    app.bobawatcher.init_from_file()

  # check if boba watcher is valid
  if len(app.bobawatcher.order) < 1:
    return jsonify({'status': 'fail',
      'message': 'Cannot find the previous execution plan'}), 200

  # convert order to 1-indexed
  order = [uid + 1 for uid in app.bobawatcher.order]

  # start runtime, as we do in start_runtime
  app.bobawatcher.start()
  app.bobarun.batch_size = 1
  scheduler.add_job(app.bobarun.resume_multiverse, args=[order], id='bobarun')

  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/stop_runtime', methods=['POST'])
def stop_runtime():
  # ask boba run to stop, but post_exe.sh will still run
  app.bobarun.stop()

  # save the plan, so we can resume later
  if hasattr(app, 'bobawatcher'):
    app.bobawatcher.stop()
    app.bobawatcher.save_to_file()

  # periodically check if boba run has indeed stopped
  scheduler.add_job(check_stopped, 'interval', seconds=1, id='check_stopped')

  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/get_snapshot', methods=['POST'])
def get_snapshot():
  res = {'status': 'success',
    'results': {'data': [], 'header': []},
    'errors': {'data': [], 'header': []}}

  if not os.path.exists(app.bobarun.dir_log):
    return jsonify(res), 200

  # error messages
  err_msg, exit_code = merge_error()
  res['errors']['data'] = err_msg.values.tolist()
  res['errors']['header'] = err_msg.columns.tolist()

  # perform merge because the last merge may be stale
  app.bobarun.run_after_execute()

  # read results and keep NA
  fields = ['point_estimate', 'p_value', 'fit']
  df = common.read_results_batch(fields)
  df = pd.merge(exit_code, df, on='uid', how='left').fillna('nan')
  res['results']['data'] = df.values.tolist()
  res['results']['header'] = df.columns.tolist()

  return jsonify(res), 200


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
  if not hasattr(app, 'bobawatcher'):
    app.bobawatcher = BobaWatcher([])
    app.bobawatcher.init_from_file()
  res['outcome']['data'] = app.bobawatcher.outcomes
  res['decision_scores']['data'] = app.bobawatcher.decision_scores
  res['decision_scores']['header'] = app.bobawatcher.get_header_sensitivity()

  # for debugging
  # logs = [int(r[0]) for r in res['logs']]
  # BobaWatcher(logs).update_outcome(logs)

  return jsonify(res), 200
