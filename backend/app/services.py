from pydolphinscheduler.core.process_definition import ProcessDefinition
from pydolphinscheduler.tasks.python import Python
from pydolphinscheduler.tasks.shell import Shell

def create_ds_task(name: str, task_type: str, description: str):
    with ProcessDefinition(
        name=name,
        description=description,
    ) as pd:
        if task_type == "PYTHON":
            task = Python(name="python_task", definition="print('hello world')")
        else:
            task = Shell(name="shell_task", command="echo 'hello world'")
        pd.run()
