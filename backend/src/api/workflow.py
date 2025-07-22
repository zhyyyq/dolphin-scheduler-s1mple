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
from .ds import get_workflows as get_ds_workflows
from cron_descriptor import get_description
from dotenv import load_dotenv

load_dotenv()

WORKFLOW_REPO_DIR = os.getenv("WORKFLOW_REPO_DIR")


router = APIRouter()

class WorkflowYaml(BaseModel):
    name: str
    content: str
    original_filename: str = None

class RestoreWorkflowPayload(BaseModel):
    filename: str
    commit_hash: str

class RevertWorkflowPayload(BaseModel):
    workflow_uuid: str
    commit_hash: str

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
        
        # The logic for auto-submission has been removed based on user feedback.
        # The new flow requires the user to explicitly sync changes for online workflows.
        # We will add a status field to the YAML to track this.
        if not is_create:
            # When updating, we mark the local status as 'modified'
            # The frontend will use this to show a 'Sync' button.
            data['workflow']['local_status'] = 'modified'
        else:
            # For new workflows, the status is 'new'
            data['workflow']['local_status'] = 'new'
        
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
        logger.info(f"Found {len(workflows)} workflows in the database.")
        
        local_files = []
        yaml = YAML(typ='rt')
        for wf in workflows:
            filename = f"{wf.uuid}.yaml"
            file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
            mod_time = None
            schedule = None
            local_status = None

            if os.path.exists(file_path):
                mod_time = os.path.getmtime(file_path)
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = yaml.load(f)
                    workflow_meta = data.get('workflow', {})
                    schedule = workflow_meta.get('schedule')
                    local_status = workflow_meta.get('local_status', 'synced')


            local_files.append({
                "name": wf.name,
                "uuid": wf.uuid,
                "projectName": "Local File",
                "releaseState": "OFFLINE",
                "updateTime": mod_time,
                "code": filename,
                "isLocal": True,
                "schedule": schedule,
                "local_status": local_status,
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
            "filename": filename,
            "yaml_content": content
        }
    except Exception as e:
        logger.error(f"Error reading local workflow file {workflow_uuid}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not read local workflow file: {e}")

@router.get("/api/workflows/combined")
async def get_combined_workflows(db: Session = Depends(get_db)):
    try:
        ds_workflows = await get_ds_workflows()
        local_workflows = await get_local_workflows(db)

        local_workflows_map = {wf['name']: wf for wf in local_workflows}
        ds_workflows_map = {wf['name']: wf for wf in ds_workflows}

        all_workflow_names = set(local_workflows_map.keys()) | set(ds_workflows_map.keys())

        combined_workflows = []
        for name in all_workflow_names:
            local_wf = local_workflows_map.get(name)
            ds_wf = ds_workflows_map.get(name)

            combined_wf = {}
            if ds_wf and local_wf:
                combined_wf = {
                    **local_wf,
                    **ds_wf,
                    'uuid': local_wf['uuid'],
                    'isLocal': True,
                }
            elif ds_wf:
                combined_wf = {
                    **ds_wf,
                    'isLocal': False,
                    'uuid': ds_wf.get('uuid') or f"ds-{ds_wf.get('projectCode')}-{ds_wf.get('code')}"
                }
            elif local_wf:
                combined_wf = {
                    **local_wf,
                    'releaseState': 'UNSUBMITTED',
                    'isLocal': True,
                }
            
            # Standardize schedule display text
            schedule_text = None
            schedule_human_readable = None
            schedule_obj = combined_wf.get('schedule')
            if schedule_obj:
                if isinstance(schedule_obj, dict): # From DS
                    schedule_text = schedule_obj.get('crontab')
                else: # From local file
                    schedule_text = str(schedule_obj)
                
                if schedule_text:
                    # Hardcoded fix for the specific problematic Quartz cron string from DolphinScheduler
                    if schedule_text.strip() == '0 0 0 * * ? *' or schedule_text.strip() == '0 0 0 * * ?':
                        schedule_human_readable = "每天 00:00"
                    else:
                        try:
                            # Try parsing as Quartz first, as it's a common format from DS
                            schedule_human_readable = get_description(schedule_text, is_quartz=True, locale='zh_CN', use_24hour_time_format=True)
                        except Exception:
                            # Fallback to standard cron if quartz parsing fails
                            try:
                                schedule_human_readable = get_description(schedule_text, locale='zh_CN', use_24hour_time_format=True)
                            except Exception:
                                schedule_human_readable = "无效的 Cron 表达式"
            
            combined_wf['schedule_text'] = schedule_text
            combined_wf['schedule_human_readable'] = schedule_human_readable
            combined_workflows.append(combined_wf)
        
        return combined_workflows
    except Exception as e:
        logger.error(f"Error fetching combined workflows: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch combined workflows.")

@router.post("/api/workflow/{workflow_uuid}/online")
async def online_workflow(workflow_uuid: str, db: Session = Depends(get_db)):
    try:
        db_workflow = db.query(Workflow).filter(Workflow.uuid == workflow_uuid).first()
        if not db_workflow:
            raise HTTPException(status_code=404, detail="Workflow not found in database.")

        filename = f"{workflow_uuid}.yaml"
        await ds_service.submit_workflow_to_ds(filename)
        
        return {"message": "Workflow successfully put online."}
    except Exception as e:
        logger.error(f"Error putting workflow {workflow_uuid} online: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not put workflow online: {e}")

@router.delete("/api/workflow/{workflow_uuid}")
async def delete_workflow(
    workflow_uuid: str, 
    project_code: int = Query(None), 
    workflow_code: int = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # Flag to check if any deletion happened
        deleted_something = False

        # 1. Attempt to delete from DolphinScheduler if codes are provided
        if project_code and workflow_code:
            await ds_service.delete_ds_workflow(project_code, workflow_code)
            logger.info(f"Successfully deleted workflow from DolphinScheduler: project {project_code}, workflow {workflow_code}")
            deleted_something = True

        # 2. Attempt to delete locally if a DB entry exists for the UUID
        db_workflow = db.query(Workflow).filter(Workflow.uuid == workflow_uuid).first()
        if db_workflow:
            filename = f"{db_workflow.uuid}.yaml"
            file_path = os.path.join(WORKFLOW_REPO_DIR, filename)

            # Delete from DB
            db.delete(db_workflow)
            db.commit()
            logger.info(f"Deleted workflow {workflow_uuid} from database.")

            # Safely delete file from repo and commit
            if os.path.exists(file_path):
                os.remove(file_path)
                git_service.git_commit(filename, f"Delete workflow: {filename}")
                logger.info(f"Deleted workflow file {filename} from repository.")
            else:
                logger.warning(f"DB entry for {filename} deleted, but file was not found in repo.")
            
            deleted_something = True

        if not deleted_something:
            raise HTTPException(status_code=404, detail=f"Workflow with UUID {workflow_uuid} not found.")

        return {"message": "Workflow deleted successfully."}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting workflow {workflow_uuid}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not delete workflow: {e}")

@router.get("/api/workflows/deleted")
async def get_deleted_workflows_endpoint():
    try:
        return git_service.get_deleted_workflows()
    except Exception as e:
        logger.error(f"Error fetching deleted workflows: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch deleted workflows.")

@router.post("/api/workflow/restore")
async def restore_workflow_endpoint(payload: RestoreWorkflowPayload, db: Session = Depends(get_db)):
    try:
        result = git_service.restore_workflow(payload.filename, payload.commit_hash)
        
        # After restoring the file, we need to create a corresponding entry in our database.
        # We parse the restored file to get its name and uuid.
        file_path = os.path.join(WORKFLOW_REPO_DIR, payload.filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            yaml = YAML()
            data = yaml.load(f)
            workflow_meta = data.get('workflow', {})
            workflow_name = workflow_meta.get('name')
            workflow_uuid = workflow_meta.get('uuid')

            if not workflow_name or not workflow_uuid:
                raise HTTPException(status_code=500, detail="Restored file is missing 'name' or 'uuid'.")

            # Check if a workflow with this UUID or name already exists to avoid conflicts.
            existing_by_uuid = db.query(Workflow).filter(Workflow.uuid == workflow_uuid).first()
            existing_by_name = db.query(Workflow).filter(Workflow.name == workflow_name).first()
            if existing_by_uuid or existing_by_name:
                # If it already exists, we don't need to add it again.
                # This can happen if only the file was deleted but not the DB entry.
                logger.warning(f"Workflow '{workflow_name}' (uuid: {workflow_uuid}) already exists in DB. Skipping DB entry creation.")
            else:
                new_workflow = Workflow(uuid=workflow_uuid, name=workflow_name)
                db.add(new_workflow)
                db.commit()
                logger.info(f"Created DB entry for restored workflow '{workflow_name}'.")

        return result
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Error restoring workflow: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not restore workflow: {e}")

@router.post("/api/workflow/revert")
async def revert_workflow_endpoint(payload: RevertWorkflowPayload):
    try:
        filename = f"{payload.workflow_uuid}.yaml"
        return git_service.revert_to_commit(filename, payload.commit_hash)
    except Exception as e:
        logger.error(f"Error reverting workflow {payload.workflow_uuid} to {payload.commit_hash}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not revert workflow: {e}")
