import os
from flask import jsonify
from server import app
from .util import print_fail, read_csv


# entry
@app.route('/')
def index():
    return app.send_static_file('index.html')

# read the summary file
@app.route('/api/get_universes', methods=['POST'])
def get_universes():
    fn = os.path.join(app.data_folder, 'summary.csv')
    if not os.path.exists(fn):
        msg = 'Error: {} does not exist.'.format(fn)
        print_fail(msg)
        return jsonify({'status': 'fail', 'message': msg}), 200

    res = read_csv(fn, 0)
    reply = {'status': 'success', 'data': res[1:], 'header': res[0]}
    return jsonify(reply), 200
