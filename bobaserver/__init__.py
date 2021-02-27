from flask import Flask
from flask_socketio import SocketIO
from apscheduler.schedulers.background import BackgroundScheduler

P_DIST = './dist/'

app = Flask(__name__, static_url_path='', static_folder=P_DIST)
socketio = SocketIO(app)
scheduler = BackgroundScheduler()

from bobaserver import routes
from bobaserver import monitor
