import httpx
from fastapi import HTTPException
import os
import re
import subprocess
import tempfile
from ruamel.yaml import YAML
from dotenv import load_dotenv
from ..core.logger import logger
from . import git_service
from ..core.path_utils import find_resource_file

load_dotenv()

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DS_URL = os.getenv("DS_URL")
TOKEN = os.getenv("TOKEN")
HEADERS = {"token": TOKEN}

async def get_ds_workflow_details(project_code: int, workflow_code: int):
    """Gets the details of a DolphinScheduler workflow."""
    url = f"{DS_URL.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()
            data = response.json().get("data", {})

            if not data:
                raise HTTPException(status_code=404, detail="Workflow not found in DolphinScheduler.")

            task_code_map = {task['code']: task['name'] for task in data.get("taskDefinitionList", [])}

            frontend_tasks = []
            for task_def in data.get("taskDefinitionList", []):
                task_params = task_def.get("taskParams", {})
                frontend_tasks.append({
                    "name": task_def.get("name"),
                    "type": task_def.get("taskType"),
                    "command": task_params.get("rawScript", "# Command not found"),
                })

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

async def update_ds_workflow(project_code: int, workflow_code: int, code: str):
    """Updates a DolphinScheduler workflow."""
    logger.info(f"Attempting to update workflow {workflow_code} in project {project_code}.")
    logger.info(f"New code:\n{code}")
    
    return {"message": "Workflow update simulated successfully."}

async def get_dashboard_stats():
    """Gets the dashboard stats from DolphinScheduler."""
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
            projects_url = f"{DS_URL.rstrip('/')}/projects"
            projects_response = await client.get(projects_url, headers=HEADERS, params={"pageNo": 1, "pageSize": 1})
            projects_response.raise_for_status()
            projects_data = projects_response.json()
            if projects_data.get("code") != 0 or not projects_data.get("data", {}).get("totalList"):
                raise HTTPException(status_code=500, detail="Could not find any projects in DolphinScheduler.")
            
            project_code = projects_data["data"]["totalList"][0]["code"]
            
            instances_url = f"{DS_URL.rstrip('/')}/projects/{project_code}/process-instances"
            response = await client.get(
                instances_url, headers=HEADERS, params={"pageNo": 1, "pageSize": 100}
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

async def submit_workflow_to_ds(filename: str):
    """Submits a local YAML workflow file to DolphinScheduler, resolving sub-workflow paths."""
    try:
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Invalid workflow filename.")

        WORKFLOW_REPO_DIR = os.getenv("WORKFLOW_REPO_DIR")
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Workflow file '{filename}' not found.")

        tmp_path = None
        try:
            yaml = YAML(typ='rt')
            with open(file_path, 'r', encoding='utf-8') as f:
                data = yaml.load(f)

            # Iterate through tasks and resolve file references in specific fields
            if 'tasks' in data and isinstance(data['tasks'], list):
                for task in data['tasks']:
                    # This is a simple implementation. A more robust solution
                    # would be to have a mapping of task types to their
                    # file-reference-able fields.
                    fields_to_check = ['sql', 'rawScript'] # Add other fields as needed
                    for field in fields_to_check:
                        if field in task and isinstance(task[field], str):
                            match = re.match(r'^\$FILE\{"([^"}]+)"\}$', task[field])
                            if match:
                                file_ref = match.group(1)
                                found_path = find_resource_file(file_ref)
                                if found_path:
                                    with open(found_path, 'r', encoding='utf-8') as f_content:
                                        task[field] = f_content.read()
                                else:
                                    raise FileNotFoundError(f"File reference '{file_ref}' in task '{task.get('name')}' could not be resolved.")
            
            # Handle sub-workflow paths
            # This part remains complex due to the need to find workflows by name.
            # For now, we will assume a simple replacement.
            # A better implementation would parse the sub-workflow to get its code.

            if 'workflow' in data and 'schedule' not in data['workflow']:
                data['workflow']['schedule'] = None

            with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix=".yaml", encoding='utf-8') as tmp:
                yaml.dump(data, tmp)
                tmp_path = tmp.name
            
            result = subprocess.run(
                ["uv", "run", "pydolphinscheduler", "yaml", "-f", tmp_path],
                cwd=BACKEND_DIR,
                check=True,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            logger.info(f"pydolphinscheduler CLI output for {filename}:\n{result.stdout}")

        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)

        # Step 2: Now that DS is updated, update the original file with the online version marker.
        try:
            # First, get the commit hash of the version we just pushed
            online_commit_hash = git_service.get_latest_commit_for_file(filename)

            if not online_commit_hash:
                raise Exception("Could not retrieve the latest commit hash for the online version.")

            # Read the file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove any old version marker
            content = re.sub(r'# online-version: .*\n', '', content)
            
            # Prepend the new version marker
            version_comment = f"# online-version: {online_commit_hash}\n"
            new_content = version_comment + content

            # Also update the local_status in the YAML structure itself
            yaml = YAML(typ='rt')
            data = yaml.load(new_content)
            data['workflow']['local_status'] = 'synced'
            
            from io import StringIO
            string_stream = StringIO()
            yaml.dump(data, string_stream)
            final_content = string_stream.getvalue()

            # Write the final content back to the file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(final_content)
            
            # Commit this change
            commit_message = f"Update online-version marker for {filename} to {online_commit_hash[:7]}"
            git_service.git_commit(file_path, commit_message)
            logger.info(f"Successfully updated online-version marker for {filename}")

        except Exception as e:
            logger.error(f"Failed to update and commit 'online-version' marker for {filename}: {e}", exc_info=True)
            # This is a non-critical error in the context of the submission itself,
            # but we should probably let the user know something went wrong with the tracking.
            raise HTTPException(status_code=500, detail=f"Failed to update version marker: {e}")

        return {"message": f"Workflow '{filename}' submitted successfully."}
    except subprocess.CalledProcessError as e:
        logger.error(f"pydolphinscheduler CLI failed for {filename}: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Failed to submit workflow to DolphinScheduler: {e.stderr}")
    except FileNotFoundError as e:
        logger.error(f"Sub-workflow file not found: {e}")
        logger.error("pydolphinscheduler command not found.")
        raise HTTPException(status_code=500, detail="pydolphinscheduler command not found.")
    except Exception as e:
        logger.error(f"Error in /api/workflow/submit: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to submit workflow: {e}")

