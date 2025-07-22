import os

# Correctly calculate the project root and workflow repo directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORKFLOW_REPO_DIR = os.path.abspath(os.getenv("WORKFLOW_REPO_DIR", os.path.join(PROJECT_ROOT, 'workflow_repo')))

def find_resource_file(file_ref: str) -> str | None:
    """
    Finds a resource file by searching in predefined locations.
    Search order:
    1. Relative to WORKFLOW_REPO_DIR
    2. Relative to WORKFLOW_REPO_DIR/resources
    
    Args:
        file_ref: The file reference, which can be a relative path.
        
    Returns:
        The absolute path to the file if found, otherwise None.
    """
    # Define search paths
    search_paths = [
        os.path.abspath(os.path.join(WORKFLOW_REPO_DIR, file_ref)),
        os.path.abspath(os.path.join(WORKFLOW_REPO_DIR, 'resources', file_ref))
    ]

    for path in search_paths:
        # Security check: ensure the resolved path is within the workflow repo directory.
        if os.path.exists(path) and os.path.abspath(path).startswith(WORKFLOW_REPO_DIR):
            return path

    return None
