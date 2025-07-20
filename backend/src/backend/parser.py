import yaml

def parse_workflow(content: str):
    """
    Parses the content of a YAML workflow file to extract
    workflow metadata, tasks, and their relationships.
    """
    data = yaml.safe_load(content)
    
    workflow_data = data.get('workflow', {})
    tasks_data = data.get('tasks', [])
    
    schedule = workflow_data.get('schedule')
    
    tasks = []
    for task_data in tasks_data:
        tasks.append({
            'name': task_data.get('name'),
            'type': task_data.get('task_type'),
            'command': task_data.get('command'),
        })
        
    relations = []
    for task_data in tasks_data:
        if 'deps' in task_data:
            for dep in task_data['deps']:
                relations.append({
                    'from': dep,
                    'to': task_data['name']
                })

    return {
        "schedule": schedule,
        "tasks": tasks,
        "relations": relations
    }
