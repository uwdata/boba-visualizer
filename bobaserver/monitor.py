# entry point and routes related to the boba run monitor

import os
import pandas as pd
from flask import jsonify, request
from boba.bobarun import BobaRun
from bobaserver import app
from .util import read_json, read_key_safe, print_fail, print_warn


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

# entry (already defined in routes)
# @app.route('/')
# def index():
#   return app.send_static_file('index.html')

@app.route('/api/monitor/start_runtime', methods=['POST'])
def start_runtime():
  app.bobarun = BobaRun(app.data_folder)

  # TODO: compute universe order
  # TODO: put on background process
  app.bobarun.run_multiverse()
  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/stop_runtime', methods=['POST'])
def stop_runtime():
  app.bobarun.stop()
  return jsonify({'status': 'success'}), 200
