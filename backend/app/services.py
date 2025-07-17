from pydolphinscheduler.core.process_definition import ProcessDefinition
from pydolphinscheduler.tasks.python import Python
from pydolphinscheduler.tasks.shell import Shell
from py4j.protocol import Py4JNetworkError

def create_ds_task(name: str, task_type: str, description: str):
    try:
        with ProcessDefinition(
            name=name,
            description=description,
        ) as pd:
            if task_type == "PYTHON":
                task = Python(name="python_task", definition="print('hello world')")
            else:
                task = Shell(name="shell_task", command="echo 'hello world'")
            pd.run()
    except Py4JNetworkError:
        raise Exception("Could not connect to DolphinScheduler's Java Gateway. Please ensure that the DolphinScheduler service is running and the gateway port is accessible.")
