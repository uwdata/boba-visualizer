import os
import numpy as np
import pandas as pd
import math
from flask import jsonify, request
from bobaserver import app
from .util import read_csv, read_json, read_key_safe, group_by, remove_na
import bobaserver.common as common


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

# read point estimates, p-value, fit metric value, and stacking weights
@app.route('/api/get_pred', methods=['POST'])
def get_pred():
    fields = ['point_estimate', 'p_value', 'fit', 'stacking_weight',
        'annotation', 'standard_error']
    res = common.read_results_batch(fields)
    header = res.columns.tolist()

    # remove Inf and NA in point estimates
    res = remove_na(res, 'point_estimate', dtype=float)

    res = [res[n].values.tolist() for n in header]
    reply = {'status': 'success', 'data': res, 'header': header,
        'sensitivity': app.sensitivity}
    return jsonify(reply), 200

# read uncertainty
@app.route('/api/get_uncertainty', methods=['POST'])
def get_uncertainty():
    f = app.schema['uncertainty']
    fn = os.path.join(app.data_folder, f['file'])
    err, res = read_csv(fn, 0)
    reply = err if err else {'status': 'success', 'data': res[1:]}
    if not err:
        header = ['uncertainty' if d == f['field'] else d for d in res[0]]
        reply['header'] = header

    return jsonify(reply), 200

# read the null distribution of point estimates
@app.route('/api/get_null', methods=['POST'])
def get_null():
    f = app.schema['null_distribution']
    fn = os.path.join(app.data_folder, f['file'])
    err, res = read_csv(fn, 0)
    reply = err if err else {'status': 'success', 'data': res[1:]}
    if not err:
        header = ['null_distribution' if d == f['field'] else d for d in res[0]]
        reply['header'] = header
    return jsonify(reply), 200

# read the overview, including decisions and ADG
@app.route('/api/get_overview', methods=['POST'])
def get_overview():
    res = {'schema': [app.schema[d]['name'] for d in app.schema],
        'decisions': app.decisions}
    res.update(app.visualizer)
    reply = {'status': 'success', 'data': res}
    return jsonify(reply), 200

# read the actual and predicted data of all data points in a universe
@app.route('/api/get_raw', methods=['POST'])
def get_raw():
    # fixme: prediction might not exist
    # fixme: now we assume specific column order, should use field name
    uid = request.json['uid']
    f = app.schema['prediction']
    fn = os.path.join(app.data_folder, f['file'].format(uid))
    err, res = read_csv(fn, 1)
    reply = err if err else {'status': 'success'}

    if not err:
        # sampling
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

        # apply transform
        trans = read_key_safe(f, ['transform'], None)
        if trans:
            trans = trans.format('x')
            for i in range(2):
                data[i] = [eval(trans) for x in data[i]]

        reply['data'] = data

    return jsonify(reply), 200
