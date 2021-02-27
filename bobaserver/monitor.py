# routes related to the boba run monitor

import os
import pandas as pd
from flask import jsonify, request
from bobaserver import app, socketio, scheduler
from .util import read_csv, read_key_safe


class BobaWatcher:
  def __init__(self):
    pass

  def check_progress(self):
    # remove self from scheduled jobs if boba run has finished
    if not app.bobarun.is_running():
      scheduler.remove_job('watcher')

    print('check progress')
    data = {}
    socketio.emit('update', data)


# entry (already defined in routes)
# @app.route('/')
# def index():
#   return app.send_static_file('index.html')


@app.route('/api/monitor/start_runtime', methods=['POST'])
def start_runtime():
  # TODO: compute universe order
  order = []

  fresh = not app.bobarun.is_running()

  # if last run is completed, instead of stopped, the job will still remain
  # in the scheduler. We need to remove the job to start again.
  if fresh and scheduler.get_job('bobarun'):
    scheduler.remove_job('bobarun')

  if fresh:
    # periodic check for progress
    app.bobawatcher = BobaWatcher()
    scheduler.add_job(app.bobawatcher.check_progress, 'interval', seconds=5,
      id='watcher')

  # the scheduler will ensure that we have only 1 running instance
  scheduler.add_job(app.bobarun.run_multiverse, args=[order], id='bobarun')

  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/stop_runtime', methods=['POST'])
def stop_runtime():
  # fixme: post_exe.sh will still run after stop is called
  # when it is running, user will not be able to re-start
  # so we want to have two status: "stopping" and "stopped"
  app.bobarun.stop()
  return jsonify({'status': 'success'}), 200


@app.route('/api/monitor/inquire_progress', methods=['POST'])
def inquire_progress():
  res = {'status': 'success',
    'logs': [],
    'is_running': app.bobarun.is_running()}

  if os.path.exists(app.bobarun.file_log):
    err, t = read_csv(app.bobarun.file_log)
    res['logs'] = t

  return jsonify(res), 200
