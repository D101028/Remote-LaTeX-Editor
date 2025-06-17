import os

from flask import Flask

def create_app():
    app = Flask(__name__)
    app.secret_key = os.urandom(24)  # Set a secret key for session encryption

    # Register blueprints
    from app.routes import auth_bp, editor_bp, home_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(editor_bp)
    app.register_blueprint(home_bp)

    return app
