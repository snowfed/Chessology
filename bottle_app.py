#import sys
#reload(sys)
#sys.setdefaultencoding('utf-8')
from bottle import default_app, route, static_file, get, post, request

@route('/')
def main_page():
    return static_file("index.html", root='/home/chessology/mysite') #html

@route('/hello')
def hello():
    return "Hello World!"

@route('/static/:path#.+#', name='static')
def static(path):
    return static_file(path, root='/home/chessology/mysite/static')

@post('/sendrecv')
def handle_sendrecv():
    filename = request.forms.get('filename')
    if filename == None or filename == '':
        filename = 'chessboard.txt'
    filename = "/home/chessology/mysite/" + filename
    text_board = request.forms.get('chessboard')
    if text_board == None or text_board == '':
        text_file = open(filename, 'r')
        text_board = text_file.read()
        text_file.close()
        return text_board
    else:
        text_file = open(filename, "w")
        text_file.write(text_board)
        text_file.close()

@route('/george')
def hello_george():
    return """<html>
    <title>George's Page</title>
    <body>
    <table>
        <tr>
            <td>
                <p>Hey, George!</p>
                <p>Good news, sir! On my website you can have any username you like!</p>
                <p>Fedor A.</p>
                <p>
                <img src="https://googledrive.com/host/0B2NVTrJqCSg4SXdHMW1HbDgxZ28/chess_board_nc_impersonal.jpg" width="460" height="360" alt="Chess (c) snowfed, 2015">
                </p>
            </td>
            <td>
                <object data=https://en.m.wikipedia.org/wiki/Bobby_Fischer width="600" height="500">
                </object>
            </td>
        </tr>
    </table>
    </body>
    </html>"""

application = default_app()

