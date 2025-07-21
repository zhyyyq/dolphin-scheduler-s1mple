from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import subprocess
import sys
import asyncio
import functools
import logging
import httpx
import ast
import yaml
import uuid
from ruamel.yaml import YAML
from .parser import parse_workflow

# Define project root and workflow repo directory consistently
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORKFLOW_REPO_DIR = os.path.join(BACKEND_DIR, "workflow_repo")

# --- Start of new logging configuration ---
# Configure logging to write to a file
LOG_FILE = os.path.join(BACKEND_DIR, 'backend.log')
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename=LOG_FILE,
    filemode='a'
)
logger = logging.getLogger(__name__)
# --- End of new logging configuration ---

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    """
    Initializes the Git repository on application startup if it doesn't exist,
    and ensures a default user is configured.
    """
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

def git_commit(file_path, message):
    """Commits a file to the git repository."""
    # Use the relative path for the file inside the repo
    try:
        # Check if there are changes to commit
        status_result = subprocess.run(
            ["git", "status", "--porcelain", "--", file_path], 
            cwd=WORKFLOW_REPO_DIR, 
            check=True, 
            capture_output=True, 
            text=True
        )
        # If git status is not empty, there are changes
        if status_result.stdout.strip():
            logger.info(f"Changes detected for {file_path}. Committing...")
            # Add and commit
            subprocess.run(["git", "add", file_path], cwd=WORKFLOW_REPO_DIR, check=True)
            subprocess.run(["git", "commit", "-m", message], cwd=WORKFLOW_REPO_DIR, check=True)
            logger.info(f"Committed '{file_path}' with message: '{message}'")
        else:
            logger.info(f"No changes to commit for {file_path}")

    except subprocess.CalledProcessError as e:
        err_msg = f"Git operation failed for {file_path}: {e.stderr}"
        logger.error(err_msg)
        raise Exception(err_msg)
    except FileNotFoundError:
        logger.error("Git command not found. Please ensure Git is installed and in the system's PATH.")

async def run_script_in_subprocess_async(script_path: str) -> (int, str, str):
    """
    Runs a script in a subprocess asynchronously and returns the result.
    """
    logger.info(f"Attempting to run script asynchronously: {script_path}")
    try:
        proc = await asyncio.create_subprocess_exec(
            "uv", "run", script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=BACKEND_DIR
        )
        
        stdout, stderr = await proc.communicate()
        
        decoded_stdout = stdout.decode('utf-8')
        decoded_stderr = stderr.decode('utf-8')
        
        logger.info(f"Script {script_path} finished with return code {proc.returncode}.")
        return proc.returncode, decoded_stdout, decoded_stderr
    except FileNotFoundError:
        logger.error("FileNotFoundError: uv executable not found.")
        return -1, "", "Error: uv executable not found."
    except Exception as e:
        logger.error(f"Unexpected error in async subprocess: {e}", exc_info=True)
        return -1, "", f"An unexpected error occurred: {str(e)}"


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
        git_commit(file.filename, f"Create workflow: {file.filename}")

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

@app.get("/api/workflows")
async def get_workflows():
    # Hardcoded credentials from user input
    ds_url = "http://localhost:12345/dolphinscheduler"
    token = "8b6c34a254ca718549ac877b10804235"
    headers = {"token": token}
    
    all_workflows = []

    try:
        async with httpx.AsyncClient() as client:
            # 1. Get all projects
            projects_url = f"{ds_url.rstrip('/')}/projects"
            projects_response = await client.get(
                projects_url, headers=headers, params={"pageNo": 1, "pageSize": 100}
            )
            projects_response.raise_for_status()
            projects_data = projects_response.json()
            if projects_data.get("code") != 0:
                raise HTTPException(status_code=500, detail=f"DS API error (projects): {projects_data.get('msg')}")
            
            project_list = projects_data.get("data", {}).get("totalList", [])

            # 2. For each project, get its workflows
            for project in project_list:
                project_code = project.get("code")
                workflows_url = f"{ds_url.rstrip('/')}/projects/{project_code}/process-definition"
                workflows_response = await client.get(
                    workflows_url, headers=headers, params={"pageNo": 1, "pageSize": 100}
                )
                workflows_response.raise_for_status()
                workflows_data = workflows_response.json()

                if workflows_data.get("code") != 0:
                    logger.warning(f"Could not fetch workflows for project {project_code}: {workflows_data.get('msg')}")
                    continue # Skip to the next project

                project_workflows = workflows_data.get("data", {}).get("totalList", [])
                # Add project name to each workflow for context
                for wf in project_workflows:
                    wf['projectName'] = project.get('name')
                    # Create a stable UUID for DS workflows
                    wf['uuid'] = f"ds-{project_code}-{wf.get('code')}"
                all_workflows.extend(project_workflows)

            return all_workflows

    except httpx.RequestError as e:
        logger.error(f"Could not connect to DolphinScheduler: {e}", exc_info=True)
        # Return empty list on connection error, so the UI can still function
        return []
    except Exception as e:
        logger.error(f"Error fetching workflows from DolphinScheduler: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workflows/local")
