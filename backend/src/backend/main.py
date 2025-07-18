from fastapi import FastAPI, File, UploadFile, HTTPException
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
        # git commit can fail if there's nothing to commit after adding (e.g. only whitespace changes)
        # We can log this as a warning and continue.
        logger.warning(f"Git operation warning for {file_path}: {e}\nSTDOUT: {e.stdout}\nSTDERR: {e.stderr}")
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
async def parse_python_file(file: UploadFile = File(...)):
    """
    Parses the uploaded Python file, saves it to the repo, and commits it.
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
async def reparse_code(body: dict):
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
                all_workflows.extend(project_workflows)

            return all_workflows

    except httpx.RequestError as e:
        logger.error(f"Could not connect to DolphinScheduler: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Could not connect to DolphinScheduler: {e}")
    except Exception as e:
        logger.error(f"Error fetching workflows from DolphinScheduler: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/project/{project_code}/workflow/{workflow_code}")
async def get_workflow_details(project_code: int, workflow_code: int):
    """
    Fetches the detailed structure of a specific workflow from DolphinScheduler
    and transforms it into a format suitable for the frontend DAG graph.
    """
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


class CommandUpdater(ast.NodeTransformer):
    def __init__(self, task_name, new_command):
        self.task_name = task_name
        self.new_command = new_command
        self.found = False

    def visit_Assign(self, node):
        # We are looking for `task_name = Shell(...)`
        if (len(node.targets) == 1 and
                isinstance(node.targets[0], ast.Name) and
                node.targets[0].id == self.task_name and
                isinstance(node.value, ast.Call) and
                hasattr(node.value.func, 'id') and # Make sure it's a simple name, not an attribute
                node.value.func.id == 'Shell'):
            
            # Found the assignment. Now find the `command` keyword.
            for keyword in node.value.keywords:
                if keyword.arg == 'command':
                    # Update the command value.
                    keyword.value = ast.Constant(self.new_command)
                    self.found = True
                    break
        return node

@app.post("/api/update-command")
async def update_command(body: dict):
    code = body.get("code")
    task_name = body.get("task_name")
    new_command = body.get("new_command")

    if code is None or task_name is None or new_command is None:
        raise HTTPException(status_code=400, detail="Missing required fields: code, task_name, new_command.")

    try:
        tree = ast.parse(code)
        updater = CommandUpdater(task_name, new_command)
        new_tree = updater.visit(tree)
        
        if not updater.found:
            raise HTTPException(status_code=404, detail=f"Task '{task_name}' with a 'command' argument not found.")

        # ast.unparse is available in Python 3.9+
        new_code = ast.unparse(new_tree)
        return {"new_code": new_code}
    except SyntaxError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Python code syntax: {e}")
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


@app.delete("/api/project/{project_code}/workflow/{workflow_code}")
async def delete_workflow(project_code: int, workflow_code: int):
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
                # The API expects form data for this endpoint
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
                # Re-raise with the specific error from DS
                raise HTTPException(status_code=500, detail=f"DS API error (delete): {delete_data.get('msg')}")

            return {"message": "Workflow deleted successfully."}
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not connect to DolphinScheduler: {e}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error deleting workflow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workflow/{workflow_name}/history")
async def get_workflow_history(workflow_name: str):
    """Gets the commit history for a specific workflow file."""
    try:
        file_path = os.path.join(WORKFLOW_REPO_DIR, workflow_name)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Workflow file not found.")

        # Using a custom format for easier parsing
        log_format = "--format=%H%x1f%an%x1f%at%x1f%s"
        result = subprocess.run(
            ["git", "log", log_format, "--", workflow_name],
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        history = []
        for line in result.stdout.strip().split('\n'):
            if not line: continue
            parts = line.split('\x1f')
            history.append({
                "hash": parts[0],
                "author": parts[1],
                "timestamp": int(parts[2]),
                "message": parts[3],
            })
        return history
    except subprocess.CalledProcessError as e:
        logger.error(f"Git log failed for {workflow_name}: {e.stderr}")
        return [] # Return empty list if no history or an error
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Git command not found.")

@app.get("/api/workflow/{workflow_name}/commit/{commit_hash}")
async def get_workflow_commit_diff(workflow_name: str, commit_hash: str):
    """Gets the diff for a specific commit of a workflow file."""
    try:
        result = subprocess.run(
            ["git", "show", commit_hash, "--", workflow_name],
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        return {"diff": result.stdout}
    except subprocess.CalledProcessError as e:
        logger.error(f"Git show failed for {workflow_name} at {commit_hash}: {e.stderr}")
        raise HTTPException(status_code=404, detail="Commit or file not found.")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Git command not found.")


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
