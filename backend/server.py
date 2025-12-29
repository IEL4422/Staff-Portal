from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
import base64
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Airtable config
AIRTABLE_API_KEY = os.environ.get('AIRTABLE_API_KEY', '')
AIRTABLE_BASE_ID = os.environ.get('AIRTABLE_BASE_ID', '')
AIRTABLE_BASE_URL = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}"
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-key')

# Create the main app
app = FastAPI(title="Illinois Estate Law Staff Portal API")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])
airtable_router = APIRouter(prefix="/api/airtable", tags=["Airtable"])
webhooks_router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AirtableRecord(BaseModel):
    id: str
    fields: Dict[str, Any]
    createdTime: Optional[str] = None

class AirtableRecordCreate(BaseModel):
    fields: Dict[str, Any]

class AirtableRecordUpdate(BaseModel):
    fields: Dict[str, Any]

class MailCreate(BaseModel):
    recipient: str
    subject: str
    body: str
    case_id: Optional[str] = None
    status: str = "Pending"

class InvoiceCreate(BaseModel):
    client_name: str
    amount: float
    description: str
    case_id: Optional[str] = None
    status: str = "Pending"
    due_date: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "Medium"
    case_id: Optional[str] = None
    assigned_to: Optional[str] = None
    status: str = "To Do"

class DateDeadlineCreate(BaseModel):
    title: str
    date: str
    type: str = "Deadline"
    case_id: Optional[str] = None
    notes: Optional[str] = None

class CaseContactCreate(BaseModel):
    name: str
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    case_id: Optional[str] = None
    notes: Optional[str] = None

class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    lead_type: Optional[str] = None
    referral_source: Optional[str] = None
    inquiry_notes: Optional[str] = None

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    case_type: Optional[str] = None

class WebhookPayload(BaseModel):
    data: Dict[str, Any]

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AIRTABLE HELPERS ====================

async def airtable_request(method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
    """Make request to Airtable API"""
    url = f"{AIRTABLE_BASE_URL}/{endpoint}"
    headers = {
        "Authorization": f"Bearer {AIRTABLE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
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
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code == 429:
                raise HTTPException(status_code=429, detail="Airtable rate limit exceeded. Please try again later.")
            
            if response.status_code == 403:
                raise HTTPException(status_code=403, detail="Table not found or insufficient permissions. The table may not exist in your Airtable base.")
            
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Record or table not found in Airtable.")
            
            if response.status_code == 422:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get("error", {}).get("message", "Invalid field names or data format")
                raise HTTPException(status_code=422, detail=f"Airtable validation error: {error_msg}")
            
            response.raise_for_status()
            return response.json() if response.text else {}
        except httpx.HTTPStatusError as e:
            logger.error(f"Airtable API error: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Airtable error: {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Airtable request error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to connect to Airtable: {str(e)}")

# ==================== AUTH ROUTES ====================

@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id, user_data.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=datetime.now(timezone.utc)
        )
    )

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"]
        )
    )

@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=datetime.fromisoformat(current_user["created_at"]) if isinstance(current_user["created_at"], str) else current_user["created_at"]
    )

# ==================== AIRTABLE ROUTES ====================

