"""Webhooks router - handles Zapier and external webhook integrations"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import httpx
import logging

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])
logger = logging.getLogger(__name__)

# Will be set by main server
get_current_user = None
airtable_request = None

def init_webhooks(auth_func, airtable_func):
    """Initialize webhooks with dependencies"""
    global get_current_user, airtable_request
    get_current_user = auth_func
    airtable_request = airtable_func


# ==================== MODELS ====================

class WebhookPayload(BaseModel):
    data: Dict[str, Any]

class SendCSARequest(BaseModel):
    record_id: str
    email: str
    name: str
    service: str

class GenericWebhookRequest(BaseModel):
    record_id: str
    email: str
    name: str

class CustomCSARequest(BaseModel):
    record_id: str
    email: str
    name: str
    service: str
    due_date: Optional[str] = None

class ReviewWebhookRequest(BaseModel):
    record_id: str
    email: str
    name: str
    package_purchased: Optional[str] = None


# ==================== ZAPIER WEBHOOK URLS ====================
ZAPIER_WEBHOOKS = {
    "case_update": "https://hooks.zapier.com/hooks/catch/16911992/2nnq1wj/",
    "upload_file": "https://hooks.zapier.com/hooks/catch/16911992/2nnq1e3/",
    "client_questionnaire": "https://hooks.zapier.com/hooks/catch/16911992/2bz9u4h/",
    "csa_followup": "https://hooks.zapier.com/hooks/catch/16911992/2bzj7n2/",
    "custom_csa": "https://hooks.zapier.com/hooks/catch/16911992/2bzk9ox/",
    "contact_info": "https://hooks.zapier.com/hooks/catch/16911992/2bzkixy/",
    "send_csa": "https://hooks.zapier.com/hooks/catch/16911992/2bz944c/",
    "review_request": "https://hooks.zapier.com/hooks/catch/16911992/22lbsqu/",
    "review_followup": "https://hooks.zapier.com/hooks/catch/16911992/22lbwcm/",
}


async def send_to_zapier(webhook_key: str, data: dict) -> dict:
    """Send data to a Zapier webhook"""
    url = ZAPIER_WEBHOOKS.get(webhook_key)
    if not url:
        raise HTTPException(status_code=400, detail=f"Unknown webhook: {webhook_key}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=data)
        if response.status_code not in [200, 201]:
            logger.error(f"Zapier webhook failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Webhook failed")
        return {"success": True, "status": response.status_code}


# ==================== ENDPOINTS ====================

@router.post("/send-case-update")
async def send_case_update(payload: WebhookPayload, current_user: dict = Depends(lambda: get_current_user)):
    """Send case update via Zapier webhook"""
    return await send_to_zapier("case_update", payload.data)


@router.post("/upload-file")
async def upload_file_webhook(payload: WebhookPayload, current_user: dict = Depends(lambda: get_current_user)):
    """Upload file via Zapier webhook"""
    return await send_to_zapier("upload_file", payload.data)


@router.post("/send-review-request")
async def send_review_request_webhook(data: ReviewWebhookRequest, current_user: dict = Depends(lambda: get_current_user)):
    """Send review request email via Zapier webhook"""
    try:
        webhook_data = {
            "email": data.email,
            "name": data.name,
            "package_purchased": data.package_purchased or ""
        }
        
        result = await send_to_zapier("review_request", webhook_data)
        
        # Update the record's Review Request Sent field
        try:
            await airtable_request("PATCH", f"Master%20List/{data.record_id}", {
                "fields": {
                    "Review Request Sent": True
                }
            })
        except Exception as update_error:
            logger.error(f"Failed to update Review Request Sent field: {update_error}")
        
        return {"success": True, "message": "Review request sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send review request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send review request: {str(e)}")


@router.post("/send-review-followup")
async def send_review_followup_webhook(data: ReviewWebhookRequest, current_user: dict = Depends(lambda: get_current_user)):
    """Send review follow-up email via Zapier webhook"""
    try:
        webhook_data = {
            "email": data.email,
            "name": data.name,
            "package_purchased": data.package_purchased or ""
        }
        
        result = await send_to_zapier("review_followup", webhook_data)
        
        # Update the record's Review Follow Up Sent field
        try:
            await airtable_request("PATCH", f"Master%20List/{data.record_id}", {
                "fields": {
                    "Review Follow Up Sent": True
                }
            })
        except Exception as update_error:
            logger.error(f"Failed to update Review Follow Up Sent field: {update_error}")
        
        return {"success": True, "message": "Review follow-up sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send review follow-up: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send review follow-up: {str(e)}")


@router.post("/send-client-questionnaire")
async def send_client_questionnaire_webhook(data: GenericWebhookRequest, current_user: dict = Depends(lambda: get_current_user)):
    """Send client questionnaire via Zapier webhook"""
    try:
        webhook_data = {
            "record_id": data.record_id,
            "email": data.email,
            "name": data.name
        }
        result = await send_to_zapier("client_questionnaire", webhook_data)
        return {"success": True, "message": "Client questionnaire sent"}
    except Exception as e:
        logger.error(f"Failed to send questionnaire: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-csa-followup")
async def send_csa_followup_webhook(data: GenericWebhookRequest, current_user: dict = Depends(lambda: get_current_user)):
    """Send CSA follow-up via Zapier webhook"""
    try:
        webhook_data = {
            "record_id": data.record_id,
            "email": data.email,
            "name": data.name
        }
        result = await send_to_zapier("csa_followup", webhook_data)
        return {"success": True, "message": "CSA follow-up sent"}
    except Exception as e:
        logger.error(f"Failed to send CSA follow-up: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-custom-csa")
async def send_custom_csa_webhook(data: CustomCSARequest, current_user: dict = Depends(lambda: get_current_user)):
    """Send custom CSA via Zapier webhook"""
    try:
        webhook_data = {
            "record_id": data.record_id,
            "email": data.email,
            "name": data.name,
            "service": data.service,
            "due_date": data.due_date or ""
        }
        result = await send_to_zapier("custom_csa", webhook_data)
        return {"success": True, "message": "Custom CSA sent"}
    except Exception as e:
        logger.error(f"Failed to send custom CSA: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-contact-info")
async def send_contact_info_webhook(data: GenericWebhookRequest, current_user: dict = Depends(lambda: get_current_user)):
    """Send contact info via Zapier webhook"""
    try:
        webhook_data = {
            "record_id": data.record_id,
            "email": data.email,
            "name": data.name
        }
        result = await send_to_zapier("contact_info", webhook_data)
        return {"success": True, "message": "Contact info sent"}
    except Exception as e:
        logger.error(f"Failed to send contact info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-csa")
async def send_csa_webhook(data: SendCSARequest, current_user: dict = Depends(lambda: get_current_user)):
    """Send CSA via Zapier webhook"""
    try:
        webhook_data = {
            "record_id": data.record_id,
            "email": data.email,
            "name": data.name,
            "service": data.service
        }
        
        result = await send_to_zapier("send_csa", webhook_data)
        
        # Update the record's CSA Sent field
        try:
            await airtable_request("PATCH", f"Master%20List/{data.record_id}", {
                "fields": {
                    "CSA Sent": True
                }
            })
        except Exception as update_error:
            logger.error(f"Failed to update CSA Sent field: {update_error}")
        
        return {"success": True, "message": "CSA sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send CSA: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
