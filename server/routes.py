import os
from flask import jsonify, request
from server import app
from .util import check_path, read_csv, read_json


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
# fixme: hard-code
@app.route('/api/get_pred', methods=['POST'])
def get_pred():
    fn = os.path.join(app.data_folder, 'prediction.csv')
    err, res = read_csv(fn, 0)
    reply = err if err else {'status': 'success', 'data': res[1:],
                             'header': res[0]}
    return jsonify(reply), 200

# read the overview, including decisions and ADG
@app.route('/api/get_overview', methods=['POST'])
def get_overview():
    fn = os.path.join(app.data_folder, 'overview.json')
    err, res = read_json(fn)
    reply = err if err else {'status': 'success', 'data': res}
    return jsonify(reply), 200

# read the actual and predicted data of all data points in a universe
@app.route('/api/get_raw', methods=['POST'])
def get_raw():
    uid = request.json['uid']
    fn = os.path.join(app.data_folder, 'raw', 'disagg_pred_{}.csv'.format(uid))
    err, res = read_csv(fn, 0)
    reply = err if err else {'status': 'success', 'data': res[1:],
                             'header': res[0]}
    return jsonify(reply), 200
