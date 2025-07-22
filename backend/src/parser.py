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

            if parsed_task.get('task_type') == 'Http' and isinstance(parsed_task.get('http_params'), list):
                http_params_list = parsed_task.get('http_params', [])
                # The original implementation was incorrect, it converted the list to a dict, losing type info.
                # By removing the conversion, we keep the original list of objects.
                # This was the initial fix. The following commented-out block is the incorrect code.
                # parsed_task['http_params'] = {
                #     param.get("prop"): param.get("value")
                #     for param in http_params_list
                #     if "prop" in param and "value" in param
                # }

            if 'deps' not in parsed_task:
                parsed_task['deps'] = []
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
