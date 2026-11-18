import os
import shlex
import subprocess
from pathlib import Path
from typing import Any, Mapping
import base64
from io import BytesIO

from PIL import Image
from flask import Blueprint, current_app, render_template, send_from_directory, jsonify, request, session

from app.config import Config, DEFAULT_WORKSPACE_ID, Workspace
from app.support.filter import logged_in_only
from app.support.ocr import ocr

editor_bp = Blueprint('editor', __name__)
WORKSPACE_SESSION_KEY = "workspace"


def _workspace_data(workspace: Workspace) -> dict[str, str]:
    """Return the session/API representation of a workspace."""
    return {"workspace_id": workspace.workspace_id, **workspace.to_dict()}


def _store_workspace(workspace: Workspace) -> None:
    """Store the selected workspace in the current Flask session."""
    session[WORKSPACE_SESSION_KEY] = _workspace_data(workspace)


def _current_workspace() -> Workspace:
    """Get the session workspace, defaulting to the persisted default one."""
    stored = session.get(WORKSPACE_SESSION_KEY)
    if isinstance(stored, Mapping):
        workspace_id = stored.get("workspace_id", DEFAULT_WORKSPACE_ID)
        if isinstance(workspace_id, str) and workspace_id.strip():
            return Workspace.from_dict(stored, workspace_id)

    workspace = Workspace.load(DEFAULT_WORKSPACE_ID)
    _store_workspace(workspace)
    return workspace


