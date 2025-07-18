from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import subprocess
import sys
from .parser import parse_workflow

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
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
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
        raise HTTPException(status_code=500, detail=f"Failed to re-parse code: {e}")

@app.post("/api/execute")
async def execute_task(body: dict):
    filename = body.get("filename")
    code = body.get("code")
    
    # Save the potentially modified code back to the file before execution
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "w", encoding='utf-8') as f:
        f.write(code)

    try:
        # Execute the python script in a separate process
        # This uses the same Python interpreter that runs the FastAPI app
        python_executable = sys.executable
        result = subprocess.run(
            [python_executable, file_path],
            capture_output=True,
            text=True,
            check=True,
            encoding='utf-8'
        )
        
        return {
            "message": f"Task {filename} executed successfully.",
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=500, 
            detail={
                "message": f"Failed to execute task {filename}.",
                "stdout": e.stdout,
                "stderr": e.stderr
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
