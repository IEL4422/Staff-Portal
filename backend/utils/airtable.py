"""Airtable API utilities for making requests to Airtable"""

from fastapi import HTTPException
from typing import Dict, Optional
import httpx
import logging
import os

logger = logging.getLogger(__name__)

AIRTABLE_API_KEY = os.environ.get('AIRTABLE_API_KEY', '')
AIRTABLE_BASE_ID = os.environ.get('AIRTABLE_BASE_ID', '')
AIRTABLE_BASE_URL = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}"


async def airtable_request(method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
    """Make a request to Airtable API"""
    url = f"{AIRTABLE_BASE_URL}/{endpoint}"
    headers = {
        'Authorization': f'Bearer {AIRTABLE_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Use longer timeout for Airtable requests
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            if method == "GET":
                response = await client.get(url, headers=headers)
            elif method == "POST":
                response = await client.post(url, headers=headers, json=data)
            elif method == "PATCH":
                response = await client.patch(url, headers=headers, json=data)
            elif method == "DELETE":
                response = await client.delete(url, headers=headers)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported method: {method}")
            
            if response.status_code == 200 or response.status_code == 201:
                return response.json()
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail="Record not found")
            elif response.status_code == 422:
                error_data = response.json()
                error_message = error_data.get('error', {}).get('message', 'Validation error')
                logger.error(f"Airtable 422 error: {error_data}")
                raise HTTPException(status_code=422, detail=error_message)
            else:
                logger.error(f"Airtable request failed: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Airtable error: {response.text}")
        except httpx.TimeoutException:
            logger.error(f"Airtable request timed out: {method} {url}")
            raise HTTPException(status_code=504, detail="Request to Airtable timed out")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Airtable request error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Airtable request failed: {str(e)}")


async def upload_attachment_to_airtable(record_id: str, field_name: str, file_data: str, filename: str):
    """Upload an attachment to an Airtable record using the two-step approach"""
    try:
        # Step 1: Create attachment upload URL
        upload_url_response = await airtable_request(
            "POST",
            f"Assets%20%26%20Debts/{record_id}/Attachments/uploadAttachment",
            {"contentType": "application/octet-stream", "filename": filename}
        )
        
        upload_url = upload_url_response.get("uploadUrl")
        attachment_id = upload_url_response.get("id")
        
        if not upload_url or not attachment_id:
            logger.error("Failed to get upload URL from Airtable")
            return None
        
        # Step 2: Upload the file data to the URL
        import base64
        file_bytes = base64.b64decode(file_data)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.put(
                upload_url,
                content=file_bytes,
                headers={"Content-Type": "application/octet-stream"}
            )
            
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to upload file to Airtable: {response.status_code}")
                return None
        
        return attachment_id
    except Exception as e:
        logger.error(f"Error uploading attachment: {str(e)}")
        return None
