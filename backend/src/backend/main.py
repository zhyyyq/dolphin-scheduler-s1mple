from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import subprocess
import sys
import asyncio
import functools
import logging
from .parser import parse_workflow

# Define project root and uploads directory consistently
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")

# --- Start of new logging configuration ---
# Configure logging to write to a file
LOG_FILE = os.path.join(BACKEND_DIR, 'backend.log')
logging.basicConfig(
    level=logging.INFO,
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

def run_script_in_subprocess(script_path: str) -> (int, str, str):
    """
    Runs a script in a subprocess and returns the result.
    This is a blocking, synchronous function.
    """
    logger.info(f"Attempting to run script: {script_path}")
    python_executable = sys.executable
    try:
        result = subprocess.run(
            [python_executable, "-m", "uv", "run", script_path],
            capture_output=True,
            text=True,
            check=False,  # We'll check the returncode manually
            encoding='utf-8',
            cwd=BACKEND_DIR
        )
        logger.info(f"Script {script_path} finished with return code {result.returncode}.")
        return result.returncode, result.stdout, result.stderr
    except FileNotFoundError:
        logger.error("FileNotFoundError: Python or uv executable not found.")
        return -1, "", "Error: Python or uv executable not found."
    except Exception as e:
        logger.error(f"Unexpected error in subprocess: {e}", exc_info=True)
        return -1, "", f"An unexpected error occurred: {str(e)}"


@app.get("/")
async def read_root():
    return {"message": "Welcome to the Task Scheduler API"}

@app.post("/api/parse")
async def parse_python_file(file: UploadFile = File(...)):
    """
    Parses the uploaded Python file to extract task information.
    """
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        parsed_data = parse_workflow(content_str)

        # Save the file for the execution step
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(content)

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

@app.post("/api/execute")
async def execute_task(body: dict):
    filename = body.get("filename")
    code = body.get("code")
    logger.info(f"Received request to /api/execute for file: {filename}")
    
    # Save the potentially modified code back to the file before execution
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "w", encoding='utf-8') as f:
        f.write(code)
    logger.info(f"Saved code to {file_path}")

    try:
        loop = asyncio.get_running_loop()
        
        # The script path for `uv run` should be relative to the cwd (BACKEND_DIR)
        script_path_for_run = os.path.join("uploads", filename)
        
        logger.info(f"Scheduling {script_path_for_run} to run in executor.")
        # Run the blocking subprocess call in a separate thread
        returncode, stdout, stderr = await loop.run_in_executor(
            None,  # Use the default thread pool executor
            functools.partial(run_script_in_subprocess, script_path_for_run)
        )
        logger.info(f"Executor finished for {script_path_for_run}.")

        if returncode != 0:
            logger.warning(f"Execution failed for {filename} with return code {returncode}.")
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

        logger.info(f"Execution successful for {filename}.")
        return {
            "message": f"Task {filename} executed successfully.",
            "stdout": stdout,
            "stderr": stderr
        }
    except Exception as e:
        logger.error(f"Unhandled exception in /api/execute for file {filename}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Unhandled exception: {str(e)}")