# Master List (Main Clients/Cases)
@airtable_router.get("/master-list")
async def get_master_list(
    view: Optional[str] = None,
    filter_by: Optional[str] = None,
    max_records: int = Query(default=100, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """Get all records from Master List table"""
    params = []
    if view:
        params.append(f"view={view}")
    if filter_by:
        params.append(f"filterByFormula={filter_by}")
    params.append(f"maxRecords={max_records}")
    
    query = "&".join(params) if params else ""
    endpoint = f"Master%20List?{query}" if query else "Master%20List"
    
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", []), "offset": result.get("offset")}

@airtable_router.get("/master-list/{record_id}")
async def get_master_list_record(record_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific record from Master List"""
    result = await airtable_request("GET", f"Master%20List/{record_id}")
    return result

@airtable_router.post("/master-list")
async def create_master_list_record(record: AirtableRecordCreate, current_user: dict = Depends(get_current_user)):
    """Create a new record in Master List"""
    result = await airtable_request("POST", "Master%20List", {"fields": record.fields})
    return result

@airtable_router.patch("/master-list/{record_id}")
async def update_master_list_record(record_id: str, record: AirtableRecordUpdate, current_user: dict = Depends(get_current_user)):
    """Update a record in Master List"""
    result = await airtable_request("PATCH", f"Master%20List/{record_id}", {"fields": record.fields})
    return result

@airtable_router.delete("/master-list/{record_id}")
async def delete_master_list_record(record_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a record from Master List"""
    await airtable_request("DELETE", f"Master%20List/{record_id}")
    return {"status": "deleted", "id": record_id}

# Search across tables
@airtable_router.get("/search")
async def search_records(
    query: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user)
):
    """Search records in Master List by Matter Name, Client, Email Address, or Phone Number"""
    try:
        # Search formula using correct Airtable field names
        search_query = query.replace("'", "\\'")  # Escape single quotes
        filter_formula = f"OR(SEARCH(LOWER('{search_query}'), LOWER({{Matter Name}})), SEARCH(LOWER('{search_query}'), LOWER({{Client}})), SEARCH(LOWER('{search_query}'), LOWER({{Email Address}})), SEARCH(LOWER('{search_query}'), LOWER({{Phone Number}})))"
        encoded_filter = filter_formula.replace(" ", "%20").replace("{", "%7B").replace("}", "%7D").replace("'", "%27").replace(",", "%2C")
        endpoint = f"Master%20List?filterByFormula={encoded_filter}&maxRecords=20"
        result = await airtable_request("GET", endpoint)
        return {"records": result.get("records", [])}
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        return {"records": [], "error": str(e)}

# Dates & Deadlines
@airtable_router.get("/dates-deadlines")
async def get_dates_deadlines(
    filter_by: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all dates and deadlines"""
    endpoint = "Dates%20%26%20Deadlines"
    if filter_by:
        endpoint += f"?filterByFormula={filter_by}"
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

@airtable_router.post("/dates-deadlines")
async def create_date_deadline(data: DateDeadlineCreate, current_user: dict = Depends(get_current_user)):
    """Create a new date/deadline"""
    # Try common field name variations
    fields = {
        "Name": data.title,  # Common alt for Title
        "Date": data.date,
    }
    if data.type:
        fields["Type"] = data.type
    if data.case_id:
        fields["Master List"] = [data.case_id]
    if data.notes:
        fields["Notes"] = data.notes
    
    try:
        result = await airtable_request("POST", "Dates%20%26%20Deadlines", {"fields": fields})
        return result
    except HTTPException as e:
        # If Name doesn't work, try Title
        if "Unknown field" in str(e.detail):
            fields["Title"] = fields.pop("Name", data.title)
            return await airtable_request("POST", "Dates%20%26%20Deadlines", {"fields": fields})
        raise

# Case Contacts
@airtable_router.get("/case-contacts")
async def get_case_contacts(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get case contacts, optionally filtered by case"""
    endpoint = "Case%20Contacts"
    if case_id:
        endpoint += f"?filterByFormula=FIND('{case_id}', {{Master List}})"
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

@airtable_router.post("/case-contacts")
async def create_case_contact(data: CaseContactCreate, current_user: dict = Depends(get_current_user)):
    """Create a new case contact"""
    fields = {
        "Name": data.name,
    }
    # Only include optional fields if provided
    if data.role:
        fields["Contact Type"] = data.role  # Common alt for Role
    if data.phone:
        fields["Phone"] = data.phone
    if data.email:
        fields["Email"] = data.email
    if data.case_id:
        fields["Master List"] = [data.case_id]
    if data.notes:
        fields["Notes"] = data.notes
    
    result = await airtable_request("POST", "Case%20Contacts", {"fields": fields})
    return result

# Assets & Debts
@airtable_router.get("/assets-debts")
async def get_assets_debts(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get assets and debts"""
    endpoint = "Assets%20%26%20Debts"
    if case_id:
        endpoint += f"?filterByFormula=FIND('{case_id}', {{Master List}})"
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

# Case Tasks
@airtable_router.get("/case-tasks")
async def get_case_tasks(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get case tasks"""
    try:
        endpoint = "Case%20Tasks"
        if case_id:
            endpoint += f"?filterByFormula=FIND('{case_id}', {{Master List}})"
        result = await airtable_request("GET", endpoint)
        return {"records": result.get("records", [])}
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Case Tasks table not found or not accessible")
            return {"records": [], "warning": "Case Tasks table not found in Airtable"}
        raise

@airtable_router.post("/case-tasks")
async def create_case_task(data: TaskCreate, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    fields = {
        "Name": data.title,  # Try Name first as common field
        "Status": data.status,
    }
    if data.priority:
        fields["Priority"] = data.priority
    if data.description:
        fields["Description"] = data.description
    if data.due_date:
        fields["Due Date"] = data.due_date
    if data.case_id:
        fields["Master List"] = [data.case_id]
    if data.assigned_to:
        fields["Assigned To"] = data.assigned_to
    
    try:
        result = await airtable_request("POST", "Case%20Tasks", {"fields": fields})
        return result
    except HTTPException as e:
        if e.status_code == 422 and "Unknown field" in str(e.detail):
            # Try with Title instead of Name
            fields["Title"] = fields.pop("Name", data.title)
            return await airtable_request("POST", "Case%20Tasks", {"fields": fields})
        raise

@airtable_router.patch("/case-tasks/{record_id}")
async def update_case_task(record_id: str, record: AirtableRecordUpdate, current_user: dict = Depends(get_current_user)):
    """Update a task"""
    result = await airtable_request("PATCH", f"Case%20Tasks/{record_id}", {"fields": record.fields})
    return result

# Judge Information
@airtable_router.get("/judge-information")
async def get_judge_information(current_user: dict = Depends(get_current_user)):
    """Get judge information"""
    result = await airtable_request("GET", "Judge%20Information")
    return {"records": result.get("records", [])}

# Mail
@airtable_router.get("/mail")
async def get_mail(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get mail records"""
    try:
        endpoint = "Mail"
        if case_id:
            endpoint += f"?filterByFormula=FIND('{case_id}', {{Master List}})"
        result = await airtable_request("GET", endpoint)
        return {"records": result.get("records", [])}
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Mail table not found or not accessible")
            return {"records": [], "warning": "Mail table not found in Airtable"}
        raise

@airtable_router.post("/mail")
async def create_mail(data: MailCreate, current_user: dict = Depends(get_current_user)):
    """Create a mail record"""
    fields = {
        "Name": data.recipient,  # Try Name as common field
        "Subject": data.subject,
        "Status": data.status,
        "Date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
    if data.body:
        fields["Body"] = data.body
    if data.case_id:
        fields["Master List"] = [data.case_id]
    
    try:
        result = await airtable_request("POST", "Mail", {"fields": fields})
        return result
    except HTTPException as e:
        if e.status_code == 422 and "Unknown field" in str(e.detail):
            # Try Recipient instead
            fields["Recipient"] = fields.pop("Name", data.recipient)
            return await airtable_request("POST", "Mail", {"fields": fields})
        raise

# Documents
@airtable_router.get("/documents")
async def get_documents(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get documents"""
    endpoint = "Documents"
    if case_id:
        endpoint += f"?filterByFormula=FIND('{case_id}', {{Master List}})"
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

# Call Log
@airtable_router.get("/call-log")
async def get_call_log(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get call log"""
    endpoint = "Call%20Log"
    if case_id:
        endpoint += f"?filterByFormula=FIND('{case_id}', {{Matter}})"
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

# Invoice
@airtable_router.get("/invoices")
async def get_invoices(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get invoices"""
    try:
        endpoint = "Invoice"
        if case_id:
            endpoint += f"?filterByFormula=FIND('{case_id}', {{Master List}})"
        result = await airtable_request("GET", endpoint)
        return {"records": result.get("records", [])}
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Invoice table not found or not accessible")
            return {"records": [], "warning": "Invoice table not found in Airtable"}
        raise

@airtable_router.post("/invoices")
async def create_invoice(data: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    """Create an invoice"""
    fields = {
        "Name": data.client_name,  # Try Name as common field
        "Amount": data.amount,
        "Status": data.status,
        "Date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
    if data.description:
        fields["Description"] = data.description
    if data.case_id:
        fields["Master List"] = [data.case_id]
    if data.due_date:
        fields["Due Date"] = data.due_date
    
    try:
        result = await airtable_request("POST", "Invoice", {"fields": fields})
        return result
    except HTTPException as e:
        if e.status_code == 422 and "Unknown field" in str(e.detail):
            # Try Client Name instead
            fields["Client Name"] = fields.pop("Name", data.client_name)
            return await airtable_request("POST", "Invoice", {"fields": fields})
        raise

# Payments
@airtable_router.get("/payments")
async def get_payments(current_user: dict = Depends(get_current_user)):
    """Get payment records"""
    try:
        result = await airtable_request("GET", "Payments")
        return {"records": result.get("records", [])}
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Payments table not found or not accessible")
            return {"records": [], "warning": "Payments table not found in Airtable"}
        raise

# Add Lead
@airtable_router.post("/leads")
async def create_lead(data: LeadCreate, current_user: dict = Depends(get_current_user)):
    """Create a new lead in Master List"""
    fields = {
        "Name": data.name,  # Try Name first (most common)
        "Case Type": "Lead",
    }
    if data.email:
        fields["Email"] = data.email
    if data.phone:
        fields["Phone Number"] = data.phone
    if data.lead_type:
        fields["Lead Type"] = data.lead_type
    if data.referral_source:
        fields["Referral Source"] = data.referral_source
    if data.inquiry_notes:
        fields["Inquiry Notes"] = data.inquiry_notes
    
    try:
        result = await airtable_request("POST", "Master%20List", {"fields": fields})
        return result
    except HTTPException as e:
        if e.status_code == 422 and "Unknown field" in str(e.detail):
            # Try Matter instead of Name
            fields["Matter"] = fields.pop("Name", data.name)
            return await airtable_request("POST", "Master%20List", {"fields": fields})
        raise

# Add Client
@airtable_router.post("/clients")
async def create_client(data: ClientCreate, current_user: dict = Depends(get_current_user)):
    """Create a new client in Master List"""
    fields = {
        "Name": data.name,  # Try Name first
    }
    if data.email:
        fields["Email"] = data.email
    if data.phone:
        fields["Phone Number"] = data.phone
    if data.address:
        fields["Address"] = data.address
    if data.case_type:
        fields["Case Type"] = data.case_type
    
    try:
        result = await airtable_request("POST", "Master%20List", {"fields": fields})
        return result
    except HTTPException as e:
        if e.status_code == 422 and "Unknown field" in str(e.detail):
            # Try Client instead of Name
            fields["Client"] = fields.pop("Name", data.name)
            return await airtable_request("POST", "Master%20List", {"fields": fields})
        raise

# ==================== WEBHOOK ROUTES ====================

@webhooks_router.post("/send-case-update")
async def send_case_update(payload: WebhookPayload, current_user: dict = Depends(get_current_user)):
    """Placeholder webhook for sending case updates"""
    logger.info(f"Case update webhook triggered with data: {payload.data}")
    return {"status": "success", "message": "Case update sent (placeholder)", "data": payload.data}

@webhooks_router.post("/upload-file")
async def upload_file_webhook(payload: WebhookPayload, current_user: dict = Depends(get_current_user)):
    """Placeholder webhook for uploading files to client portal"""
    logger.info(f"File upload webhook triggered with data: {payload.data}")
    return {"status": "success", "message": "File upload initiated (placeholder)", "data": payload.data}

class SendCSARequest(BaseModel):
    record_id: str
    first_name: str
    email_address: str
    recommended_service: Optional[str] = None

@webhooks_router.post("/send-csa")
async def send_csa_webhook(data: SendCSARequest, current_user: dict = Depends(get_current_user)):
    """Send CSA webhook to Zapier and update Date CSA Sent in Airtable"""
    zapier_url = "https://hooks.zapier.com/hooks/catch/19553629/uylp8dn/"
    
    # Prepare webhook payload
    webhook_payload = {
        "First Name": data.first_name,
        "Email Address": data.email_address,
        "Record ID": data.record_id,
        "Recommended Service": data.recommended_service or ""
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Send webhook to Zapier
            response = await client.post(zapier_url, json=webhook_payload)
            response.raise_for_status()
            logger.info(f"CSA webhook sent successfully for record {data.record_id}")
            
            # Update Date CSA Sent in Airtable with current datetime
            current_datetime = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            await airtable_request("PATCH", f"Master%20List/{data.record_id}", {
                "fields": {"Date CSA Sent": current_datetime}
            })
            
            return {
                "status": "success",
                "message": "CSA sent successfully",
                "date_sent": current_datetime
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"Zapier webhook failed: {e.response.text}")
            raise HTTPException(status_code=500, detail=f"Failed to send CSA: {e.response.text}")
        except Exception as e:
            logger.error(f"CSA webhook error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to send CSA: {str(e)}")

# ==================== GENERAL ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Illinois Estate Law Staff Portal API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Dashboard data endpoint
@airtable_router.get("/dashboard")
async def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    """Get dashboard data: consultations, stats and upcoming deadlines"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    thirty_days_later = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Get total active cases (Type of Case is not "Lead" AND Active/Inactive is "Active")
    total_active_cases = 0
    try:
        filter_formula = "AND({Type of Case}!='Lead', {Active/Inactive}='Active')"
        encoded_filter = filter_formula.replace(" ", "%20").replace("{", "%7B").replace("}", "%7D").replace("'", "%27").replace(",", "%2C").replace("!", "%21").replace("=", "%3D")
        cases_result = await airtable_request("GET", f"Master%20List?filterByFormula={encoded_filter}&maxRecords=1000")
        total_active_cases = len(cases_result.get("records", []))
    except Exception as e:
        logger.warning(f"Failed to get active cases count: {str(e)}")
    
    # Get consultations (upcoming and past 30 days)
    consultations = []
    try:
        consult_filter = f"AND({{Date of Consult}}!='', IS_AFTER({{Date of Consult}}, '{thirty_days_ago}'), IS_BEFORE({{Date of Consult}}, '{thirty_days_later}'))"
        encoded_consult = consult_filter.replace(" ", "%20").replace("{", "%7B").replace("}", "%7D").replace("'", "%27").replace(",", "%2C").replace("!", "%21").replace("=", "%3D")
        consult_result = await airtable_request("GET", f"Master%20List?filterByFormula={encoded_consult}&maxRecords=50&sort%5B0%5D%5Bfield%5D=Date%20of%20Consult&sort%5B0%5D%5Bdirection%5D=asc")
        consultations = consult_result.get("records", [])
    except Exception as e:
        logger.warning(f"Failed to get consultations: {str(e)}")
    
    # Get upcoming deadlines for next 30 days from Dates & Deadlines table
    deadlines = []
    try:
        deadline_filter = f"AND(IS_AFTER({{Date}}, '{today}'), IS_BEFORE({{Date}}, '{thirty_days_later}'))"
        encoded_deadline = deadline_filter.replace(" ", "%20").replace("{", "%7B").replace("}", "%7D").replace("'", "%27").replace(",", "%2C")
        deadlines_result = await airtable_request("GET", f"Dates%20%26%20Deadlines?filterByFormula={encoded_deadline}&maxRecords=20&sort%5B0%5D%5Bfield%5D=Date&sort%5B0%5D%5Bdirection%5D=asc")
        deadlines = deadlines_result.get("records", [])
        
        # Resolve linked client names
        client_ids = set()
        for d in deadlines:
            add_client = d.get("fields", {}).get("Add Client", [])
            if add_client and isinstance(add_client, list):
                client_ids.update(add_client)
        
        # Fetch client names if we have IDs
        client_names = {}
        if client_ids:
            for client_id in client_ids:
                try:
                    client_record = await airtable_request("GET", f"Master%20List/{client_id}")
                    client_names[client_id] = client_record.get("fields", {}).get("Matter Name") or client_record.get("fields", {}).get("Client") or "Unknown"
                except:
                    client_names[client_id] = "Unknown"
        
        # Add resolved names to deadlines
        for d in deadlines:
            add_client = d.get("fields", {}).get("Add Client", [])
            if add_client and isinstance(add_client, list):
                resolved_names = [client_names.get(cid, "Unknown") for cid in add_client]
                d["fields"]["_resolved_client_names"] = resolved_names
    except Exception as e:
        logger.warning(f"Failed to get deadlines: {str(e)}")
    
    return {
        "total_active_cases": total_active_cases,
        "consultations": consultations,
        "deadlines": deadlines
    }

# Get all active cases for the cases list page
@airtable_router.get("/active-cases")
async def get_active_cases(current_user: dict = Depends(get_current_user)):
    """Get all active cases (not leads, active status)"""
    try:
        filter_formula = "AND({Type of Case}!='Lead', {Active/Inactive}='Active')"
        encoded_filter = filter_formula.replace(" ", "%20").replace("{", "%7B").replace("}", "%7D").replace("'", "%27").replace(",", "%2C").replace("!", "%21").replace("=", "%3D")
        result = await airtable_request("GET", f"Master%20List?filterByFormula={encoded_filter}&maxRecords=500&sort%5B0%5D%5Bfield%5D=Matter%20Name&sort%5B0%5D%5Bdirection%5D=asc")
        return {"records": result.get("records", [])}
    except Exception as e:
        logger.error(f"Failed to get active cases: {str(e)}")
        return {"records": [], "error": str(e)}

# Include routers
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(airtable_router)
app.include_router(webhooks_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
