from server import app

def main():
    msg = """\033[92m
    Server started!
    Navigate to http://127.0.0.1:8080/ in your browser
    Press CTRL+C to stop\033[0m"""
    print(msg)

    app.run(host= '0.0.0.0', port='8080')

if __name__ == '__main__':
    main()
