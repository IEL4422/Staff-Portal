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
    recipientName: Optional[str] = None
    whatIsBeingMailed: str
    matterId: Optional[str] = None
    streetAddress: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None
    mailingSpeed: Optional[str] = None
    sendToIrs: Optional[str] = None
    fileUrl: Optional[str] = None
    fileName: Optional[str] = None

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
    event: str
    date: str
    matterId: str
    notes: Optional[str] = None
    allDayEvent: Optional[bool] = False
    invitee: Optional[str] = None
    location: Optional[str] = None

class CaseContactCreate(BaseModel):
    name: str
    type: str
    streetAddress: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None
    relationshipToDecedent: Optional[str] = None
    disabledMinor: Optional[bool] = False
    matterId: Optional[str] = None

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

# ==================== TASK COMPLETION DATES ====================
# Store task completion dates in MongoDB

@api_router.get("/task-dates/{case_id}")
async def get_task_dates(case_id: str, current_user: dict = Depends(get_current_user)):
    """Get all task completion dates for a case"""
    try:
        task_dates = await db.task_completion_dates.find(
            {"case_id": case_id},
            {"_id": 0}
        ).to_list(100)
        # Convert to a dict keyed by task_key for easier lookup
        dates_dict = {td["task_key"]: td for td in task_dates}
        return {"task_dates": dates_dict}
    except Exception as e:
        logger.error(f"Failed to get task dates: {str(e)}")
        return {"task_dates": {}}

