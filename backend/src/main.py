from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import subprocess
from parser import parse_workflow
from db.setup import init_db
from api.workflow import router as workflow_router
from api.ds import router as ds_router
from core.logger import setup_logger, logger
from services import git_service, process_service, file_service, ds_service

# Define project root and workflow repo directory consistently
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORKFLOW_REPO_DIR = os.path.join(BACKEND_DIR, "workflow_repo")
setup_logger()
app = FastAPI()

app.include_router(workflow_router)
app.include_router(ds_router)

@app.on_event("startup")
async def startup_event():
    """
    Initializes the Git repository and database table on application startup.
    """
    
    init_db()
    if not os.path.exists(WORKFLOW_REPO_DIR):
        os.makedirs(WORKFLOW_REPO_DIR)

    git_dir = os.path.join(WORKFLOW_REPO_DIR, ".git")
    
    if not os.path.exists(git_dir):
        logger.info(f"Git repository not found in {WORKFLOW_REPO_DIR}. Initializing...")
        try:
            subprocess.run(["git", "init"], cwd=WORKFLOW_REPO_DIR, check=True, capture_output=True)
            logger.info("Git repository initialized successfully.")
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            logger.error(f"Failed to initialize Git repository: {e}")
            return # Stop if git init fails

    # Check for user config and set a default if not present
    try:
        user_name = subprocess.run(
            ["git", "config", "user.name"],
            cwd=WORKFLOW_REPO_DIR, capture_output=True, text=True
        ).stdout.strip()
        user_email = subprocess.run(
            ["git", "config", "user.email"],
            cwd=WORKFLOW_REPO_DIR, capture_output=True, text=True
        ).stdout.strip()

        if not user_name or not user_email:
            logger.info("Git user not configured. Setting default user...")
            subprocess.run(["git", "config", "user.name", "Scheduler Bot"], cwd=WORKFLOW_REPO_DIR, check=True)
            subprocess.run(["git", "config", "user.email", "bot@example.com"], cwd=WORKFLOW_REPO_DIR, check=True)
            logger.info("Default Git user configured successfully.")
        else:
            logger.info(f"Git user already configured: {user_name} <{user_email}>")

    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        logger.error(f"Failed to check or configure Git user: {e}")


# CORS configuration
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.get("/")
async def read_root():
    return {"message": "Welcome to the Task Scheduler API"}

@app.post("/api/parse")
async def parse_yaml_file(file: UploadFile = File(...)):
    """
    Parses the uploaded YAML file, saves it to the repo, and commits it.
    """
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        parsed_data = parse_workflow(content_str)

        # Save the file to the version-controlled repository
        os.makedirs(WORKFLOW_REPO_DIR, exist_ok=True)
        file_path = os.path.join(WORKFLOW_REPO_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Initial commit for the new workflow
        git_service.git_commit(file.filename, f"Create workflow: {file.filename}")

        return {
            "filename": file.filename,
            "content": content_str,
            "preview": {
                "crontab": parsed_data.get("schedule"),
                "tasks": parsed_data.get("tasks"),
                "relations": parsed_data.get("relations"),
            }
        }
    except Exception as e:
        logger.error(f"Error in /api/parse: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {e}")

@app.post("/api/reparse")
async def reparse_yaml_code(body: dict):
    code = body.get("code", "")
    try:
        parsed_data = parse_workflow(code)
        return {
            "preview": {
                "crontab": parsed_data.get("schedule"),
                "tasks": parsed_data.get("tasks"),
                "relations": parsed_data.get("relations"),
            }
        }
    except Exception as e:
        logger.error(f"Error in /api/reparse: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to re-parse code: {e}")



@app.get("/api/workflows/deleted")
async def get_deleted_workflows_endpoint():
    """Lists workflow files that have been deleted from the repository."""
    try:
        return git_service.get_deleted_workflows()
    except Exception as e:
        logger.error(f"Error listing deleted workflows: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not list deleted workflows.")

class RestoreWorkflow(BaseModel):
    filename: str
    commit_hash: str

@app.post("/api/workflow/restore")
async def restore_workflow_endpoint(restore_data: RestoreWorkflow):
    """Restores a deleted workflow file from a specific commit."""
    try:
        return git_service.restore_workflow(restore_data.filename, restore_data.commit_hash)
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error restoring workflow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to restore workflow: {e}")



    return await ds_service.get_ds_workflow_details(project_code, workflow_code)




@app.get("/api/workflow/{workflow_name}/content")
async def get_workflow_content_endpoint(workflow_name: str):
    """Gets the raw content of a specific workflow file."""
    return file_service.get_workflow_content(workflow_name)




@app.get("/api/workflow/{workflow_uuid}/history")
async def get_workflow_history_endpoint(workflow_uuid: str):
    """
    Gets the commit history for a specific workflow file.
    """
    try:
        return git_service.get_workflow_history(workflow_uuid)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Git command not found.")
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching history for {workflow_uuid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.get("/api/workflow/{workflow_uuid}/commit/{commit_hash}")
async def get_workflow_commit_diff_endpoint(workflow_uuid: str, commit_hash: str):
    """Gets the diff for a specific commit of a workflow file."""
    try:
        return git_service.get_workflow_commit_diff(workflow_uuid, commit_hash)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Git command not found.")
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching commit diff: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")


@app.put("/api/project/{project_code}/workflow/{workflow_code}")
async def update_workflow_endpoint(project_code: int, workflow_code: int, body: dict):
    code = body.get("code")
    return await ds_service.update_ds_workflow(project_code, workflow_code, code)


@app.get("/api/dashboard/stats")
async def get_dashboard_stats_endpoint():
    return await ds_service.get_dashboard_stats()


@app.post("/api/execute")
async def execute_task(body: dict):
    filename = body.get("filename")
    code = body.get("code")
    logger.info(f"Received request to /api/execute for file: {filename}")
    
    os.makedirs(WORKFLOW_REPO_DIR, exist_ok=True)
    file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
    with open(file_path, "w", encoding='utf-8') as f:
        f.write(code)
    logger.info(f"Saved code to {file_path}")

    git_service.git_commit(filename, f"Update and execute workflow: {filename}")

    try:
        script_path_for_run = os.path.join("workflow_repo", filename)
        
        logger.info(f"Executing {script_path_for_run} asynchronously.")
        returncode, stdout, stderr = await process_service.run_script_in_subprocess_async(script_path_for_run)
        logger.info(f"Async execution finished for {script_path_for_run}. returncode: {returncode}")

        if "traceback" in stderr.lower():
            logger.warning(f"Execution failed for {filename} due to traceback in stderr.")
            logger.warning(f"STDOUT: {stdout}")
            logger.warning(f"STDERR: {stderr}")
            raise HTTPException(
                status_code=500,
                detail={
                    "message": f"Failed to execute task {filename}.",
                    "stdout": stdout,
                    "stderr": stderr
                }
            )

        logger.info(f"Execution considered successful for {filename}.")
        return {
            "message": f"Task {filename} executed successfully.",
            "stdout": stdout,
            "stderr": stderr,
            "returncode": 0
        }
    except Exception as e:
        logger.error(f"Unhandled exception in /api/execute for file {filename}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise e

from pydantic import BaseModel


class SubmitWorkflow(BaseModel):
    filename: str

@app.post("/api/workflow/submit")
async def submit_workflow_to_ds_endpoint(workflow: SubmitWorkflow):
    """
    Submits a local YAML workflow file to DolphinScheduler using the CLI.
    """
    return await ds_service.submit_workflow_to_ds(workflow.filename)