def _json_body() -> tuple[dict[str, Any] | None, tuple[Any, int] | None]:
    """Return a JSON object body, or a standard 400 response."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify(error="Request body must be a JSON object."), 400)
    return data, None


def _workspace_from_payload(
    workspace_id: str,
    data: Mapping[str, Any],
    existing: Workspace | None = None,
) -> Workspace:
    """Apply supplied workspace fields, keeping omitted fields unchanged."""
    base = existing or Workspace.default(workspace_id)
    values = {**base.to_dict(), **data}
    return Workspace.from_dict(values, workspace_id)

@editor_bp.route("/editor")
@logged_in_only
def editor():
    workspace = _current_workspace()
    path = os.path.join(workspace.working_dir, workspace.tex_filename)
    if os.path.isfile(path):
        with open(path, encoding='utf8') as file:
            tex_contents = file.read()
    else:
        tex_contents = ""
    return render_template("editor.html", tex_contents=tex_contents, ocr_enabled=Config.OCR_ENABLED)

@editor_bp.route("/fetch_pdf")
@logged_in_only
def fetch_pdf():
    workspace = _current_workspace()
    pdf_path = os.path.join(
        workspace.working_dir,
        f"{Path(workspace.tex_filename).stem}.pdf",
    )
    directory = os.path.abspath(os.path.dirname(pdf_path))
    filename = os.path.basename(pdf_path)
    return send_from_directory(directory, filename)

@editor_bp.route("/save_and_compile", methods=['POST'])
@logged_in_only
def save_and_compile():
    data = request.get_json(silent=True) or {}
    latex_content = data.get("content", "")
    workspace = _current_workspace()
    os.makedirs(workspace.working_dir, exist_ok=True)
    with open(os.path.join(workspace.working_dir, workspace.tex_filename), "w", encoding="utf-8") as f:
        f.write(latex_content)

    compile_cmd = workspace.compile_cmd.replace("{{ TEX_FILENAME }}", workspace.tex_filename)
    process = subprocess.Popen(
        shlex.split(compile_cmd),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=workspace.working_dir,
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


@editor_bp.route("/api/workspaces", methods=["GET"])
@logged_in_only
def list_workspaces():
    """List every persisted workspace and the one selected in this session."""
    current = _current_workspace()
    workspaces = Workspace.load_all()
    return jsonify(
        current_workspace_id=current.workspace_id,
        workspaces=[_workspace_data(workspace) for workspace in workspaces.values()],
    )


@editor_bp.route("/api/workspaces", methods=["POST"])
@logged_in_only
def create_workspace():
    """Create a workspace.  The JSON body must include ``workspace_id``."""
    data, error = _json_body()
    if error:
        return error

    try:
        workspace_id = Workspace._validate_id(data.get("workspace_id")) # type: ignore
    except ValueError as exception:
        return jsonify(error=str(exception)), 400

    workspaces = Workspace.load_all()
    if workspace_id in workspaces:
        return jsonify(error=f"Workspace already exists: {workspace_id}"), 409

    workspace = _workspace_from_payload(workspace_id, data) # type: ignore
    workspace.initialize()
    workspaces[workspace_id] = workspace
    Workspace.save_all(workspaces)
    return jsonify(workspace=_workspace_data(workspace)), 201


@editor_bp.route("/api/workspaces/<workspace_id>", methods=["PUT", "PATCH"])
@logged_in_only
def update_workspace(workspace_id: str):
    """Update supplied settings of an existing workspace."""
    data, error = _json_body()
    if error:
        return error

    try:
        workspace_id = Workspace._validate_id(workspace_id)
    except ValueError as exception:
        return jsonify(error=str(exception)), 400

    workspaces = Workspace.load_all()
    existing = workspaces.get(workspace_id)
    if existing is None:
        return jsonify(error=f"Workspace not found: {workspace_id}"), 404

    workspace = _workspace_from_payload(workspace_id, data, existing) # type: ignore
    workspaces[workspace_id] = workspace
    Workspace.save_all(workspaces)
    if _current_workspace().workspace_id == workspace_id:
        _store_workspace(workspace)
    return jsonify(workspace=_workspace_data(workspace))


@editor_bp.route("/api/workspaces/<workspace_id>/switch", methods=["POST"])
@logged_in_only
def switch_workspace(workspace_id: str):
    """Select an existing workspace for the current Flask session."""
    try:
        workspace_id = Workspace._validate_id(workspace_id)
    except ValueError as exception:
        return jsonify(error=str(exception)), 400

    workspace = Workspace.load_all().get(workspace_id)
    if workspace is None:
        return jsonify(error=f"Workspace not found: {workspace_id}"), 404
    _store_workspace(workspace)
    return jsonify(workspace=_workspace_data(workspace))


@editor_bp.route("/api/workspaces/<workspace_id>", methods=["DELETE"])
@logged_in_only
def delete_workspace(workspace_id: str):
    """Delete a workspace, keeping ``default`` as the fallback workspace."""
    try:
        workspace_id = Workspace._validate_id(workspace_id)
    except ValueError as exception:
        return jsonify(error=str(exception)), 400

    if workspace_id == DEFAULT_WORKSPACE_ID:
        return jsonify(error="The default workspace cannot be deleted."), 400

    workspaces = Workspace.load_all()
    if workspace_id not in workspaces:
        return jsonify(error=f"Workspace not found: {workspace_id}"), 404
    del workspaces[workspace_id]
    Workspace.save_all(workspaces)

    if _current_workspace().workspace_id == workspace_id:
        _store_workspace(workspaces[DEFAULT_WORKSPACE_ID])
    return "", 204

def _base64_to_pil(base64_str: str, output_path: str = None) -> Image.Image:
    # 1. Remove the data URI header if present (e.g., "data:image/png;base64,")
    if "," in base64_str:
        base64_str = base64_str.split(",", 1)[1]

    # 2. Decode the Base64 string into raw binary bytes
    image_bytes = base64.b64decode(base64_str)

    # 3. Wrap bytes in a BytesIO stream and open with PIL
    image = Image.open(BytesIO(image_bytes))

    # 4. Save to disk if an output path is provided
    if output_path:
        image.save(output_path)

    return image

@editor_bp.route("/api/sketch/ocr", methods=["POST"])
@logged_in_only
def ocr_sketch():
    """OCR the sketch. Return the recognized LaTeX code."""
    if not Config.OCR_ENABLED:
        return jsonify(error="OCR is disabled."), 403

    data, error = _json_body()
    if error:
        return error

    base64_data = data.get('image')
    if not isinstance(base64_data, str) or not base64_data:
        return jsonify(error="An image is required."), 400

    try:
        img = _base64_to_pil(base64_data)
        img.load()
    except (ValueError, OSError):
        return jsonify(error="Invalid image data."), 400

    try:
        with img:
            result = ocr(img)
    except Exception:
        current_app.logger.exception("Sketch OCR failed")
        return jsonify(error="OCR failed. Please try again."), 502

    if not result:
        return jsonify(error="No LaTeX was recognized."), 422

    return jsonify({"result": result})
