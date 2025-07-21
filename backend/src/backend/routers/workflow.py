from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import os
import subprocess
import logging
import httpx
import uuid
from ruamel.yaml import YAML
from ..parser import parse_workflow
from ..db import create_db_connection

logger = logging.getLogger(__name__)

# Define project root and workflow repo directory consistently
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORKFLOW_REPO_DIR = os.path.join(BACKEND_DIR, "workflow_repo")

router = APIRouter()

class WorkflowYaml(BaseModel):
    name: str
    content: str
    original_filename: str = None

@router.post("/api/workflow/yaml")
async def save_workflow_yaml(workflow: WorkflowYaml):
    """
    Saves or updates a YAML workflow file using its UUID as the filename.
    """
    try:
        yaml = YAML()
        data = yaml.load(workflow.content)
        
        if 'workflow' not in data:
            data['workflow'] = {}

        workflow_meta = data.get('workflow', {})
        workflow_name = workflow_meta.get('name')
        workflow_uuid = workflow_meta.get('uuid')
        is_create = not workflow_uuid

        # Check for duplicate names in the database
        connection = create_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM workflows WHERE name = %s AND uuid != %s", (workflow_name, workflow_uuid))
            existing_workflow = cursor.fetchone()
            connection.close()
            if existing_workflow:
                raise HTTPException(status_code=409, detail=f"A workflow with the name '{workflow_name}' already exists.")

        if is_create:
            workflow_uuid = str(uuid.uuid4())
            data['workflow']['uuid'] = workflow_uuid
            commit_message = f"Create workflow {workflow_name}"
            # Add to database
            connection = create_db_connection()
            if connection:
                cursor = connection.cursor()
                cursor.execute("INSERT INTO workflows (uuid, name) VALUES (%s, %s)", (workflow_uuid, workflow_name))
                connection.commit()
                connection.close()
        else:
            commit_message = f"Update workflow {workflow_name}"
            # Update in database
            connection = create_db_connection()
            if connection:
                cursor = connection.cursor()
                cursor.execute("UPDATE workflows SET name = %s WHERE uuid = %s", (workflow_name, workflow_uuid))
                connection.commit()
                connection.close()

        filename = f"{workflow_uuid}.yaml"
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)

        if workflow.original_filename and workflow.original_filename != filename:
            old_file_path = os.path.join(WORKFLOW_REPO_DIR, workflow.original_filename)
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
                commit_message = f"Migrate and update workflow {workflow_name} to UUID-based storage"

        from io import StringIO
        string_stream = StringIO()
        yaml.dump(data, string_stream)
        final_content = string_stream.getvalue()

        with open(file_path, "w", encoding="utf-8") as buffer:
            buffer.write(final_content)
        
        subprocess.run(["git", "add", "."], cwd=WORKFLOW_REPO_DIR, check=True)
        
        status_result = subprocess.run(["git", "status", "--porcelain"], cwd=WORKFLOW_REPO_DIR, check=True, capture_output=True, text=True)
        if status_result.stdout.strip():
            subprocess.run(["git", "commit", "-m", commit_message], cwd=WORKFLOW_REPO_DIR, check=True)
        else:
            logger.info("No changes to commit.")

        return {
            "message": "Workflow saved successfully.",
            "filename": filename,
            "uuid": workflow_uuid
        }
    except subprocess.CalledProcessError as e:
        err_msg = f"Git operation failed: {e.stderr}"
        logger.error(err_msg)
        raise HTTPException(status_code=500, detail=err_msg)
    except Exception as e:
        logger.error(f"Error in /api/workflow/yaml: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to save workflow: {e}")

@router.get("/api/workflows/local")
async def get_local_workflows():
    """Lists workflows from the database."""
    connection = create_db_connection()
    if not connection:
        return []
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT uuid, name FROM workflows")
        workflows = cursor.fetchall()
        
        local_files = []
        for wf in workflows:
            filename = f"{wf['uuid']}.yaml"
            file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
            mod_time = os.path.getmtime(file_path) if os.path.exists(file_path) else None
            
            local_files.append({
                "name": wf['name'],
                "uuid": wf['uuid'],
                "projectName": "Local File",
                "releaseState": "OFFLINE",
                "updateTime": mod_time,
                "code": filename,
                "isLocal": True,
            })
        return local_files
    except Exception as e:
        logger.error(f"Error fetching local workflows from DB: {e}")
        return []
    finally:
        if connection.is_connected():
            connection.close()

@router.get("/api/workflow/{workflow_uuid}")
async def get_workflow_details(workflow_uuid: str):
    """
    Fetches the detailed structure of a specific local workflow using its UUID.
    """
    try:
        filename = f"{workflow_uuid}.yaml"
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Local workflow file not found.")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        yaml_parser = YAML()
        raw_data = yaml_parser.load(content)
        parsed_data = parse_workflow(content)
        
        workflow_meta = raw_data.get('workflow', {})
        
        return {
            "name": workflow_meta.get('name', filename),
            "uuid": workflow_meta.get('uuid'),
            "schedule": workflow_meta.get('schedule'),
            "tasks": parsed_data.get("tasks"),
            "relations": parsed_data.get("relations"),
            "filename": filename
        }
    except Exception as e:
        logger.error(f"Error reading local workflow file {workflow_uuid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not read local workflow file: {e}")

@router.delete("/api/workflow/{workflow_uuid}")
async def delete_workflow(workflow_uuid: str):
    """Deletes a local workflow file and its database record."""
    # First, delete from the database
    connection = create_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Could not connect to the database.")
    try:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM workflows WHERE uuid = %s", (workflow_uuid,))
        connection.commit()
        if cursor.rowcount == 0:
            logger.warning(f"No workflow with UUID {workflow_uuid} found in the database to delete.")
    except Exception as e:
        logger.error(f"Error deleting workflow {workflow_uuid} from DB: {e}")
        raise HTTPException(status_code=500, detail="Database error during deletion.")
    finally:
        if connection.is_connected():
            connection.close()

    # Then, delete the file from the repository
    try:
        filename = f"{workflow_uuid}.yaml"
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            # Manually handle git commit for deletion
            subprocess.run(["git", "add", "-u", "."], cwd=WORKFLOW_REPO_DIR, check=True)
            status_result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=WORKFLOW_REPO_DIR,
                check=True,
                capture_output=True,
                text=True
            )
            if status_result.stdout.strip():
                subprocess.run(
                    ["git", "commit", "-m", f"Delete workflow file: {filename}"],
                    cwd=WORKFLOW_REPO_DIR,
                    check=True
                )
        else:
            logger.warning(f"Workflow file {filename} not found in repo, but deleted from DB.")

        return {"message": "Workflow deleted successfully."}
    except Exception as e:
        logger.error(f"Error deleting local workflow file {workflow_uuid}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not delete local workflow file: {e}")
