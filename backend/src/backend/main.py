from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
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

        # For now, we still use a placeholder for the DAG image.
        # A real implementation would generate this image based on parsed_data.
        dag_image_url = "https://user-images.githubusercontent.com/1018939/232727011-8f0c9448-3b32-4544-a87a-275d5e317193.png"

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
                "dag_image_url": dag_image_url,
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
        dag_image_url = "https://user-images.githubusercontent.com/1018939/232727011-8f0c9448-3b32-4544-a87a-275d5e317193.png"
        return {
            "preview": {
                "dag_image_url": dag_image_url,
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
    """
    Executes the python script.
    For now, this is a mock implementation.
    """
    # Security warning: In a real-world application, executing arbitrary
    # user-uploaded code is extremely dangerous. This should be done in a
    # sandboxed environment.
    
    # Save the potentially modified code back to the file before execution
    file_path = os.path.join("uploads", filename)
    with open(file_path, "w") as f:
        f.write(code)

    # In a real app, you would trigger the execution via a proper scheduler
    # or a sandboxed subprocess.
    print(f"Executing {file_path}...")
    
    return {"message": f"Task {filename} submitted for execution."}
