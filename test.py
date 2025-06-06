from flask import Flask, render_template, send_file

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/my_pdf")
def my_pdf():
    return send_file("D:/TEMP/test.pdf")

if __name__ == "__main__":
    app.run("0.0.0.0", 5000, debug=True)
