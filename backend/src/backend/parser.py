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

    for node in ast.walk(tree):
        # Find workflow schedule
        if isinstance(node, ast.With):
            for item in node.items:
                if isinstance(item.context_expr, ast.Call) and getattr(item.context_expr.func, 'id', None) == 'Workflow':
                    for keyword in item.context_expr.keywords:
                        if keyword.arg == 'schedule':
                            schedule = keyword.value.s if isinstance(keyword.value, ast.Str) else "Not Found"

        # Find task declarations
        if isinstance(node, ast.Assign):
            if isinstance(node.value, ast.Call) and getattr(node.value.func, 'id', None) == 'Shell':
                task_name = node.targets[0].id
                tasks[task_name] = {'type': 'Shell'}
                for keyword in node.value.keywords:
                    if keyword.arg == 'name':
                        tasks[task_name]['name'] = keyword.value.s if isinstance(keyword.value, ast.Str) else "Not Found"

        # Find task relations (<< operator)
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Compare):
            if any(isinstance(op, ast.LShift) for op in node.value.ops):
                # This handles chains like: a << b << c
                all_nodes = [node.value.left] + node.value.comparators
                for i in range(len(all_nodes) - 1):
                    downstream = all_nodes[i].id
                    upstream = all_nodes[i+1].id
                    if isinstance(upstream, list): # handles task_group
                        for task in upstream:
                            relations.append({'from': task, 'to': downstream})
                    else:
                        relations.append({'from': upstream, 'to': downstream})

        # Find task relations (set_downstream)
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            if getattr(node.value.func, 'attr', None) == 'set_downstream':
                upstream = node.value.func.value.id
                downstream_nodes = node.value.args[0]
                if isinstance(downstream_nodes, ast.List):
                    for downstream_node in downstream_nodes.elts:
                        relations.append({'from': upstream, 'to': downstream_node.id})
                else:
                    relations.append({'from': upstream, 'to': downstream_nodes.id})


    return {
        "schedule": schedule,
        "tasks": list(tasks.keys()),
        "relations": relations
    }
