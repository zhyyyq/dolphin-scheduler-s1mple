import os
from fastapi import HTTPException
from ..core.logger import logger

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORKFLOW_REPO_DIR = os.path.join(BACKEND_DIR, "workflow_repo")

def get_workflow_content(workflow_name: str):
    """Gets the raw content of a specific workflow file."""
    try:
        if ".." in workflow_name or "/" in workflow_name or "\\" in workflow_name:
            raise HTTPException(status_code=400, detail="Invalid workflow name.")

        file_path = os.path.join(WORKFLOW_REPO_DIR, workflow_name)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Workflow file not found.")
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {"content": content}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error reading workflow file {workflow_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not read workflow file: {e}")
