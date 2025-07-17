from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import TaskCreate
from .services import create_ds_task

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import logging

logging.basicConfig(filename='app.log', level=logging.INFO)

@app.post("/tasks/")
async def create_task(task: TaskCreate):
    logging.info(f"Received task: {task}")
    try:
        create_ds_task(task.name, task.task_type, task.description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return task