@api_router.post("/task-dates/{case_id}")
async def save_task_date(case_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Save a task completion date"""
    try:
        task_key = data.get("task_key")
        status = data.get("status")
        
        if not task_key:
            raise HTTPException(status_code=400, detail="task_key is required")
        
        # Only save date for "Done" or "Not Applicable" status
        if status in ["Done", "Not Applicable", "Yes", "Filed", "Dispatched & Complete"]:
            completion_date = datetime.now(timezone.utc).isoformat()
            
            # Upsert the record
            await db.task_completion_dates.update_one(
                {"case_id": case_id, "task_key": task_key},
                {
                    "$set": {
                        "case_id": case_id,
                        "task_key": task_key,
                        "status": status,
                        "completion_date": completion_date,
                        "updated_by": current_user.get("email"),
                        "updated_at": completion_date
                    }
                },
                upsert=True
            )
            return {"success": True, "completion_date": completion_date}
        else:
            # Remove the date if status is changed to something else
            await db.task_completion_dates.delete_one(
                {"case_id": case_id, "task_key": task_key}
            )
            return {"success": True, "completion_date": None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save task date: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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

# Allowed email domain for registration
ALLOWED_EMAIL_DOMAIN = "@illinoisestatelaw.com"
ADMIN_EMAIL = "contact@illinoisestatelaw.com"

@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Validate email domain
    if not user_data.email.lower().endswith(ALLOWED_EMAIL_DOMAIN.lower()):
        raise HTTPException(
            status_code=400, 
            detail=f"Registration is only allowed for {ALLOWED_EMAIL_DOMAIN} email addresses"
        )
    
    # Check for existing email (case-insensitive)
    existing = await db.users.find_one(
        {"email": {"$regex": f"^{user_data.email}$", "$options": "i"}}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email.lower(),  # Store lowercase for consistency
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
            email=user_data.email.lower(),
            name=user_data.name,
            created_at=datetime.now(timezone.utc)
        )
    )

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Case-insensitive email lookup
    user = await db.users.find_one(
        {"email": {"$regex": f"^{credentials.email}$", "$options": "i"}}, 
        {"_id": 0}
    )
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

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@auth_router.patch("/profile")
async def update_profile(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile (name and/or email)"""
    update_fields = {}
    
    if data.name:
        update_fields["name"] = data.name
    
    if data.email:
        # Check if new email is valid domain
        if not data.email.lower().endswith(ALLOWED_EMAIL_DOMAIN.lower()):
            raise HTTPException(
                status_code=400,
                detail=f"Email must be a {ALLOWED_EMAIL_DOMAIN} address"
            )
        
        # Check if email is already taken by another user
        existing = await db.users.find_one({
            "email": {"$regex": f"^{data.email}$", "$options": "i"},
            "id": {"$ne": current_user["id"]}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        
        update_fields["email"] = data.email.lower()
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_fields}
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    # Generate new token if email changed
    new_token = None
    if data.email:
        new_token = create_token(current_user["id"], data.email.lower())
    
    return {
        "success": True,
        "user": {
            "id": updated_user["id"],
            "email": updated_user["email"],
            "name": updated_user["name"]
        },
        "new_token": new_token
    }

@auth_router.post("/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Change user password"""
    # Get user with password hash
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(data.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    
    # Update password
    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"success": True, "message": "Password changed successfully"}

@auth_router.get("/check-admin")
async def check_admin(current_user: dict = Depends(get_current_user)):
    """Check if current user is admin"""
    is_admin = current_user.get("email", "").lower() == ADMIN_EMAIL.lower()
    return {"is_admin": is_admin}

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
    record_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get dates and deadlines - can filter by formula or fetch specific record_ids (comma-separated)"""
    endpoint = "Dates%20%26%20Deadlines"
    
    if record_ids:
        # Fetch specific records by IDs
        ids = record_ids.split(',')
        formula = "OR(" + ",".join([f"RECORD_ID()='{rid.strip()}'" for rid in ids]) + ")"
        endpoint += f"?filterByFormula={formula}"
    elif filter_by:
        endpoint += f"?filterByFormula={filter_by}"
    
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

@airtable_router.post("/dates-deadlines")
async def create_date_deadline(data: DateDeadlineCreate, current_user: dict = Depends(get_current_user)):
    """Create a new date/deadline"""
    fields = {
        "Event": data.event,
        "Date": data.date,
        "Add Client": [data.matterId]
    }
    
    # Optional fields
    if data.notes:
        fields["Notes"] = data.notes
    if data.allDayEvent:
        fields["All Day Event?"] = data.allDayEvent
    if data.invitee:
        fields["Invitee"] = data.invitee
    if data.location:
        fields["Location"] = data.location
    
    try:
        result = await airtable_request("POST", "Dates%20%26%20Deadlines", {"fields": fields})
        return result
    except HTTPException as e:
        logger.error(f"Failed to create deadline: {str(e)}")
        raise

# Case Contacts
@airtable_router.get("/case-contacts")
async def get_case_contacts(
    case_id: Optional[str] = None,
    record_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get case contacts - can filter by case_id or fetch specific record_ids (comma-separated)"""
    endpoint = "Case%20Contacts"
    
    if record_ids:
        # Fetch specific records by IDs
        ids = record_ids.split(',')
        formula = "OR(" + ",".join([f"RECORD_ID()='{rid.strip()}'" for rid in ids]) + ")"
        endpoint += f"?filterByFormula={formula}"
    elif case_id:
        endpoint += f"?filterByFormula=FIND('{case_id}', {{Master List}})"
    
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

@airtable_router.post("/case-contacts")
async def create_case_contact(data: CaseContactCreate, current_user: dict = Depends(get_current_user)):
    """Create a new case contact"""
    fields = {
        "Name": data.name,
        "Type": [data.type]  # Type is a multi-select field
    }
    
    # Optional fields
    if data.streetAddress:
        fields["Street Address"] = data.streetAddress
    if data.city:
        fields["City"] = data.city
    if data.state:
        fields["State (Abbreviation)"] = data.state
    if data.zipCode:
        fields["Zip Code"] = data.zipCode
    if data.relationshipToDecedent:
        fields["Relationship to Decedent"] = data.relationshipToDecedent
    if data.disabledMinor:
        fields["Disabled/Minor"] = data.disabledMinor
    if data.matterId:
        fields["Master List 2"] = [data.matterId]
    
    try:
        result = await airtable_request("POST", "Case%20Contacts", {"fields": fields})
        return result
    except HTTPException as e:
        logger.error(f"Failed to create case contact: {str(e)}")
        raise

# Assets & Debts
@airtable_router.get("/assets-debts")
async def get_assets_debts(
    case_id: Optional[str] = None,
    record_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get assets and debts - can filter by case_id or fetch specific record_ids (comma-separated)"""
    endpoint = "Assets%20%26%20Debts"
    
    if record_ids:
        # Fetch specific records by IDs
        ids = record_ids.split(',')
        formula = "OR(" + ",".join([f"RECORD_ID()='{rid.strip()}'" for rid in ids]) + ")"
        endpoint += f"?filterByFormula={formula}"
    elif case_id:
        endpoint += f"?filterByFormula=FIND('{case_id}', {{Master List}})"
    
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

class AssetDebtCreate(BaseModel):
    name: str
    asset_type: Optional[str] = None
    asset_or_debt: Optional[str] = "Asset"
    value: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    master_list_id: Optional[str] = None

@airtable_router.post("/assets-debts")
async def create_asset_debt(data: AssetDebtCreate, current_user: dict = Depends(get_current_user)):
    """Create a new asset or debt record"""
    fields = {
        "Name of Asset": data.name,
        "Asset or Debt": data.asset_or_debt or "Asset",
    }
    if data.asset_type:
        fields["Type of Asset"] = data.asset_type
    if data.value is not None:
        fields["Value"] = data.value
    if data.status:
        fields["Status"] = data.status
    if data.notes:
        fields["Notes"] = data.notes
    if data.master_list_id:
        fields["Master List"] = [data.master_list_id]
    
    result = await airtable_request("POST", "Assets%20%26%20Debts", {"fields": fields})
    return result

# Tasks (separate from Case Tasks)
@airtable_router.get("/tasks")
async def get_tasks(
    case_id: Optional[str] = None,
    record_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get tasks from Tasks table - can filter by case_id or fetch specific record_ids (comma-separated)"""
    try:
        endpoint = "Tasks"
        
        if record_ids:
            # Fetch specific records by IDs
            ids = record_ids.split(',')
            formula = "OR(" + ",".join([f"RECORD_ID()='{rid.strip()}'" for rid in ids]) + ")"
            endpoint += f"?filterByFormula={formula}"
        elif case_id:
            endpoint += f"?filterByFormula=FIND('{case_id}', {{Link to Matter}})"
        
        result = await airtable_request("GET", endpoint)
        return {"records": result.get("records", [])}
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Tasks table not found or not accessible")
            return {"records": [], "warning": "Tasks table not found in Airtable"}
        raise

@airtable_router.get("/my-tasks")
async def get_my_tasks(
    current_user: dict = Depends(get_current_user)
):
    """Get tasks assigned to the logged-in user based on email matching Assigned To Contact Email"""
    try:
        user_email = current_user.get("email", "")
        if not user_email:
            return {"records": []}
        
        # Filter by Assigned To Contact Email field
        formula = f"LOWER({{Assigned To Contact Email}})=LOWER('{user_email}')"
        endpoint = f"Tasks?filterByFormula={formula}&sort%5B0%5D%5Bfield%5D=Due%20Date&sort%5B0%5D%5Bdirection%5D=asc"
        
        result = await airtable_request("GET", endpoint)
        return {"records": result.get("records", [])}
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Tasks table not found or not accessible")
            return {"records": [], "warning": "Tasks table not found in Airtable"}
        raise
@airtable_router.get("/unassigned-tasks")
async def get_unassigned_tasks(
    current_user: dict = Depends(get_current_user)
):
    """Get tasks that don't have an assignee (Assigned To is blank)"""
    try:
        # Filter tasks where Assigned To is empty and Status is not Done
        formula = "AND({Assigned To}='',{Status}!='Done')"
        endpoint = f"Tasks?filterByFormula={formula}&sort%5B0%5D%5Bfield%5D=Due%20Date&sort%5B0%5D%5Bdirection%5D=asc"
        
        result = await airtable_request("GET", endpoint)
        return {"records": result.get("records", [])}
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Tasks table not found or not accessible")
            return {"records": [], "warning": "Tasks table not found in Airtable"}
        raise

class TaskCreateNew(BaseModel):
    task: str
    status: Optional[str] = "Not Started"
    priority: Optional[str] = "Normal"
    due_date: Optional[str] = None
    link_to_matter: Optional[str] = None
    assigned_to: Optional[str] = None
    completed: Optional[str] = None
    notes: Optional[str] = None
    file_url: Optional[str] = None

@airtable_router.post("/tasks")
async def create_task(data: TaskCreateNew, current_user: dict = Depends(get_current_user)):
    """Create a new task in the Tasks table"""
    fields = {
        "Task": data.task,
        "Status": data.status or "Not Started",
        "Priority": data.priority or "Normal",
    }
    
    if data.due_date:
        fields["Due Date"] = data.due_date
    if data.link_to_matter:
        fields["Link to Matter"] = [data.link_to_matter]
    if data.assigned_to:
        fields["Assigned To"] = data.assigned_to
    if data.completed:
        fields["Completed?"] = data.completed
    if data.notes:
        fields["Notes"] = data.notes
    if data.file_url:
        fields["Upload File"] = [{"url": data.file_url}]
    
    try:
        result = await airtable_request("POST", "Tasks", {"fields": fields})
        return result
    except HTTPException as e:
        logger.error(f"Failed to create task: {str(e)}")
        raise

@airtable_router.patch("/tasks/{record_id}")
async def update_task(record_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update a task in the Tasks table"""
    try:
        result = await airtable_request("PATCH", f"Tasks/{record_id}", {"fields": data})
        return result
    except HTTPException as e:
        logger.error(f"Failed to update task: {str(e)}")
        raise

@airtable_router.delete("/tasks/{record_id}")
async def delete_task(record_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task from the Tasks table"""
    try:
        result = await airtable_request("DELETE", f"Tasks/{record_id}")
        return {"success": True, "deleted": record_id}
    except HTTPException as e:
        logger.error(f"Failed to delete task: {str(e)}")
        raise

# Case Tasks
@airtable_router.get("/case-tasks")
async def get_case_tasks(
    case_id: Optional[str] = None,
    record_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get case tasks - can filter by case_id or fetch specific record_ids (comma-separated)"""
    try:
        endpoint = "Case%20Tasks"
        
        if record_ids:
            # Fetch specific records by IDs
            ids = record_ids.split(',')
            formula = "OR(" + ",".join([f"RECORD_ID()='{rid.strip()}'" for rid in ids]) + ")"
            endpoint += f"?filterByFormula={formula}"
        elif case_id:
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

# Mail
@airtable_router.get("/mail")
async def get_mail(
    case_id: Optional[str] = None,
    record_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get mail records - can filter by case_id or fetch specific record_ids (comma-separated)"""
    try:
        endpoint = "Mail"
        
        if record_ids:
            # Fetch specific records by IDs
            ids = record_ids.split(',')
            formula = "OR(" + ",".join([f"RECORD_ID()='{rid.strip()}'" for rid in ids]) + ")"
            endpoint += f"?filterByFormula={formula}"
        elif case_id:
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
    fields = {}
    
    # Required field
    fields["What is being mailed?"] = data.whatIsBeingMailed
    
    # Optional fields
    if data.recipientName:
        fields["Recipient Name"] = data.recipientName
    if data.matterId:
        fields["Matter"] = [data.matterId]
    if data.streetAddress:
        fields["Street Address"] = data.streetAddress
    if data.city:
        fields["City"] = data.city
    if data.state:
        fields["State"] = data.state
    if data.zipCode:
        fields["Zip Code"] = data.zipCode
    if data.mailingSpeed:
        fields["Mailing Speed"] = data.mailingSpeed
    if data.sendToIrs:
        fields["Send to IRS"] = data.sendToIrs
    
    # Handle file attachment - Airtable requires URL format for attachments
    if data.fileUrl:
        fields["File"] = [{"url": data.fileUrl, "filename": data.fileName or "uploaded_file"}]
    
    try:
        result = await airtable_request("POST", "Mail", {"fields": fields})
        return result
    except HTTPException as e:
        logger.error(f"Failed to create mail record: {str(e)}")
        raise

# Documents
@airtable_router.get("/documents")
async def get_documents(
    case_id: Optional[str] = None,
    record_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get documents - can filter by case_id or fetch specific record_ids (comma-separated)"""
    endpoint = "Documents"
    
    if record_ids:
        # Fetch specific records by IDs
        ids = record_ids.split(',')
        formula = "OR(" + ",".join([f"RECORD_ID()='{rid.strip()}'" for rid in ids]) + ")"
        endpoint += f"?filterByFormula={formula}"
    elif case_id:
        endpoint += f"?filterByFormula=FIND('{case_id}', {{Master List}})"
    
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

class DocumentCreate(BaseModel):
    name: str
    doc_type: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None
    master_list_id: Optional[str] = None

@airtable_router.post("/documents")
async def create_document(data: DocumentCreate, current_user: dict = Depends(get_current_user)):
    """Create a new document record"""
    fields = {
        "Document Name": data.name,
    }
    if data.date:
        fields["Date"] = data.date
    if data.notes:
        fields["Notes"] = data.notes
    if data.master_list_id:
        fields["Matter"] = [data.master_list_id]
    
    result = await airtable_request("POST", "Documents", {"fields": fields})
    return result

# Call Log
@airtable_router.get("/call-log")
async def get_call_log(
    case_id: Optional[str] = None,
    record_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get call log - can filter by case_id or fetch specific record_ids (comma-separated)"""
    endpoint = "Call%20Log"
    
    if record_ids:
        # Fetch specific records by IDs
        ids = record_ids.split(',')
        formula = "OR(" + ",".join([f"RECORD_ID()='{rid.strip()}'" for rid in ids]) + ")"
        endpoint += f"?filterByFormula={formula}"
    elif case_id:
        endpoint += f"?filterByFormula=FIND('{case_id}', {{Matter}})"
    
    result = await airtable_request("GET", endpoint)
    return {"records": result.get("records", [])}

class CallLogCreate(BaseModel):
    date: Optional[str] = None
    call_summary: Optional[str] = None
    staff_caller: Optional[str] = None
    matter_id: Optional[str] = None

@airtable_router.post("/call-log")
async def create_call_log(data: CallLogCreate, current_user: dict = Depends(get_current_user)):
    """Create a new call log record"""
    fields = {}
    if data.date:
        fields["Date"] = data.date
    else:
        fields["Date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if data.call_summary:
        fields["Call Summary"] = data.call_summary
    if data.staff_caller:
        fields["Staff Caller"] = data.staff_caller
    if data.matter_id:
        fields["Matter"] = [data.matter_id]
    
    result = await airtable_request("POST", "Call%20Log", {"fields": fields})
    return result

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

# Case Updates
@airtable_router.get("/case-updates")
async def get_case_updates(case_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get case updates from Case Updates table"""
    try:
        endpoint = "Case%20Updates"
        if case_id:
            endpoint += f"?filterByFormula=FIND('{case_id}',ARRAYJOIN({{Master List}}))"
        result = await airtable_request("GET", endpoint)
        return {"records": result.get("records", [])}
    except Exception as e:
        logger.error(f"Failed to get case updates: {str(e)}")
        return {"records": [], "error": str(e)}

@airtable_router.post("/case-updates")
async def create_case_update(data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new case update record"""
    try:
        fields = {}
        
        if data.get("message"):
            fields["Message"] = data.get("message")
        if data.get("matter"):
            fields["Master List"] = data.get("matter") if isinstance(data.get("matter"), list) else [data.get("matter")]
        if data.get("method"):
            fields["Method"] = data.get("method")
        if data.get("files"):
            # Files should be an array of attachment objects
            fields["Files"] = data.get("files")
        
        result = await airtable_request("POST", "Case%20Updates", {"fields": fields})
        return {"success": True, "record": result}
    except Exception as e:
        logger.error(f"Failed to create case update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Assets & Debts
@airtable_router.get("/assets-debts")
async def get_assets_debts(case_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get assets and debts from Assets & Debts table"""
    try:
        endpoint = "Assets%20%26%20Debts"
        if case_id:
            endpoint += f"?filterByFormula=FIND('{case_id}',ARRAYJOIN({{Master List}}))"
        result = await airtable_request("GET", endpoint)
        return {"records": result.get("records", [])}
    except Exception as e:
        logger.error(f"Failed to get assets/debts: {str(e)}")
        return {"records": [], "error": str(e)}

@airtable_router.post("/assets-debts")
async def create_asset_debt(data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new asset or debt record"""
    try:
        fields = {}
        
        if data.get("name"):
            fields["Name of Asset"] = data.get("name")
        if data.get("asset_or_debt"):
            fields["Asset or Debt"] = data.get("asset_or_debt")
        if data.get("type_of_asset"):
            fields["Type of Asset"] = data.get("type_of_asset")
        if data.get("type_of_debt"):
            fields["Type of Debt"] = data.get("type_of_debt")
        if data.get("value") is not None:
            fields["Value"] = data.get("value")
        if data.get("status"):
            fields["Status"] = data.get("status")
        if data.get("notes"):
            fields["Notes"] = data.get("notes")
        if data.get("master_list"):
            fields["Master List"] = data.get("master_list") if isinstance(data.get("master_list"), list) else [data.get("master_list")]
        if data.get("attachments"):
            fields["Attachments"] = data.get("attachments")
        
        result = await airtable_request("POST", "Assets%20%26%20Debts", {"fields": fields})
        return {"success": True, "record": result}
    except Exception as e:
        logger.error(f"Failed to create asset/debt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Payments - from Master List
@airtable_router.get("/payments")
async def get_payments(current_user: dict = Depends(get_current_user)):
    """Get payment records from Master List where Amount Paid exists"""
    try:
        # Fetch all records with Amount Paid field
        endpoint = "Master%20List?filterByFormula=NOT({Amount Paid}=BLANK())&sort%5B0%5D%5Bfield%5D=Date%20Paid&sort%5B0%5D%5Bdirection%5D=desc"
        result = await airtable_request("GET", endpoint)
        records = result.get("records", [])
        
        # Process records to extract payment info
        payments = []
        for r in records:
            fields = r.get("fields", {})
            amount = fields.get("Amount Paid", 0)
            date_paid = fields.get("Date Paid")
            matter_name = fields.get("Matter Name", fields.get("Client", "Unknown"))
            
            if amount and amount > 0:
                payments.append({
                    "id": r.get("id"),
                    "matter_name": matter_name,
                    "amount": amount,
                    "date_paid": date_paid,
                    "client": fields.get("Client"),
                    "case_type": fields.get("Type of Case"),
                    "package": fields.get("Package Purchased")
                })
        
        # Sort by date (most recent first)
        payments.sort(key=lambda x: x.get("date_paid") or "", reverse=True)
        
        return {"payments": payments}
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Error fetching payments from Master List")
            return {"payments": [], "warning": "Could not fetch payment data"}
        raise

@airtable_router.get("/payments/stats")
async def get_payment_stats(current_user: dict = Depends(get_current_user)):
    """Get payment statistics - monthly and yearly totals"""
    try:
        # Fetch all records with Amount Paid field
        endpoint = "Master%20List?filterByFormula=NOT({Amount Paid}=BLANK())"
        result = await airtable_request("GET", endpoint)
        records = result.get("records", [])
        
        from collections import defaultdict
        monthly_totals = defaultdict(float)
        yearly_totals = defaultdict(float)
        total_amount = 0
        total_count = 0
        
        for r in records:
            fields = r.get("fields", {})
            amount = fields.get("Amount Paid", 0)
            date_paid = fields.get("Date Paid")
            
            if amount and amount > 0:
                total_amount += amount
                total_count += 1
                
                if date_paid:
                    try:
                        # Parse date (format: YYYY-MM-DD)
                        year = date_paid[:4]
                        month = date_paid[:7]  # YYYY-MM
                        
                        monthly_totals[month] += amount
                        yearly_totals[year] += amount
                    except:
                        pass
        
        # Get current year and month stats
        from datetime import datetime
        current_year = str(datetime.now().year)
        current_month = datetime.now().strftime("%Y-%m")
        
        return {
            "total_amount": total_amount,
            "total_count": total_count,
            "current_month_total": monthly_totals.get(current_month, 0),
            "current_year_total": yearly_totals.get(current_year, 0),
            "monthly_totals": dict(sorted(monthly_totals.items(), reverse=True)),
            "yearly_totals": dict(sorted(yearly_totals.items(), reverse=True))
        }
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Error fetching payment stats")
            return {
                "total_amount": 0,
                "total_count": 0,
                "current_month_total": 0,
                "current_year_total": 0,
                "monthly_totals": {},
                "yearly_totals": {}
            }
        raise

# Get payments without date paid
@airtable_router.get("/payments-without-date")
async def get_payments_without_date(current_user: dict = Depends(get_current_user)):
    """Get active non-lead records that are missing Amount Paid and/or Date Paid"""
    try:
        # Filter for records where:
        # 1. Type of Case is NOT "Lead"
        # 2. Active/Inactive is "Active"
        # 3. Missing Amount Paid OR missing Date Paid
        filter_formula = "AND({Type of Case}!='Lead', {Active/Inactive}='Active', OR({Amount Paid}=BLANK(), {Date Paid}=BLANK()))"
        encoded_filter = filter_formula.replace(" ", "%20").replace("{", "%7B").replace("}", "%7D").replace("'", "%27").replace(",", "%2C").replace("!", "%21").replace("=", "%3D")
        
        endpoint = f"Master%20List?filterByFormula={encoded_filter}&maxRecords=200"
        result = await airtable_request("GET", endpoint)
        records = result.get("records", [])
        
        payments = []
        for r in records:
            fields = r.get("fields", {})
            payments.append({
                "id": r.get("id"),
                "matter_name": fields.get("Matter Name") or fields.get("Client") or "Unknown",
                "amount_paid": fields.get("Amount Paid"),
                "date_paid": fields.get("Date Paid"),
                "package_purchased": fields.get("Package Purchased"),
                "case_type": fields.get("Type of Case"),
                "status": fields.get("Active/Inactive"),
                "email": fields.get("Email Address"),
                "phone": fields.get("Phone Number")
            })
        
        return {"payments": payments}
    except Exception as e:
        logger.error(f"Failed to get payments without date: {str(e)}")
        return {"payments": [], "error": str(e)}

# Get Judge Information
@airtable_router.get("/judge-information")
async def get_judge_information(current_user: dict = Depends(get_current_user)):
    """Get all judge information records"""
    try:
        endpoint = "Judge%20Information?maxRecords=100"
        result = await airtable_request("GET", endpoint)
        records = result.get("records", [])
        
        judges = []
        for r in records:
            fields = r.get("fields", {})
            # Handle Standing Orders attachment
            standing_orders = fields.get("Standing Orders", [])
            standing_orders_url = standing_orders[0].get("url") if standing_orders and len(standing_orders) > 0 else None
            standing_orders_filename = standing_orders[0].get("filename") if standing_orders and len(standing_orders) > 0 else None
            
            # Get Master List linked records
            master_list = fields.get("Master List", [])
            master_list_count = len(master_list) if isinstance(master_list, list) else 0
            
            judges.append({
                "id": r.get("id"),
                "name": fields.get("Name"),
                "county": fields.get("County"),
                "courtroom": fields.get("Courtroom"),
                "calendar": fields.get("Calendar"),
                "email": fields.get("Email"),
                "zoom_information": fields.get("Zoom Information"),
                "standing_orders_url": standing_orders_url,
                "standing_orders_filename": standing_orders_filename,
                "master_list_count": master_list_count,
                "master_list_ids": master_list if isinstance(master_list, list) else [],
                "area_of_law": fields.get("Area of Law"),
                "open_close_on_zoom": fields.get("Open/Close on Zoom?", False),
                "courtesy_copies_needed": fields.get("Courtesy Copies Needed?", False)
            })
        
        # Sort by name
        judges.sort(key=lambda x: x.get("name") or "")
        
        return {"judges": judges}
    except Exception as e:
        logger.error(f"Failed to get judge information: {str(e)}")
        return {"judges": [], "error": str(e)}

# Create Judge
@airtable_router.post("/judge-information")
async def create_judge(data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new judge record"""
    try:
        fields = {}
        
        # Required fields
        if not data.get("name"):
            raise HTTPException(status_code=400, detail="Name is required")
        if not data.get("county"):
            raise HTTPException(status_code=400, detail="County is required")
        if not data.get("courtroom"):
            raise HTTPException(status_code=400, detail="Courtroom is required")
        
        fields["Name"] = data.get("name")
        fields["County"] = data.get("county")
        fields["Courtroom"] = data.get("courtroom")
        
        # Optional fields
        if data.get("calendar"):
            fields["Calendar"] = data.get("calendar")
        if data.get("email"):
            fields["Email"] = data.get("email")
        if data.get("zoom_information"):
            fields["Zoom Information"] = data.get("zoom_information")
        if data.get("standing_orders"):
            fields["Standing Orders"] = data.get("standing_orders")
        if data.get("master_list") and len(data.get("master_list")) > 0:
            fields["Master List"] = data.get("master_list")
        
        result = await airtable_request("POST", "Judge%20Information", {"fields": fields})
        return {"success": True, "record": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create judge: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Update Judge (for linking matters)
@airtable_router.patch("/judge-information/{record_id}")
async def update_judge(record_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update a judge record (used for linking matters)"""
    try:
        fields = {}
        
        # Handle Master List linking - append to existing
        if "master_list" in data:
            # First, get existing master list
            existing = await airtable_request("GET", f"Judge%20Information/{record_id}")
            existing_list = existing.get("fields", {}).get("Master List", [])
            
            new_items = data.get("master_list", [])
            if new_items:
                # Combine existing and new, removing duplicates
                combined = list(set(existing_list + new_items))
                fields["Master List"] = combined
        
        # Handle other fields that might be updated
        if "name" in data:
            fields["Name"] = data.get("name")
        if "county" in data:
            fields["County"] = data.get("county")
        if "courtroom" in data:
            fields["Courtroom"] = data.get("courtroom")
        if "calendar" in data:
            fields["Calendar"] = data.get("calendar")
        if "email" in data:
            fields["Email"] = data.get("email")
        if "zoom_information" in data:
            fields["Zoom Information"] = data.get("zoom_information")
        
        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = await airtable_request("PATCH", f"Judge%20Information/{record_id}", {"fields": fields})
        return {"success": True, "record": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update judge: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Update date paid for a payment
@airtable_router.patch("/payments/{record_id}/date-paid")
async def update_payment_date(record_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update the Date Paid field for a payment record"""
    try:
        date_paid = data.get("date_paid")
        if not date_paid:
            raise HTTPException(status_code=400, detail="date_paid is required")
        
        # Update the record in Airtable
        update_data = {
            "fields": {
                "Date Paid": date_paid
            }
        }
        
        result = await airtable_request("PATCH", f"Master%20List/{record_id}", update_data)
        return {"success": True, "record": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update payment date: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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

# Get all active leads
@airtable_router.get("/active-leads")
async def get_active_leads(current_user: dict = Depends(get_current_user)):
    """Get all active leads (Type of Case = Lead, Active/Inactive = Active)"""
    try:
        filter_formula = "AND({Type of Case}='Lead', {Active/Inactive}='Active')"
        encoded_filter = filter_formula.replace(" ", "%20").replace("{", "%7B").replace("}", "%7D").replace("'", "%27").replace(",", "%2C").replace("!", "%21").replace("=", "%3D")
        result = await airtable_request("GET", f"Master%20List?filterByFormula={encoded_filter}&maxRecords=500&sort%5B0%5D%5Bfield%5D=Date%20of%20Consult&sort%5B0%5D%5Bdirection%5D=desc")
        return {"records": result.get("records", [])}
    except Exception as e:
        logger.error(f"Failed to get active leads: {str(e)}")
        return {"records": [], "error": str(e)}

# Get upcoming tasks for the logged-in user
@airtable_router.get("/upcoming-tasks")
async def get_upcoming_tasks(current_user: dict = Depends(get_current_user)):
    """Get upcoming tasks for the logged-in user (not completed, due soon)"""
    try:
        user_email = current_user.get("email", "")
        admin_email = "contact@illinoisestatelaw.com"
        
        # Build filter to get tasks that are:
        # 1. Not completed (Status != 'Done')
        # 2. Assigned to the user OR unassigned (for admin)
        if user_email.lower() == admin_email.lower():
            # Admin sees all unassigned tasks plus their own
            filter_formula = f"AND({{Status}}!='Done', OR({{Assigned To}}=BLANK(), FIND(LOWER('{user_email}'), LOWER({{Assigned To}}))))"
        else:
            # Regular user sees only their assigned tasks
            filter_formula = f"AND({{Status}}!='Done', FIND(LOWER('{user_email}'), LOWER({{Assigned To}})))"
        
        # URL encode the filter
        encoded_filter = filter_formula.replace(" ", "%20").replace("{", "%7B").replace("}", "%7D").replace("'", "%27").replace(",", "%2C").replace("!", "%21").replace("=", "%3D")
        
        # Get tasks sorted by due date
        endpoint = f"Tasks?filterByFormula={encoded_filter}&maxRecords=50&sort%5B0%5D%5Bfield%5D=Due%20Date&sort%5B0%5D%5Bdirection%5D=asc"
        result = await airtable_request("GET", endpoint)
        tasks = result.get("records", [])
        
        # Resolve linked matter names
        matter_ids = set()
        for t in tasks:
            link_to_matter = t.get("fields", {}).get("Link to Matter", [])
            if link_to_matter and isinstance(link_to_matter, list):
                matter_ids.update(link_to_matter)
        
        # Fetch matter names
        matter_names = {}
        for matter_id in matter_ids:
            try:
                matter_record = await airtable_request("GET", f"Master%20List/{matter_id}")
                matter_names[matter_id] = matter_record.get("fields", {}).get("Matter Name") or matter_record.get("fields", {}).get("Client") or "Unknown"
            except Exception:
                matter_names[matter_id] = "Unknown"
        
        # Add resolved names to tasks
        for t in tasks:
            link_to_matter = t.get("fields", {}).get("Link to Matter", [])
            if link_to_matter and isinstance(link_to_matter, list):
                resolved_names = [matter_names.get(mid, "Unknown") for mid in link_to_matter]
                t["fields"]["_resolved_matter_names"] = resolved_names
                t["fields"]["_matter_id"] = link_to_matter[0] if link_to_matter else None
        
        return {"tasks": tasks}
    except HTTPException as e:
        if e.status_code in [403, 404]:
            logger.warning("Tasks table not found or not accessible")
            return {"tasks": [], "warning": "Tasks table not found in Airtable"}
        raise
    except Exception as e:
        logger.error(f"Failed to get upcoming tasks: {str(e)}")
        return {"tasks": [], "error": str(e)}

# ==================== FILE UPLOAD ROUTES ====================

files_router = APIRouter(prefix="/api/files", tags=["Files"])

@files_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file and return its URL"""
    try:
        # Generate unique filename
        file_ext = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOADS_DIR / unique_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Return relative URL - frontend will prepend the backend URL
        file_url = f"/api/files/{unique_filename}"
        
        logger.info(f"File uploaded: {file.filename} -> {unique_filename}")
        
        return {
            "status": "success",
            "filename": file.filename,
            "stored_filename": unique_filename,
            "url": file_url,
            "size": len(content),
            "content_type": file.content_type
        }
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@files_router.get("/{filename}")
async def get_file(filename: str):
    """Serve uploaded files"""
    from fastapi.responses import FileResponse
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# Include routers
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(airtable_router)
app.include_router(webhooks_router)
app.include_router(files_router)

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
