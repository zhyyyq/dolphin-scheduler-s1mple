import os
import shutil
from fastapi import UploadFile, HTTPException
from ..db.setup import SessionLocal, Workflow as WorkflowDB
from ..core.logger import logger

# Use a dedicated directory for user-uploaded reference files.
# This keeps them separate from the demo files.
UPLOAD_DIR = os.path.join(os.getenv("WORKFLOW_REPO_DIR"), 'resources')

def get_workflow_path_by_name(name: str) -> str:
    """
    Finds a workflow's file UUID by its internal name from the database.
    """
    db = SessionLocal()
    try:
        workflow = db.query(WorkflowDB).filter(WorkflowDB.name == name).first()
        if not workflow:
            return None
        # The UUID is the filename without the extension
        return f"{workflow.uuid}.yaml"
    except Exception as e:
        logger.error(f"Database error while fetching workflow by name '{name}': {e}")
        return None
    finally:
        db.close()


def list_uploaded_files():
    """Lists all files in the designated resource directory."""
    try:
        if not os.path.exists(UPLOAD_DIR):
            os.makedirs(UPLOAD_DIR)
            return []

        files_info = []
        for filename in os.listdir(UPLOAD_DIR):
            file_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files_info.append({
                    "filename": filename,
                    "size": stat.st_size,
                    "last_modified": stat.st_mtime,
                })
        # Sort by last modified time, newest first
        files_info.sort(key=lambda x: x['last_modified'], reverse=True)
        return files_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not list files: {e}")


def save_uploaded_file(file: UploadFile):
    """Saves an uploaded file to the designated resource directory."""
    try:
        # Basic security: prevent path traversal attacks.
        filename = os.path.basename(file.filename)
        if not filename:
            raise HTTPException(status_code=400, detail="Invalid filename.")

        # Ensure the upload directory exists.
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        file_path = os.path.join(UPLOAD_DIR, filename)

        # To prevent overwriting existing files, you might want to add a check here.
        # For now, we will overwrite.
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {"filename": filename, "path": file_path}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
