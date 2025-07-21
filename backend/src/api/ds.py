from fastapi import APIRouter, HTTPException
import httpx
import os
from dotenv import load_dotenv
from ..core.logger import logger

load_dotenv()

router = APIRouter()

DS_URL = os.getenv("DS_URL")
TOKEN = os.getenv("TOKEN")
HEADERS = {"token": TOKEN}

@router.get("/api/workflows")
async def get_workflows():
    all_workflows = []
    try:
        async with httpx.AsyncClient() as client:
            # 1. Get all projects
            projects_url = f"{DS_URL.rstrip('/')}/projects"
            projects_response = await client.get(
                projects_url, headers=HEADERS, params={"pageNo": 1, "pageSize": 100}
            )
            projects_response.raise_for_status()
            projects_data = projects_response.json()
            if projects_data.get("code") != 0:
                raise HTTPException(status_code=500, detail=f"DS API error (projects): {projects_data.get('msg')}")
            
            project_list = projects_data.get("data", {}).get("totalList", [])

            # 2. For each project, get its workflows
            for project in project_list:
                project_code = project.get("code")
                workflows_url = f"{DS_URL.rstrip('/')}/projects/{project_code}/process-definition"
                workflows_response = await client.get(
                    workflows_url, headers=HEADERS, params={"pageNo": 1, "pageSize": 100}
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
        return []
    except Exception as e:
        logger.error(f"Error fetching workflows from DolphinScheduler: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/ds/project/{project_code}/workflow/{workflow_code}")
async def delete_ds_workflow(project_code: int, workflow_code: int):
    """Deletes a workflow from DolphinScheduler."""
    try:
        async with httpx.AsyncClient() as client:
            # 1. Get workflow details to check its state
            details_url = f"{DS_URL.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}"
            details_response = await client.get(details_url, headers=HEADERS)
            details_response.raise_for_status()
            workflow_data = details_response.json().get("data", {})
            
            if not workflow_data:
                raise HTTPException(status_code=404, detail="Workflow not found.")

            # 2. If the workflow is online, take it offline first
            if workflow_data.get("processDefinition", {}).get("releaseState") == "ONLINE":
                logger.info(f"Workflow {workflow_code} is ONLINE. Taking it offline before deletion.")
                release_url = f"{DS_URL.rstrip('/')}/projects/{project_code}/process-definition/{workflow_code}/release"
                release_payload = {'releaseState': 'OFFLINE'}
                release_response = await client.post(release_url, headers=HEADERS, data=release_payload)
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

            return {"message": "Workflow deleted successfully."}
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not connect to DolphinScheduler: {e}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error deleting workflow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException, Body

@router.post("/api/ds/execute/{project_code}/{process_definition_code}")
async def execute_ds_workflow(project_code: int, process_definition_code: int, scheduleTime: str = Body(..., embed=True)):
    """Executes a DolphinScheduler workflow."""
    url = f"{DS_URL.rstrip('/')}/projects/{project_code}/executors/start-process-instance"
    payload = {
        "processDefinitionCode": process_definition_code,
        "scheduleTime": scheduleTime,
        "failureStrategy": "CONTINUE",
        "warningType": "NONE",
        "warningGroupId": 0,
        "execType": "START_PROCESS",
        "environmentCode": -1,
        "workerGroup": "default"
    }

    try:
        async with httpx.AsyncClient() as client:
            logger.info(f"Executing DS workflow. URL: {url}, Payload: {payload}")
            response = await client.post(url, headers=HEADERS, data=payload)
            logger.info(f"DS API response status: {response.status_code}")
            logger.info(f"DS API response body: {response.text}")
            response.raise_for_status()
            data = response.json()
            if data.get("code") != 0:
                logger.error(f"DS API error (execute): {data.get('msg')}")
                raise HTTPException(status_code=500, detail=f"DS API error (execute): {data.get('msg')}")
            return {"message": "Workflow execution started successfully.", "data": data.get("data")}
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not connect to DolphinScheduler: {e}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error executing workflow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
