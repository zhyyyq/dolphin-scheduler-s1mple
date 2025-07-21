import yaml
from .core.logger import logger

def parse_workflow(content: str):
    """
    Parses the content of a YAML workflow file to extract
    workflow metadata, tasks, and their relationships.
    """
    try:
        data = yaml.safe_load(content)
        
        workflow_data = data.get('workflow', {})
        tasks_data = data.get('tasks', [])
        
        schedule = workflow_data.get('schedule')
        
        tasks = []
        for task_data in tasks_data:
            # Pass all task data through, just map task_type to type for frontend
            # This ensures fields for specific task types (like 'condition' for Switch) are preserved.
            parsed_task = task_data.copy()
            if 'task_type' in parsed_task:
                parsed_task['type'] = parsed_task.pop('task_type')
            tasks.append(parsed_task)
            
        relations = []
        for task_data in tasks_data:
            task_name = task_data.get('name')
            if 'deps' in task_data:
                for dep in task_data['deps']:
                    relations.append({
                        'from': dep,
                        'to': task_name
                    })
            
            if task_data.get('task_type') == 'Switch':
                conditions = task_data.get('condition', [])
                for branch in conditions:
                    if 'task' in branch:
                        relations.append({'from': task_name, 'to': branch['task']})

        return {
            "schedule": schedule,
            "tasks": tasks,
            "relations": relations
        }
    except Exception as e:
        logger.error(f"Error parsing workflow: {e}", exc_info=True)
        return {}
