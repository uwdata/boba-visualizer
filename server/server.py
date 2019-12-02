import os
from flask import Flask, send_file

P_DIST = '../client/dist/'

# global app
app = Flask(__name__, static_url_path='', static_folder=P_DIST)

# entry
@app.route('/')
def index ():
    return send_file(os.path.join(P_DIST, 'index.html'))

if __name__ == '__main__':
    msg = """\033[92m
    Server started!
    Navigate to http://127.0.0.1:5000/ in your browser
    Press CTRL+C to stop\033[0m"""
    print(msg)

    app.run(host= '0.0.0.0')
