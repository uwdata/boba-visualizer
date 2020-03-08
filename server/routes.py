import os
from flask import jsonify, request
from server import app
from .util import read_csv, read_json, read_key_safe
import numpy as np


# entry
@app.route('/')
def index():
    return app.send_static_file('index.html')

# read the summary file
@app.route('/api/get_universes', methods=['POST'])
def get_universes():
    fn = os.path.join(app.data_folder, 'summary.csv')
    err, res = read_csv(fn, 0)
    reply = err if err else {'status': 'success', 'data': res[1:],
                             'header': res[0]}
    return jsonify(reply), 200

# read prediction
@app.route('/api/get_pred', methods=['POST'])
def get_pred():
    fn = read_key_safe(app.visualizer, ['agg_plot', 'data'], 'pred.csv')
    fn = os.path.join(app.data_folder, fn)
    err, res = read_csv(fn, 0)
    reply = err if err else {'status': 'success', 'data': res[1:],
                             'header': res[0]}
    return jsonify(reply), 200

# read uncertainty
@app.route('/api/get_uncertainty', methods=['POST'])
def get_uncertainty():
    fn = read_key_safe(app.visualizer, ['agg_plot', 'uncertainty'], '')
    fn = os.path.join(app.data_folder, fn)
    err, res = read_csv(fn, 0)
    reply = err if err else {'status': 'success', 'data': res[1:],
                             'header': res[0]}
    return jsonify(reply), 200

# read the overview, including decisions and ADG
@app.route('/api/get_overview', methods=['POST'])
def get_overview():
    fn = os.path.join(app.data_folder, 'overview.json')
    err, res = read_json(fn)
    reply = err if err else {'status': 'success', 'data': res,
                             'sensitivity': app.sensitivity_f}
    return jsonify(reply), 200

# read the actual and predicted data of all data points in a universe
@app.route('/api/get_raw', methods=['POST'])
def get_raw():
    uid = request.json['uid']
    fn = read_key_safe(app.visualizer, ['raw_plot', 'data'], 'raw_{}.csv')
    fn = os.path.join(app.data_folder, fn.format(uid))
    err, res = read_csv(fn, 1)
    reply = err if err else {'status': 'success'}

    if not err:
        m = 100
        data = []
        for i in range(2):
            long = list(map(lambda d: float(d[i]), res))
            if len(long) > m:
                # quantile dot plot
                qt = np.append(np.arange(0, 1, 1 / m), 1.0)
                data.append(np.quantile(long, qt).tolist())
            else:
                data.append(long)

        reply['data'] = data

    return jsonify(reply), 200
