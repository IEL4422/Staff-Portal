"""Pydantic models for the Staff Portal API"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    staff = "staff"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProfileUpdate(BaseModel):
    name: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["admin", "staff"] = "staff"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["admin", "staff"]] = None
    is_active: Optional[bool] = None

class AuthHealthResponse(BaseModel):
    auth_provider_connected: bool
    env_vars_present: List[str]
    env_vars_missing: List[str]
    current_user: Optional[UserResponse] = None

# ==================== AIRTABLE MODELS ====================

class AirtableRecord(BaseModel):
    id: str
    fields: Dict[str, Any]
    createdTime: Optional[str] = None

class AirtableRecordCreate(BaseModel):
    fields: Dict[str, Any]

class AirtableRecordUpdate(BaseModel):
    fields: Dict[str, Any]

# ==================== DOMAIN MODELS ====================

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
    service: str
    amount: float
    master_list: Optional[List[str]] = None
    notes: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "Medium"
    case_id: Optional[str] = None
    assigned_to: Optional[str] = None
    status: str = "To Do"

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
    phone: Optional[str] = None
    email: Optional[str] = None
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

class AssetDebtCreate(BaseModel):
    name: str
    asset_or_debt: str
    type_of_asset: Optional[str] = None
    type_of_debt: Optional[str] = None
    value: Optional[float] = None
    status: Optional[str] = None
    master_list_id: Optional[str] = None
    notes: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class DocumentCreate(BaseModel):
    name: str
    master_list_id: Optional[str] = None
    document_url: Optional[str] = None
    document_filename: Optional[str] = None

class DocumentGenerationCreate(BaseModel):
    document_type: str
    matter_id: Optional[str] = None
    drafting_date: Optional[str] = None
    grantor_name: Optional[str] = None
    grantor_designation: Optional[str] = None
    grantor_2_name: Optional[str] = None
    grantor_street_address: Optional[str] = None
    grantor_city_state_zip: Optional[str] = None
    grantee_name: Optional[str] = None
    grantee_designation: Optional[str] = None
    grantee_2_name: Optional[str] = None
    grantee_language: Optional[str] = None
    grantee_street_address: Optional[str] = None
    grantee_city_state_zip: Optional[str] = None
    property_street_address: Optional[str] = None
    property_city_state_zip: Optional[str] = None
    parcel_id_number: Optional[str] = None
    legal_property_description: Optional[str] = None
    county: Optional[str] = None
    appearance_purpose: Optional[str] = None
    court_order_language: Optional[str] = None
    case_number: Optional[str] = None
    judge_name: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_street_address: Optional[str] = None
    recipient_city_state_zip: Optional[str] = None
    recipient_email: Optional[str] = None
    summary_of_letter: Optional[str] = None

class CallLogCreate(BaseModel):
    summary: str
    master_list_id: Optional[str] = None
    call_type: Optional[str] = None

class CaseUpdateCreate(BaseModel):
    matter: List[str]
    message: str
    method: str
    files: Optional[List[Dict[str, str]]] = None

class WebhookPayload(BaseModel):
    data: Dict[str, Any]
