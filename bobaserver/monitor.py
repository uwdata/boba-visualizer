# routes related to the boba run monitor

import os
import pandas as pd
from flask import jsonify, request
from boba.bobarun import BobaRun
from bobaserver import app
from .util import read_csv, read_key_safe

# global
from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(2)


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
