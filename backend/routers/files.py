"""Files router - handles file uploads and serving"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
import aiofiles
import uuid
import os

router = APIRouter(prefix="/api/files", tags=["Files"])

# Will be set by main server
get_current_user = None
UPLOADS_DIR = None

def init_files(auth_func, uploads_dir: Path):
    """Initialize files router with dependencies"""
    global get_current_user, UPLOADS_DIR
    get_current_user = auth_func
    UPLOADS_DIR = uploads_dir


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(lambda: get_current_user)
):
    """Upload a file and return its URL"""
    try:
        # Generate unique filename
        file_ext = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOADS_DIR / unique_filename
        
        # Save the file
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Return the file URL
        backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
        file_url = f"{backend_url}/api/files/{unique_filename}"
        
        return {
            "success": True,
            "file_url": file_url,
            "filename": file.filename,
            "stored_filename": unique_filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/{filename}")
async def get_file(filename: str):
    """Serve an uploaded file"""
    file_path = UPLOADS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)
