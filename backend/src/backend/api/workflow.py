from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import subprocess
import uuid
from ruamel.yaml import YAML
from sqlalchemy.orm import Session
from ..parser import parse_workflow
from ..db.setup import create_db_connection, Workflow
from ..core.logger import logger
from ..services import git_service

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORKFLOW_REPO_DIR = os.path.join(BACKEND_DIR, "workflow_repo")

router = APIRouter()

class WorkflowYaml(BaseModel):
    name: str
    content: str
    original_filename: str = None

def get_db():
    db = create_db_connection()
    try:
        yield db
    finally:
        db.close()

@router.post("/api/workflow/yaml")
async def save_workflow_yaml(workflow: WorkflowYaml, db: Session = Depends(get_db)):
    try:
        yaml = YAML()
        data = yaml.load(workflow.content)
        
        if 'workflow' not in data:
            data['workflow'] = {}

        workflow_meta = data.get('workflow', {})
        workflow_name = workflow_meta.get('name')
        workflow_uuid = workflow_meta.get('uuid')
        is_create = not workflow_uuid

        if is_create:
            existing_workflow = db.query(Workflow).filter(Workflow.name == workflow_name).first()
        else:
            existing_workflow = db.query(Workflow).filter(Workflow.name == workflow_name, Workflow.uuid != workflow_uuid).first()
        
        if existing_workflow:
            raise HTTPException(status_code=409, detail=f"A workflow with the name '{workflow_name}' already exists.")

        if is_create:
            workflow_uuid = str(uuid.uuid4())
            data['workflow']['uuid'] = workflow_uuid
            commit_message = f"Create workflow {workflow_name}"
            new_workflow = Workflow(uuid=workflow_uuid, name=workflow_name)
            db.add(new_workflow)
        else:
            commit_message = f"Update workflow {workflow_name}"
            db_workflow = db.query(Workflow).filter(Workflow.uuid == workflow_uuid).first()
            if db_workflow:
                db_workflow.name = workflow_name

        db.commit()

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
        
        git_service.git_commit(filename, commit_message)

        return {
            "message": "Workflow saved successfully.",
            "filename": filename,
            "uuid": workflow_uuid
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error in /api/workflow/yaml: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to save workflow: {e}")

@router.get("/api/workflows/local")
async def get_local_workflows(db: Session = Depends(get_db)):
    try:
        workflows = db.query(Workflow).all()
        local_files = []
        for wf in workflows:
            filename = f"{wf.uuid}.yaml"
            file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
            mod_time = os.path.getmtime(file_path) if os.path.exists(file_path) else None
            
            local_files.append({
                "name": wf.name,
                "uuid": wf.uuid,
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

@router.get("/api/workflow/{workflow_uuid}")
async def get_workflow_details(workflow_uuid: str):
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
async def delete_workflow(workflow_uuid: str, db: Session = Depends(get_db)):
    try:
        db_workflow = db.query(Workflow).filter(Workflow.uuid == workflow_uuid).first()
        if db_workflow:
            db.delete(db_workflow)
            db.commit()
        else:
            logger.warning(f"No workflow with UUID {workflow_uuid} found in the database to delete.")

        filename = f"{workflow_uuid}.yaml"
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            git_service.git_commit(filename, f"Delete workflow file: {filename}")
        else:
            logger.warning(f"Workflow file {filename} not found in repo, but deleted from DB.")

        return {"message": "Workflow deleted successfully."}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting local workflow file {workflow_uuid}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not delete local workflow file: {e}")
