from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
import os
from ..services import file_service

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Handles the file upload and saves it to the designated resource directory.
    """
    return file_service.save_uploaded_file(file)

@router.get("/list")
async def list_files():
    """
    Lists all uploaded files.
    """
    return file_service.list_uploaded_files()

@router.get("/download/{filename}")
async def download_file(filename: str):
    """
    Downloads a specific uploaded file.
    """
    # Basic security: prevent path traversal.
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
        
    file_path = os.path.join(file_service.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
    
    return FileResponse(path=file_path, filename=filename)
