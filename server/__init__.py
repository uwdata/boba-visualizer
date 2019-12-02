from flask import Flask

P_DIST = '../client/dist/'

app = Flask(__name__, static_url_path='', static_folder=P_DIST)

from server import routes
