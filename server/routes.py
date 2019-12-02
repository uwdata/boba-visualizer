from server import app

# entry
@app.route('/')
def index ():
    return app.send_static_file('index.html')
