# entry point and routes related to the boba run monitor

import os
import pandas as pd
from flask import jsonify, request
from boba.bobarun import BobaRun
from bobaserver import app
from .util import read_json, read_csv, read_key_safe, print_fail

# global
from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(2)


def check_path(p, more=''):
  """Check if the path exists"""
  if not os.path.exists(p):
    msg = 'Error: {} does not exist.'.format(p)
    print_fail(msg + more)
    exit(0)


def start_monitor ():
  """ Read files and store meta data """

  # read overview.json
  fn = os.path.join(app.data_folder, 'overview.json')
  err, res = read_json(fn)
  if (err):
    print_fail(err['message'])
    exit(0)

  # read summary.csv
  fn = os.path.join(app.data_folder, 'summary.csv')
  check_path(fn)
  smr = pd.read_csv(fn, na_filter=False)
  smr['uid'] = smr.apply(lambda r: r.name + 1, axis=1).astype(int)

  # save meta data
  vis = read_key_safe(res, ['visualizer'], {})
  sen = read_key_safe(vis, ['sensitivity'], 'ad')
  app.boba_meta = {
    'sensitivity': sen,
    'summary': smr,
    'decisions': read_key_safe(res, ['decisions'], {}),
    'graph': read_key_safe(res, ['graph'], {})
  }
  app.bobarun = BobaRun(app.data_folder)

# entry (already defined in routes)
# @app.route('/')
# def index():
#   return app.send_static_file('index.html')

@app.route('/api/monitor/start_runtime', methods=['POST'])
def start_runtime():
  # TODO: compute universe order
  order = []

  # run_multiverse is not thread safe ... we are hoping that start_runtime
  # will not be called twice within a short time
  executor.submit(app.bobarun.run_multiverse, order)
  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/stop_runtime', methods=['POST'])
def stop_runtime():
  # fixme: post_exe.sh will still run after stop is called
  # when it is running, user will not be able to re-start
  # so we want to have two status: "stopping" and "stopped"
  app.bobarun.stop()
  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/check_progress', methods=['POST'])
def check_progress():
  res = {'status': 'success',
    'logs': [],
    'is_running': app.bobarun.is_running()}

  if os.path.exists(app.bobarun.file_log):
    err, t = read_csv(app.bobarun.file_log)
    res['logs'] = t

  return jsonify(res), 200
