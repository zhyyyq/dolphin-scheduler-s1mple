import os

WORKFLOW_REPO_DIR = os.path.abspath(os.getenv("WORKFLOW_REPO_DIR", os.path.join(os.path.dirname(__file__), '..', '..', 'workflow_repo')))

def find_resource_file(file_ref: str) -> str | None:
    """
    Finds a resource file by searching in predefined locations.
    Search order:
    1. WORKFLOW_REPO_DIR
    2. WORKFLOW_REPO_DIR/resources
    
    Args:
        file_ref: The file reference, which can be a relative path.
        
    Returns:
        The absolute path to the file if found, otherwise None.
    """
    # Define search paths
    path1 = os.path.abspath(os.path.join(WORKFLOW_REPO_DIR, file_ref))
    path2 = os.path.abspath(os.path.join(WORKFLOW_REPO_DIR, 'resources', file_ref))

    # Check in the primary directory
    if os.path.exists(path1) and path1.startswith(WORKFLOW_REPO_DIR):
        return path1
        
    # Check in the resources subdirectory
    if os.path.exists(path2) and path2.startswith(WORKFLOW_REPO_DIR):
        return path2

    return None
