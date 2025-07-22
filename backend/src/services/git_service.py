import subprocess
import os
import yaml
from ..core.logger import logger

WORKFLOW_REPO_DIR = os.getenv("WORKFLOW_REPO_DIR")

def revert_to_commit(filename: str, commit_hash: str):
    """Reverts a file to a specific commit and creates a new commit for the revert."""
    try:
        # Get the content of the file at the specified commit
        result = subprocess.run(
            ["git", "show", f"{commit_hash}:{filename}"],
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        content = result.stdout

        # Write that content back to the current file
        file_path = os.path.join(WORKFLOW_REPO_DIR, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Commit the change
        commit_message = f"Revert {filename} to version {commit_hash[:7]}"
        git_commit(file_path, commit_message)
        
        return {"message": f"Successfully reverted {filename} to {commit_hash[:7]}"}
    except subprocess.CalledProcessError as e:
        logger.error(f"Git revert operation failed for {filename} to {commit_hash}: {e.stderr}")
        raise
    except Exception as e:
        logger.error(f"Error reverting workflow: {e}", exc_info=True)
        raise

def get_latest_commit_for_file(filename: str):
    """Gets the latest commit hash for a specific file."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--pretty=format:%H", "--", filename],
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to get latest commit for {filename}: {e.stderr}")
        return None

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
    """Lists workflow files that have been deleted, including their names."""
    try:
        # Get the list of deleted yaml files and the commit they were deleted in
        result = subprocess.run(
            ["git", "log", "--diff-filter=D", "--summary", "--", "*.yaml"],
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        deleted_files_info = {}
        commit_hash = None
        for line in result.stdout.strip().split('\n'):
            if line.startswith('commit '):
                commit_hash = line.split(' ')[1]
            elif 'delete mode' in line and line.endswith('.yaml'):
                filename = line.split(' ')[-1]
                # We only care about the first time a file was deleted, in case it was restored and deleted again.
                if filename not in deleted_files_info:
                     # Check if the file *still* doesn't exist. If it does, it was restored.
                    if not os.path.exists(os.path.join(WORKFLOW_REPO_DIR, filename)):
                        deleted_files_info[filename] = commit_hash

        workflows = []
        yaml_parser = yaml.YAML()
        for filename, commit_hash in deleted_files_info.items():
            try:
                # Get the content of the file from the commit *before* it was deleted
                content_result = subprocess.run(
                    ["git", "show", f"{commit_hash}^:{filename}"],
                    cwd=WORKFLOW_REPO_DIR,
                    check=True,
                    capture_output=True,
                    text=True,
                    encoding='utf-8'
                )
                content = content_result.stdout
                data = yaml_parser.load(content)
                workflow_name = data.get('workflow', {}).get('name', 'Unknown Name')
                
                workflows.append({
                    "filename": filename,
                    "commit_hash": commit_hash,
                    "name": workflow_name
                })
            except (subprocess.CalledProcessError, yaml.YAMLError) as e:
                # If we can't get the old content or parse it, just add it with an unknown name
                logger.warning(f"Could not retrieve or parse content for deleted file {filename} at {commit_hash}^: {e}")
                workflows.append({
                    "filename": filename,
                    "commit_hash": commit_hash,
                    "name": "Unknown (Parse Error)"
                })

        return workflows
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

def get_workflow_content_at_commit(filename: str, commit_hash: str):
    """Gets the content of a workflow file at a specific commit, typically the one before it was deleted."""
    try:
        # The commit_hash provided is the one *where the deletion happened*.
        # So, we need to look at the parent of that commit to find the file's content.
        commit_ref = f"{commit_hash}^"
        
        # Verify the file exists at that parent commit
        verify_proc = subprocess.run(
            ["git", "cat-file", "-e", f"{commit_ref}:{filename}"],
            cwd=WORKFLOW_REPO_DIR,
            capture_output=True
        )
        
        if verify_proc.returncode != 0:
            # This can happen in rare cases, e.g., the file was created and deleted in the same commit (an empty commit).
            # Or if the commit has no parent (initial commit).
            logger.warning(f"Could not find file '{filename}' in parent of commit '{commit_hash}'. Trying the commit itself.")
            commit_ref = commit_hash

        content_result = subprocess.run(
            ["git", "show", f"{commit_ref}:{filename}"],
            cwd=WORKFLOW_REPO_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        return {"content": content_result.stdout}
    except subprocess.CalledProcessError as e:
        logger.error(f"Git show command failed for {filename} at commit {commit_hash}: {e.stderr}")
        raise FileNotFoundError(f"Could not retrieve content for '{filename}' at the specified commit.")
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching content for {filename}: {e}", exc_info=True)
        raise

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
