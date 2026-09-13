from waitress import serve

from app import create_app
from app.config import Config, initialize_data

app = create_app()

# Set maximum upload size
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1024 MB

def init_data():
    """Initialize persistent settings and workspace files before serving."""
    initialize_data()

if __name__ == '__main__':
    init_data()
    print(f">> Starting Server on {Config.HOST}:{Config.PORT} <<")
    serve(app, host=Config.HOST, port=Config.PORT)
