import asyncio
import os
from ..core.logger import logger

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

async def run_script_in_subprocess_async(script_path: str) -> (int, str, str):
    """
    Runs a script in a subprocess asynchronously and returns the result.
    """
    logger.info(f"Attempting to run script asynchronously: {script_path}")
    try:
        proc = await asyncio.create_subprocess_exec(
            "uv", "run", script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=BACKEND_DIR
        )
        
        stdout, stderr = await proc.communicate()
        
        decoded_stdout = stdout.decode('utf-8')
        decoded_stderr = stderr.decode('utf-8')
        
        logger.info(f"Script {script_path} finished with return code {proc.returncode}.")
        return proc.returncode, decoded_stdout, decoded_stderr
    except FileNotFoundError:
        logger.error("FileNotFoundError: uv executable not found.")
        return -1, "", "Error: uv executable not found."
    except Exception as e:
        logger.error(f"Unexpected error in async subprocess: {e}", exc_info=True)
        return -1, "", f"An unexpected error occurred: {str(e)}"
