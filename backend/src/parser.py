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
            # Pass all task data through, and keep original keys.
            # The frontend will handle unifying the type key.
            parsed_task = task_data.copy()

            # Special handling for Dependent tasks with flat structure
            if parsed_task.get('task_type') == 'Dependent' and 'op' in parsed_task and 'groups' in parsed_task:
                logger.info(f"Re-structuring Dependent task for frontend: {parsed_task.get('name')}")
                
                # Create a new dict to avoid issues with ruamel.yaml object modification
                new_task = {
                    'name': parsed_task.get('name'),
                    'task_type': parsed_task.get('task_type'),
                    'denpendence': {
                        'op': parsed_task.get('op'),
                        'groups': parsed_task.get('groups')
                    }
                }
                # Copy any other keys that might exist (e.g., deps, id)
                for key, value in parsed_task.items():
                    if key not in ['name', 'task_type', 'op', 'groups', 'denpendence']:
                        new_task[key] = value
                
                tasks.append(new_task)
            else:
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
            
            if task_data.get('task_type') == 'SubWorkflow':
                if 'workflow_name' in task_data:
                    # This is a simplification. Proper handling might require
                    # parsing the sub-workflow to find its start and end nodes.
                    # For now, we just create a dependency on the sub-workflow itself.
                    pass

        return {
            "schedule": schedule,
            "tasks": tasks,
            "relations": relations
        }
    except Exception as e:
        logger.error(f"Error parsing workflow: {e}", exc_info=True)
        return {}
