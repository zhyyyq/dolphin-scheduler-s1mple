from pydantic import BaseModel

class TaskCreate(BaseModel):
    name: str
    task_type: str
    description: str | None = None
