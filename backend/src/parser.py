import yaml
from .core.logger import logger
import os
import re

WORKFLOW_REPO_DIR = os.path.abspath(os.getenv("WORKFLOW_REPO_DIR", os.path.join(os.path.dirname(__file__), '..', 'workflow_repo')))

def resolve_file_references(task_data):
    """
    Recursively searches for and resolves $FILE{...} references in task data.
    It also adds metadata about the source of the fields.
    """
    if isinstance(task_data, dict):
        for key, value in task_data.items():
            if isinstance(value, str):
                match = re.match(r'^\$FILE\{(.+?)\}$', value)
                if match:
                    file_ref = match.group(1)
                    
                    # Define search paths
                    path1 = os.path.abspath(os.path.join(WORKFLOW_REPO_DIR, file_ref))
                    path2 = os.path.abspath(os.path.join(WORKFLOW_REPO_DIR, 'resources', file_ref))

                    found_path = None
                    if os.path.exists(path1) and path1.startswith(WORKFLOW_REPO_DIR):
                        found_path = path1
                    elif os.path.exists(path2) and path2.startswith(WORKFLOW_REPO_DIR):
                        found_path = path2

                    if found_path:
                        try:
                            with open(found_path, 'r', encoding='utf-8') as f:
                                task_data[key] = f.read()
                            task_data[f"{key}_source"] = "file"
                            task_data[f"{key}_path"] = file_ref
                        except Exception as e:
                            logger.error(f"Error reading file {found_path}: {e}")
                            task_data[key] = f"Error: Could not read file {file_ref}"
                            task_data[f"{key}_source"] = "error"
                    else:
                        logger.error(f"File not found for $FILE reference: {file_ref}")
                        task_data[key] = f"Error: File not found at {file_ref}"
                        task_data[f"{key}_source"] = "error"
                else:
                    # It's an inline value
                    task_data[f"{key}_source"] = "inline"
            elif isinstance(value, (dict, list)):
                resolve_file_references(value)
    elif isinstance(task_data, list):
        for item in task_data:
            resolve_file_references(item)
    
    return task_data

def parse_workflow(content: str):
    """
    Parses the content of a YAML workflow file to extract
    workflow metadata, tasks, and their relationships.
    It also resolves $FILE{...} references in task definitions.
    """
    try:
        data = yaml.safe_load(content)
        
        workflow_data = data.get('workflow', {})
        tasks_data = data.get('tasks', [])
        
        schedule = workflow_data.get('schedule')
        
        tasks = []
        for task_data in tasks_data:
            # Resolve $FILE{...} references before adding the task
            resolved_task_data = resolve_file_references(task_data.copy())
            tasks.append(resolved_task_data)
            
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
