import os
import subprocess

from flask import Blueprint, render_template, send_from_directory, jsonify, request

from app.config import Config

editor_bp = Blueprint('editor', __name__)

@editor_bp.route("/editor")
def home():
    path = os.path.join(Config.COMPILEDIR, 'test.tex')
    if os.path.isfile(path):
        with open(path, encoding='utf8') as file:
            tex_contents = file.read()
    else:
        tex_contents = ""
    return render_template("editor.html", tex_contents = tex_contents)

@editor_bp.route("/fetch_pdf")
def fetch_pdf():
    pdf_path = os.path.join(Config.COMPILEDIR, "test.pdf")
    directory = os.path.abspath(os.path.dirname(pdf_path))
    filename = os.path.basename(pdf_path)
    return send_from_directory(directory, filename)

@editor_bp.route("/save_and_compile", methods=['POST'])
def save_and_compile():
    data = request.get_json()
    latex_content = data.get("content", "")
    os.makedirs("workplace", exist_ok=True)
    with open(os.path.join("workplace", "test.tex"), "w", encoding="utf-8") as f:
        f.write(latex_content)
    
    process = subprocess.Popen(
        ['xelatex', '-interaction=nonstopmode', '-halt-on-error', 'test.tex'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, 
        cwd="./workplace"
    )
    stdout, stderr = process.communicate()

    if process.returncode == 1:
        return jsonify({
            "content": stderr.decode(), 
            "status": 500
        }), 500
    return jsonify({
        "content": "Complete", 
        "status": 200
    }), 200

