from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

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
    For now, this is a mock implementation.
    """
    # In a real implementation, you would parse the file content
    # to extract DAG, schedule, etc.
    # For example, using ast module or regex.
    
    # For demonstration, we save the file and return mock data
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Mock response based on the UI design
    return {
        "filename": file.filename,
        "preview": {
            "dag_image_url": "https://user-images.githubusercontent.com/1018939/232727011-8f0c9448-3b32-4544-a87a-275d5e317193.png",
            "schedule": "2022-01-01 00:00:00 - 9999-12-31 23:59:59",
            "crontab": "0 0 0 * * ?"
        }
    }

@app.post("/api/execute")
async def execute_task(filename: str):
    """
    Executes the python script.
    For now, this is a mock implementation.
    """
    # Security warning: In a real-world application, executing arbitrary
    # user-uploaded code is extremely dangerous. This should be done in a
    # sandboxed environment.
    
    file_path = os.path.join("uploads", filename)
    if not os.path.exists(file_path):
        return {"error": "File not found."}
        
    # In a real app, you would trigger the execution via a proper scheduler
    # or a sandboxed subprocess.
    print(f"Executing {file_path}...")
    
    return {"message": f"Task {filename} submitted for execution."}
