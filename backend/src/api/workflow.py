from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
import os
import subprocess
import uuid
from ruamel.yaml import YAML
from sqlalchemy.orm import Session
from ..parser import parse_workflow
from ..db.setup import create_db_connection, Workflow
from ..core.logger import logger
from ..services import git_service, ds_service, file_service

WORKFLOW_REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'workflow_repo'))

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
        if not workflows:
            logger.info("No workflows found in the database. Loading demo workflow.")
            demo_workflow_content = """
# Define the workflow
workflow:
  name: "tutorial"
  schedule: "0 0 0 * * ? *"
  start_time: "2021-01-01"
  release_state: "offline"
  run: true

# Define the tasks within the workflow
tasks:
  - name: task_parent
    task_type: Shell
    command: echo hello pydolphinscheduler

  - name: task_child_one
    task_type: Shell
    deps: [task_parent]
    command: echo "child one"

  - name: task_child_two
    task_type: Shell
    deps: [task_parent]
    command: echo "child two"

  - name: task_union
    task_type: Shell
    deps: [task_child_one, task_child_two]
    command: echo "union"
"""
            yaml = YAML()
            data = yaml.load(demo_workflow_content)
            workflow_name = data['workflow']['name']
            workflow_uuid = str(uuid.uuid4())
            data['workflow']['uuid'] = workflow_uuid
            
            new_workflow = Workflow(uuid=workflow_uuid, name=workflow_name)
            db.add(new_workflow)
            db.commit()
            
            filename = f"{workflow_uuid}.yaml"
            file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
            with open(file_path, "w", encoding="utf-8") as buffer:
                buffer.write(demo_workflow_content)
            
            git_service.git_commit(filename, "Add demo workflow")
            workflows = db.query(Workflow).all()

        logger.info(f"Found {len(workflows)} workflows in the database.")
        logger.info(f"workflow_repo directory contents: {os.listdir(WORKFLOW_REPO_DIR)}")
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
async def get_workflow_details(workflow_uuid: str, db: Session = Depends(get_db)):
    try:
        db_workflow = db.query(Workflow).filter(Workflow.uuid == workflow_uuid).first()
        if not db_workflow:
            raise HTTPException(status_code=404, detail="Workflow not found in database.")

        filename = f"{workflow_uuid}.yaml"
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
        if not os.path.exists(file_path):
            # If the file doesn't exist but the DB entry does, it's an inconsistent state.
            # For now, we'll treat it as "not found" from the user's perspective.
            raise HTTPException(status_code=404, detail="Workflow file not found, though a DB record exists.")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        yaml_parser = YAML()
        raw_data = yaml_parser.load(content)
        parsed_data = parse_workflow(content)
        
        workflow_meta = raw_data.get('workflow', {})
        
        return {
            "name": db_workflow.name, # Use the name from the DB as the source of truth
            "uuid": db_workflow.uuid,
            "schedule": workflow_meta.get('schedule'),
            "tasks": parsed_data.get("tasks", []), # Default to empty list
            "relations": parsed_data.get("relations", []), # Default to empty list
            "filename": filename
        }
    except Exception as e:
        logger.error(f"Error reading local workflow file {workflow_uuid}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not read local workflow file: {e}")

@router.delete("/api/workflow/{workflow_uuid}")
async def delete_workflow(
    workflow_uuid: str, 
    project_code: int = Query(None), 
    workflow_code: int = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # If DS codes are provided, delete from DolphinScheduler first
        if project_code and workflow_code:
            logger.info(f"Deleting workflow from DolphinScheduler: project {project_code}, workflow {workflow_code}")
            await ds_service.delete_ds_workflow(project_code, workflow_code)
            logger.info(f"Successfully deleted workflow from DolphinScheduler.")

        # Delete from local repo and DB
        filename = f"{workflow_uuid}.yaml"
        
        # Delete from DB
        db_workflow = db.query(Workflow).filter(Workflow.uuid == workflow_uuid).first()
        if db_workflow:
            db.delete(db_workflow)
            db.commit()
            logger.info(f"Deleted workflow {workflow_uuid} from database.")
        else:
            logger.warning(f"Workflow {workflow_uuid} not found in database for deletion.")

        # Delete file from repo
        file_service.delete_workflow_file(filename)
        logger.info(f"Deleted workflow file {filename} from repository.")

        return {"message": "Workflow deleted successfully from all locations."}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting workflow {workflow_uuid}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not delete workflow: {e}")
