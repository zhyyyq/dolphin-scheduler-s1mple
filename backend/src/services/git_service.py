import subprocess
import os
import yaml
from ..core.logger import logger

WORKFLOW_REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'workflow_repo')).replace('\\', '/')

def git_commit(file_path, message):
    """Commits a file to the git repository."""
    try:
        status_result = subprocess.run(
            ["git", "status", "--porcelain", "--", file_path], 
            cwd=WORKFLOW_REPO_DIR, 
            check=True, 
            capture_output=True, 
            text=True
        )
        if status_result.stdout.strip():
            logger.info(f"Changes detected for {file_path}. Committing...")
            subprocess.run(["git", "add", file_path], cwd=WORKFLOW_REPO_DIR, check=True)
            subprocess.run(["git", "commit", "-m", message], cwd=WORKFLOW_REPO_DIR, check=True)
            logger.info(f"Committed '{file_path}' with message: '{message}'")
        else:
            logger.info(f"No changes to commit for {file_path}")

    except subprocess.CalledProcessError as e:
        err_msg = f"Git operation failed for {file_path}: {e.stderr}"
        logger.error(err_msg)
        raise Exception(err_msg)
    except FileNotFoundError:
        logger.error("Git command not found. Please ensure Git is installed and in the system's PATH.")

def get_deleted_workflows():
    """Lists workflow files that have been deleted from the repository."""
    try:
        result = subprocess.run(
            ["git", "log", "--diff-filter=D", "--summary"],
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        deleted_files = {}
        commit_hash = None
        for line in result.stdout.strip().split('\n'):
            if line.startswith('commit '):
                commit_hash = line.split(' ')[1]
            elif 'delete mode' in line:
                filename = line.split(' ')[-1]
                if filename not in deleted_files:
                    if not os.path.exists(os.path.join(WORKFLOW_REPO_DIR, filename)):
                        deleted_files[filename] = {
                            "filename": filename,
                            "commit_hash": commit_hash
                        }

        return list(deleted_files.values())
    except subprocess.CalledProcessError as e:
        logger.error(f"Git log for deleted files failed: {e.stderr}")
        return []
    except Exception as e:
        logger.error(f"Error listing deleted workflows: {e}", exc_info=True)
        return []

def restore_workflow(filename: str, commit_hash: str):
    """Restores a deleted workflow file from a specific commit."""
    try:
        if ".." in filename or "/" in filename or "\\" in filename:
            raise ValueError("Invalid workflow filename.")

        if os.path.exists(os.path.join(WORKFLOW_REPO_DIR, filename)):
            raise FileExistsError(f"File '{filename}' already exists. Cannot restore.")

        subprocess.run(
            ["git", "checkout", f"{commit_hash}^", "--", filename],
            cwd=WORKFLOW_REPO_DIR,
            check=True
        )
        
        commit_message = f"Restore workflow: {filename}"
        subprocess.run(["git", "add", filename], cwd=WORKFLOW_REPO_DIR, check=True)
        subprocess.run(["git", "commit", "-m", commit_message], cwd=WORKFLOW_REPO_DIR, check=True)

        return {"message": f"Workflow '{filename}' restored successfully."}
    except subprocess.CalledProcessError as e:
        logger.error(f"Git checkout failed for {filename}: {e.stderr}")
        raise
    except Exception as e:
        logger.error(f"Error restoring workflow: {e}", exc_info=True)
        raise

def get_workflow_history(workflow_uuid: str):
    """
    Gets the commit history for a specific workflow file.
    """
    try:
        filename = f"{workflow_uuid}.yaml"
        
        deletion_log_result = subprocess.run(
            ["git", "log", "--diff-filter=D", "--format=%H", "-n", "1", "--", filename],
            cwd=WORKFLOW_REPO_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        last_deletion_commit = deletion_log_result.stdout.strip()

        log_cmd = ["git", "log", "--format=%H%x1f%an%x1f%at%x1f%s", "--follow"]
        if last_deletion_commit:
            log_cmd.append(f"{last_deletion_commit}..HEAD")
        
        log_cmd.extend(["--", filename])

        history_result = subprocess.run(
            log_cmd,
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        history = []
        for line in history_result.stdout.strip().split('\n'):
            if not line: continue
            parts = line.split('\x1f')
            commit_hash = parts[0]
            
            check_file_exists_cmd = ["git", "cat-file", "-e", f"{commit_hash}:{filename}"]
            file_exists_proc = subprocess.run(check_file_exists_cmd, cwd=WORKFLOW_REPO_DIR, capture_output=True)

            if file_exists_proc.returncode == 0:
                history.append({
                    "hash": commit_hash,
                    "author": parts[1],
                    "timestamp": int(parts[2]),
                    "message": parts[3],
                })

        return history
    except subprocess.CalledProcessError as e:
        logger.error(f"Git log command failed for {filename}: {e.stderr}")
        return []
    except FileNotFoundError:
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching history for {filename}: {e}", exc_info=True)
        raise

def find_workflow_file_by_name(name_to_find: str):
    """Finds a workflow file in the repo by its 'name' attribute, searching recursively."""
    for root, _, files in os.walk(WORKFLOW_REPO_DIR):
        for filename in files:
            if filename.endswith('.yaml'):
                file_path = os.path.join(root, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = yaml.safe_load(f)
                        if data and data.get('workflow', {}).get('name') == name_to_find:
                            return os.path.relpath(file_path, WORKFLOW_REPO_DIR).replace('\\', '/')
                except Exception as e:
                    logger.warning(f"Could not parse {file_path}: {e}")
    return None

def get_workflow_commit_diff(workflow_uuid: str, commit_hash: str):
    """Gets the diff for a specific commit of a workflow file."""
    try:
        filename = f"{workflow_uuid}.yaml"
        
        parent_check = subprocess.run(
            ["git", "rev-parse", "--verify", f"{commit_hash}^"],
            cwd=WORKFLOW_REPO_DIR,
            capture_output=True,
            text=True
        )

        if parent_check.returncode != 0:
            show_result = subprocess.run(
                ["git", "show", "--pretty=format:", commit_hash, "--", filename],
                cwd=WORKFLOW_REPO_DIR,
                check=True,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            return {"diff": show_result.stdout.strip()}
        else:
            diff_result = subprocess.run(
                ["git", "diff", f"{commit_hash}^!", "--", filename],
                cwd=WORKFLOW_REPO_DIR,
                check=True,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            return {"diff": diff_result.stdout.strip()}

    except subprocess.CalledProcessError as e:
        logger.error(f"Git operation failed for {filename} at {commit_hash}: {e.stderr}")
        raise
    except FileNotFoundError:
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching commit diff: {e}", exc_info=True)
        raise