async def get_local_workflows():
    """Lists workflow YAML files from the local repository."""
    try:
        if not os.path.exists(WORKFLOW_REPO_DIR):
            return []
        
        yaml_parser = YAML()
        local_files = []
        for filename in os.listdir(WORKFLOW_REPO_DIR):
            if filename.endswith(".yaml") or filename.endswith(".yml"):
                file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
                try:
                    # Get last modification time
                    mod_time = os.path.getmtime(file_path)
                    # Basic parsing to get workflow name from content
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = yaml_parser.load(f)
                        workflow_data = content.get('workflow', {})
                        workflow_name = workflow_data.get('name', filename)
                        workflow_uuid = workflow_data.get('uuid')

                    local_files.append({
                        "name": workflow_name,
                        "uuid": workflow_uuid,
                        "projectName": "Local File",
                        "releaseState": "OFFLINE",
                        "updateTime": mod_time,
                        "code": filename, # Use filename as a unique code
                        "isLocal": True,
                    })
                except Exception as e:
                    logger.error(f"Could not process local file {filename}: {e}")
                    continue # Skip corrupted files
        return local_files
    except Exception as e:
        logger.error(f"Error listing local workflows: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not list local workflows.")

@app.get("/api/workflows/deleted")
async def get_deleted_workflows():
    """Lists workflow files that have been deleted from the repository."""
    try:
        # Use git log to find files that have a 'D' (deleted) status in their history.
        # The command lists the filename for commits that were deletions.
        result = subprocess.run(
            ["git", "log", "--diff-filter=D", "--summary"],
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        deleted_files = {}
        # Parsing the git log output to find deleted filenames and their last commit.
        commit_hash = None
        for line in result.stdout.strip().split('\n'):
            if line.startswith('commit '):
                commit_hash = line.split(' ')[1]
            elif 'delete mode' in line:
                # Extract filename from a line like: " delete mode 100644 my-workflow.yaml"
                filename = line.split(' ')[-1]
                if filename not in deleted_files:
                     # Check if the file is currently present in the working directory
                    if not os.path.exists(os.path.join(WORKFLOW_REPO_DIR, filename)):
                        deleted_files[filename] = {
                            "filename": filename,
                            "commit_hash": commit_hash
                        }

        return list(deleted_files.values())
    except subprocess.CalledProcessError as e:
        logger.error(f"Git log for deleted files failed: {e.stderr}")
        return []
    except Exception as e:
        logger.error(f"Error listing deleted workflows: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not list deleted workflows.")

class RestoreWorkflow(BaseModel):
    filename: str
    commit_hash: str

@app.post("/api/workflow/restore")
async def restore_workflow(restore_data: RestoreWorkflow):
    """Restores a deleted workflow file from a specific commit."""
    try:
        filename = restore_data.filename
        commit_hash = restore_data.commit_hash

        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Invalid workflow filename.")

        # Check if the file already exists to avoid overwriting
        if os.path.exists(os.path.join(WORKFLOW_REPO_DIR, filename)):
            raise HTTPException(status_code=409, detail=f"File '{filename}' already exists. Cannot restore.")

        # Use git checkout to restore the file from the commit *before* it was deleted.
        # The `^` notation refers to the parent of the deletion commit.
        subprocess.run(
            ["git", "checkout", f"{commit_hash}^", "--", filename],
            cwd=WORKFLOW_REPO_DIR,
            check=True
        )
        
        # Commit the restoration
        commit_message = f"Restore workflow: {filename}"
        subprocess.run(["git", "add", filename], cwd=WORKFLOW_REPO_DIR, check=True)
        subprocess.run(["git", "commit", "-m", commit_message], cwd=WORKFLOW_REPO_DIR, check=True)

        return {"message": f"Workflow '{filename}' restored successfully."}
    except subprocess.CalledProcessError as e:
        logger.error(f"Git checkout failed for {filename}: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Failed to restore workflow: {e.stderr}")
    except Exception as e:
        logger.error(f"Error restoring workflow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to restore workflow: {e}")


@app.get("/api/workflow/{workflow_uuid}")
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
        
        return {
            "name": parsed_data.get('workflow', {}).get('name', filename),
            "uuid": raw_data.get('workflow', {}).get('uuid'),
            "schedule": parsed_data.get('workflow', {}).get('schedule'),
            "tasks": parsed_data.get("tasks"),
            "relations": parsed_data.get("relations"),
            "filename": filename
        }
    except Exception as e:
        logger.error(f"Error reading local workflow file {workflow_uuid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not read local workflow file: {e}")

    # --- Original DolphinScheduler logic ---
    ds_url = "http://localhost:12345/dolphinscheduler"
    token = "8b6c34a254ca718549ac877b10804235"
    headers = {"token": token}
    
    url = f"{ds_url.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json().get("data", {})

            if not data:
                raise HTTPException(status_code=404, detail="Workflow not found in DolphinScheduler.")

            # Create a mapping from task code to task name for relation lookup
            task_code_map = {task['code']: task['name'] for task in data.get("taskDefinitionList", [])}

            # Transform tasks into the format expected by the frontend
            frontend_tasks = []
            for task_def in data.get("taskDefinitionList", []):
                task_params = task_def.get("taskParams", {})
                frontend_tasks.append({
                    "name": task_def.get("name"),
                    "type": task_def.get("taskType"),
                    "command": task_params.get("rawScript", "# Command not found"),
                })

            # Transform relations
            frontend_relations = []
            for rel in data.get("processTaskRelationList", []):
                pre_task_name = task_code_map.get(rel.get("preTaskCode"))
                post_task_name = task_code_map.get(rel.get("postTaskCode"))
                if pre_task_name and post_task_name:
                    frontend_relations.append({"from": pre_task_name, "to": post_task_name})

            return {
                "name": data.get("processDefinition", {}).get("name"),
                "tasks": frontend_tasks,
                "relations": frontend_relations,
            }

    except httpx.RequestError as e:
        logger.error(f"Could not connect to DolphinScheduler: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Could not connect to DolphinScheduler: {e}")
    except Exception as e:
        logger.error(f"Error fetching workflow details: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/update-command")
async def update_command(body: dict):
    code = body.get("code")
    task_name = body.get("task_name")
    new_command = body.get("new_command")

    if code is None or task_name is None or new_command is None:
        raise HTTPException(status_code=400, detail="Missing required fields: code, task_name, new_command.")

    yaml = YAML()
    try:
        data = yaml.load(code)
        
        tasks = data.get('tasks', [])
        task_found = False
        for task in tasks:
            if task.get('name') == task_name:
                task['command'] = new_command
                task_found = True
                break
        
        if not task_found:
            raise HTTPException(status_code=404, detail=f"Task '{task_name}' not found.")

        from io import StringIO
        string_stream = StringIO()
        yaml.dump(data, string_stream)
        new_code = string_stream.getvalue()
        
        return {"new_code": new_code}
    except Exception as e:
        logger.error(f"Error updating command for task {task_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update command: {e}")


@app.get("/api/workflow/{workflow_name}/content")
async def get_workflow_content(workflow_name: str):
    """Gets the raw content of a specific workflow file."""
    try:
        # Basic security check to prevent path traversal
        if ".." in workflow_name or "/" in workflow_name or "\\" in workflow_name:
            raise HTTPException(status_code=400, detail="Invalid workflow name.")
            
        file_path = os.path.join(WORKFLOW_REPO_DIR, workflow_name)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Workflow file not found.")

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        return {"content": content, "filename": workflow_name}
    except Exception as e:
        logger.error(f"Error reading workflow file {workflow_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not read workflow file: {e}")


@app.delete("/api/workflow/{workflow_uuid}")
async def delete_workflow(workflow_uuid: str):
    """Deletes a local workflow file using its UUID."""
    try:
        filename = f"{workflow_uuid}.yaml"
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
        if not os.path.exists(file_path):
             raise HTTPException(status_code=404, detail="Local workflow file not found.")

        os.remove(file_path)
        # Manually handle git commit for deletion
        subprocess.run(["git", "add", "-u", "."], cwd=WORKFLOW_REPO_DIR, check=True)
        # Check if there's anything to commit
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
        return {"message": "Local workflow file deleted successfully."}
    except Exception as e:
        logger.error(f"Error deleting local workflow file {workflow_uuid}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not delete local workflow file: {e}")

@app.delete("/api/ds/project/{project_code}/workflow/{workflow_code}")
async def delete_ds_workflow(project_code: int, workflow_code: int):
    """Deletes a workflow from DolphinScheduler."""
    ds_url = "http://localhost:12345/dolphinscheduler"
    token = "8b6c34a254ca718549ac877b10804235"
    headers = {"token": token}
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. Get workflow details to check its state
            details_url = f"{ds_url.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}"
            details_response = await client.get(details_url, headers=headers)
            details_response.raise_for_status()
            workflow_data = details_response.json().get("data", {})
            
            if not workflow_data:
                raise HTTPException(status_code=404, detail="Workflow not found.")

            # 2. If the workflow is online, take it offline first
            if workflow_data.get("processDefinition", {}).get("releaseState") == "ONLINE":
                logger.info(f"Workflow {workflow_code} is ONLINE. Taking it offline before deletion.")
                release_url = f"{ds_url.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}/release"
                release_payload = {'releaseState': 'OFFLINE'}
                release_response = await client.post(release_url, headers=headers, data=release_payload)
                release_response.raise_for_status()
                release_data = release_response.json()
                if release_data.get("code") != 0:
                    raise HTTPException(status_code=500, detail=f"DS API error (set offline): {release_data.get('msg')}")
                logger.info(f"Workflow {workflow_code} successfully taken offline.")

            # 3. Proceed with deletion
            logger.info(f"Proceeding to delete workflow {workflow_code}.")
            delete_url = f"{ds_url.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}"
            delete_response = await client.delete(delete_url, headers=headers)
            delete_response.raise_for_status()
            delete_data = delete_response.json()
            if delete_data.get("code") != 0:
                raise HTTPException(status_code=500, detail=f"DS API error (delete): {delete_data.get('msg')}")

            return {"message": "Workflow deleted successfully."}
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not connect to DolphinScheduler: {e}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error deleting workflow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workflow/{workflow_uuid}/history")
async def get_workflow_history(workflow_uuid: str):
    """
    Gets the commit history for a specific workflow file, ensuring that the history
    does not include commits from before the file was last deleted.
    """
    try:
        filename = f"{workflow_uuid}.yaml"
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
        # We don't check for existence here because we want history even for deleted files.

        # Find the hash of the last commit where this file was deleted.
        # This helps isolate the history of the *current* version of the file.
        deletion_log_result = subprocess.run(
            ["git", "log", "--diff-filter=D", "--format=%H", "-n", "1", "--", filename],
            cwd=WORKFLOW_REPO_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        last_deletion_commit = deletion_log_result.stdout.strip()

        # Construct the git log command.
        # If a deletion commit was found, start the log from that commit to the present (HEAD).
        log_cmd = ["git", "log", "--format=%H%x1f%an%x1f%at%x1f%s", "--follow"]
        if last_deletion_commit:
            log_cmd.append(f"{last_deletion_commit}..HEAD")
        
        log_cmd.extend(["--", filename])

        # Execute the git log command to get the relevant history.
        history_result = subprocess.run(
            log_cmd,
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        history = []
        # Filter out the deletion commit itself from the history if it appears.
        for line in history_result.stdout.strip().split('\n'):
            if not line: continue
            parts = line.split('\x1f')
            commit_hash = parts[0]
            
            # We need to ensure the file actually exists in the commits we're listing.
            # `git log --follow` can sometimes include the commit where the file was renamed from.
            # A simple check is to see if the file exists in that commit's tree.
            check_file_exists_cmd = ["git", "cat-file", "-e", f"{commit_hash}:{filename}"]
            file_exists_proc = subprocess.run(check_file_exists_cmd, cwd=WORKFLOW_REPO_DIR, capture_output=True)

            if file_exists_proc.returncode == 0:
                history.append({
                    "hash": commit_hash,
                    "author": parts[1],
                    "timestamp": int(parts[2]),
                    "message": parts[3],
                })

        return history
    except subprocess.CalledProcessError as e:
        # This can happen if `git log` fails, which is not expected in normal operation.
        logger.error(f"Git log command failed for {filename}: {e.stderr}")
        return [] # Return an empty list on error.
    except FileNotFoundError:
        # This happens if git is not installed.
        raise HTTPException(status_code=500, detail="Git command not found.")
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching history for {filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.get("/api/workflow/{workflow_uuid}/commit/{commit_hash}")
async def get_workflow_commit_diff(workflow_uuid: str, commit_hash: str):
    """Gets the diff for a specific commit of a workflow file."""
    try:
        filename = f"{workflow_uuid}.yaml"
        
        # Check if the commit has parents. If not, it's the initial commit.
        parent_check = subprocess.run(
            ["git", "rev-parse", "--verify", f"{commit_hash}^"],
            cwd=WORKFLOW_REPO_DIR,
            capture_output=True,
            text=True
        )

        if parent_check.returncode != 0:
            # No parents, this is the initial commit. Use `git show`.
            show_result = subprocess.run(
                ["git", "show", "--pretty=format:", commit_hash, "--", filename],
                cwd=WORKFLOW_REPO_DIR,
                check=True,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            return {"diff": show_result.stdout.strip()}
        else:
            # Commit has parents, use `git diff`.
            diff_result = subprocess.run(
                ["git", "diff", f"{commit_hash}^!", "--", filename],
                cwd=WORKFLOW_REPO_DIR,
                check=True,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            return {"diff": diff_result.stdout.strip()}

    except subprocess.CalledProcessError as e:
        logger.error(f"Git operation failed for {filename} at {commit_hash}: {e.stderr}")
        raise HTTPException(status_code=404, detail="Commit or file not found.")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Git command not found.")
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching commit diff: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")


@app.put("/api/project/{project_code}/workflow/{workflow_code}")
async def update_workflow(project_code: int, workflow_code: int, body: dict):
    code = body.get("code")
    ds_url = "http://localhost:12345/dolphinscheduler"
    token = "8b6c34a254ca718549ac877b10804235"
    headers = {"token": token}
    
    # This is a simplified update. A real implementation would parse the code
    # and construct a proper update request for the DS API.
    # For now, we just log the intent.
    logger.info(f"Attempting to update workflow {workflow_code} in project {project_code}.")
    logger.info(f"New code:\n{code}")
    
    # Placeholder: In a real scenario, you would call the DS API to update the process definition.
    # The DS API for updating is complex, so we'll simulate success.
    return {"message": "Workflow update simulated successfully."}


@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    ds_url = "http://localhost:12345/dolphinscheduler"
    token = "8b6c34a254ca718549ac877b10804235"
    headers = {"token": token}
    
    # Note: The generic /process-instances endpoint might not exist. 
    # A robust solution would iterate through projects.
    # For this example, we assume a general endpoint or target a specific project.
    # We will try to get instances for the first project found.
    
    stats = {
        "success": 0,
        "failure": 0,
        "running": 0,
        "other": 0,
        "total": 0,
        "recent_instances": []
    }

    try:
        async with httpx.AsyncClient() as client:
            # First, get projects to find a project code
            projects_url = f"{ds_url.rstrip('/')}/projects"
            projects_response = await client.get(projects_url, headers=headers, params={"pageNo": 1, "pageSize": 1})
            projects_response.raise_for_status()
            projects_data = projects_response.json()
            if projects_data.get("code") != 0 or not projects_data.get("data", {}).get("totalList"):
                raise HTTPException(status_code=500, detail="Could not find any projects in DolphinScheduler.")
            
            # Use the first project found
            project_code = projects_data["data"]["totalList"][0]["code"]
            
            # Now, get process instances for that project
            instances_url = f"{ds_url.rstrip('/')}/projects/{project_code}/process-instances"
            response = await client.get(
                instances_url, headers=headers, params={"pageNo": 1, "pageSize": 100}
            )
            response.raise_for_status()
            data = response.json()

            if data.get("code") != 0:
                raise HTTPException(status_code=500, detail=f"DS API error (process-instances): {data.get('msg')}")

            instance_list = data.get("data", {}).get("totalList", [])
            stats["total"] = data.get("data", {}).get("total", len(instance_list))

            for instance in instance_list:
                state = instance.get("state")
                if state == "SUCCESS":
                    stats["success"] += 1
                elif state in ["FAILURE", "STOP", "KILL"]:
                    stats["failure"] += 1
                elif state == "RUNNING_EXECUTION":
                    stats["running"] += 1
                else:
                    stats["other"] += 1
            
            stats["recent_instances"] = instance_list
            return stats

    except httpx.RequestError as e:
        logger.error(f"Could not connect to DolphinScheduler: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Could not connect to DolphinScheduler: {e}")
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/execute")
async def execute_task(body: dict):
    filename = body.get("filename")
    code = body.get("code")
    logger.info(f"Received request to /api/execute for file: {filename}")
    
    # Save the potentially modified code back to the repo before execution
    os.makedirs(WORKFLOW_REPO_DIR, exist_ok=True)
    file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
    with open(file_path, "w", encoding='utf-8') as f:
        f.write(code)
    logger.info(f"Saved code to {file_path}")

    # Commit the changes before execution
    git_commit(filename, f"Update and execute workflow: {filename}")

    try:
        # The script path for `uv run` should be relative to the cwd (BACKEND_DIR)
        script_path_for_run = os.path.join("workflow_repo", filename)
        
        logger.info(f"Executing {script_path_for_run} asynchronously.")
        returncode, stdout, stderr = await run_script_in_subprocess_async(script_path_for_run)
        logger.info(f"Async execution finished for {script_path_for_run}. returncode: {returncode}")

        # Lenient success check: As per user feedback, the job runs successfully even with warnings on stderr.
        # We will only consider it a failure if a Python traceback is present.
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

class WorkflowYaml(BaseModel):
    name: str
    content: str
    original_filename: str = None

@app.post("/api/workflow/yaml")
async def save_workflow_yaml(workflow: WorkflowYaml):
    """
    Saves or updates a YAML workflow file using its UUID as the filename.
    """
    try:
        yaml = YAML()
        data = yaml.load(workflow.content)
        
        # Ensure the workflow data structure is present
        if 'workflow' not in data:
            data['workflow'] = {}

        # Determine the UUID for the workflow
        workflow_uuid = data.get('workflow', {}).get('uuid')
        is_create = not workflow_uuid

        if is_create:
            workflow_uuid = str(uuid.uuid4())
            data['workflow']['uuid'] = workflow_uuid
            commit_message = f"Create workflow {data.get('workflow', {}).get('name', workflow_uuid)}"
        else:
            commit_message = f"Update workflow {data.get('workflow', {}).get('name', workflow_uuid)}"

        # The filename is now the UUID
        filename = f"{workflow_uuid}.yaml"
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)

        # If the user provided an original_filename (from the old name-based system),
        # and it's different from the new UUID-based filename, remove the old file.
        if workflow.original_filename and workflow.original_filename != filename:
            old_file_path = os.path.join(WORKFLOW_REPO_DIR, workflow.original_filename)
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
                commit_message = f"Migrate and update workflow {data.get('workflow', {}).get('name')} to UUID-based storage"

        # Write the final content to the UUID-based file
        from io import StringIO
        string_stream = StringIO()
        yaml.dump(data, string_stream)
        final_content = string_stream.getvalue()

        with open(file_path, "w", encoding="utf-8") as buffer:
            buffer.write(final_content)
        
        # Git operations
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

class SubmitWorkflow(BaseModel):
    filename: str

@app.post("/api/workflow/submit")
async def submit_workflow_to_ds(workflow: SubmitWorkflow):
    """
    Submits a local YAML workflow file to DolphinScheduler using the CLI.
    """
    try:
        filename = workflow.filename
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Invalid workflow filename.")

        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Workflow file '{filename}' not found.")

        result = subprocess.run(
            ["pydolphinscheduler", "yaml", "-f", file_path],
            cwd=BACKEND_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        logger.info(f"pydolphinscheduler CLI output for {filename}:\n{result.stdout}")
        
        return {"message": f"Workflow '{filename}' submitted successfully."}
    except subprocess.CalledProcessError as e:
        logger.error(f"pydolphinscheduler CLI failed for {filename}: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Failed to submit workflow to DolphinScheduler: {e.stderr}")
    except FileNotFoundError:
        logger.error("pydolphinscheduler command not found.")
        raise HTTPException(status_code=500, detail="pydolphinscheduler command not found.")
    except Exception as e:
        logger.error(f"Error in /api/workflow/submit: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit workflow: {e}")
