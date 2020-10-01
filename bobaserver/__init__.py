from flask import Flask

P_DIST = './dist/'

app = Flask(__name__, static_url_path='', static_folder=P_DIST)

from bobaserver import routes