async def delete_ds_workflow(project_code: int, workflow_code: int):
    """Deletes a workflow from DolphinScheduler, taking it offline first if needed."""
    try:
        async with httpx.AsyncClient() as client:
            # 1. Get workflow details to check its state
            details_url = f"{DS_URL.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}"
            details_response = await client.get(details_url, headers=HEADERS)

            if details_response.status_code == 404:
                logger.warning(f"Workflow {workflow_code} not found in DS. Assuming already deleted.")
                return {"message": "Workflow not found, assumed already deleted."}
            
            details_response.raise_for_status()
            workflow_data = details_response.json().get("data", {})
            
            if not workflow_data:
                raise HTTPException(status_code=404, detail="Workflow not found in DolphinScheduler.")

            # 2. If the workflow is online, take it offline first
            if workflow_data.get("processDefinition", {}).get("releaseState") == "ONLINE":
                logger.info(f"Workflow {workflow_code} is ONLINE. Taking it offline before deletion.")
                release_url = f"{DS_URL.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}/release"
                release_payload = {'releaseState': 'OFFLINE'}
                release_response = await client.post(release_url, headers=HEADERS, params=release_payload)
                release_response.raise_for_status()
                release_data = release_response.json()
                if release_data.get("code") != 0:
                    raise HTTPException(status_code=500, detail=f"DS API error (set offline): {release_data.get('msg')}")
                logger.info(f"Workflow {workflow_code} successfully taken offline.")

            # 3. Proceed with deletion
            logger.info(f"Proceeding to delete workflow {workflow_code}.")
            delete_url = f"{DS_URL.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}"
            delete_response = await client.delete(delete_url, headers=HEADERS)
            delete_response.raise_for_status()
            delete_data = delete_response.json()
            if delete_data.get("code") != 0:
                raise HTTPException(status_code=500, detail=f"DS API error (delete): {delete_data.get('msg')}")

            return {"message": "Workflow deleted successfully from DolphinScheduler."}
            
    except httpx.RequestError as e:
        logger.error(f"Could not connect to DolphinScheduler: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Could not connect to DolphinScheduler: {e}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error deleting workflow from DS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
