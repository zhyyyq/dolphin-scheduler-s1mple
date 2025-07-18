import ast

def parse_workflow(content: str):
    """
    Parses the content of a pydolphinscheduler workflow file to extract
    workflow metadata, tasks, and their relationships.
    """
    tree = ast.parse(content)
    
    schedule = None
    tasks = {}
    relations = []
    list_assignments = {}

    # Pass 1: Collect declarations (workflows, tasks, list assignments)
    for node in ast.walk(tree):
        if isinstance(node, ast.With):
            for item in node.items:
                if isinstance(item.context_expr, ast.Call) and getattr(item.context_expr.func, 'id', None) == 'Workflow':
                    for keyword in item.context_expr.keywords:
                        if keyword.arg == 'schedule':
                            schedule = keyword.value.s if isinstance(keyword.value, ast.Str) else "Not Found"
        
        elif isinstance(node, ast.Assign):
            # Task declarations
            if isinstance(node.value, ast.Call) and getattr(node.value.func, 'id', None) == 'Shell':
                task_name = node.targets[0].id
                task_details = {'name': task_name, 'type': 'Shell', 'command': 'N/A'}
                for keyword in node.value.keywords:
                    if keyword.arg == 'name':
                        # In pydolphinscheduler, the task name is the variable name.
                        # The `name` parameter inside Shell is for the DolphinScheduler UI.
                        pass
                    elif keyword.arg == 'command':
                        task_details['command'] = keyword.value.s if isinstance(keyword.value, ast.Str) else "Not Found"
                tasks[task_name] = task_details
            # List assignments for task groups
            elif isinstance(node.value, ast.List):
                list_name = node.targets[0].id
                list_assignments[list_name] = [elt.id for elt in node.value.elts if isinstance(elt, ast.Name)]

    def unnest_lshift_chain(n):
        if isinstance(n, ast.BinOp) and isinstance(n.op, ast.LShift):
            # Recursively unnest the chain
            return unnest_lshift_chain(n.left) + [n.right]
        return [n]

    # Pass 2: Resolve relationships
    for node in ast.walk(tree):
        if not isinstance(node, ast.Expr):
            continue

        # Handle `set_downstream` calls
        if isinstance(node.value, ast.Call) and getattr(node.value.func, 'attr', None) == 'set_downstream':
            upstream_task_name = node.value.func.value.id
            downstream_arg = node.value.args[0]
            
            downstream_task_names = list_assignments.get(downstream_arg.id, [downstream_arg.id]) if isinstance(downstream_arg, ast.Name) else [elt.id for elt in downstream_arg.elts]
            
            for downstream_task_name in downstream_task_names:
                relations.append({'from': upstream_task_name, 'to': downstream_task_name})

        # Handle `<<` operator chains
        elif isinstance(node.value, ast.BinOp) and isinstance(node.value.op, ast.LShift):
            chain = unnest_lshift_chain(node.value)
            # For a << b << c, chain is [a, b, c]. Dependency is c -> b -> a.
            chain_names = [n.id for n in reversed(chain) if isinstance(n, ast.Name)]
            
            for i in range(len(chain_names) - 1):
                upstream_name = chain_names[i]
                downstream_name = chain_names[i+1]
                
                upstream_tasks = list_assignments.get(upstream_name, [upstream_name])
                for task_in_group in upstream_tasks:
                    relations.append({'from': task_in_group, 'to': downstream_name})

    # Remove duplicate relations that might be generated
    unique_relations = [dict(t) for t in {tuple(d.items()) for d in relations}]

    return {
        "schedule": schedule,
        "tasks": list(tasks.values()), # Return the full task objects
        "relations": unique_relations
    }
