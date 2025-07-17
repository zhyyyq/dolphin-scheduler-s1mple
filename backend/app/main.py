from fastapi import FastAPI
from .models import TaskCreate

app = FastAPI()

@app.post("/tasks/")
async def create_task(task: TaskCreate):
    print(f"Received task: {task}")
    # 在这里添加与 pydolphinscheduler 的交互逻辑
    return task
