import os
import subprocess

from app import create_app
from app.config import Config

app = create_app()

# Set maximum upload size
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1024 MB

def check_cmd():
    cmd = [Config.TEXCMD, '--version']
    process = subprocess.Popen(
        cmd, 
        stderr=subprocess.PIPE, 
        stdout=subprocess.PIPE
    )
    process.wait()
    if process.returncode != 0:
        raise ValueError(f"Unavailable command: `{Config.TEXCMD}`")

def init_data():
    # check xelatex
    check_cmd()
    
    # ensure COMPILEDIR exists
    if not os.path.isdir(Config.COMPILEDIR):
        os.mkdir(Config.COMPILEDIR)

if __name__ == '__main__':
    init_data()
    app.run(host=Config.HOST, port=Config.PORT, debug=True)
