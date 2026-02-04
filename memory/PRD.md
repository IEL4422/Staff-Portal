# Illinois Estate Law Staff Portal - PRD

## Original Problem Statement
Build a staff portal for Illinois Estate Law (an estate planning and probate law firm). The portal integrates with Airtable as a database and acts as a client management system.

## What's Been Implemented

### Latest Update (February 4, 2026) - Airtable Array Normalization Fix

**MAJOR FIX: Airtable Linked Records (Arrays) Now Properly Populate**
- Fixed `get_client_bundle` function in `/app/backend/routers/documents.py`
- Added `normalize_value` helper function to handle Airtable field value types:
  - Arrays (linked records) → converted to comma-separated strings
  - Single-item arrays → returns just the item
  - Empty arrays → returns empty string
  - Null/None values → returns empty string
- All computed fields (clientname, casenumber, calendar, etc.) now use `normalize_value`
- This fixes the P0 issue where mapped Airtable fields were not populating in generated documents

**VERIFIED: Dropbox & Slack Integrations Working**
- Dropbox folder listing: 14 folders returned successfully
- Dropbox save functionality: Working (tested via API)
- Slack auth: Verified working with user token
- Slack send-for-approval: Validation working correctly

**Testing Results (February 4, 2026)**
- Backend: 17/17 tests passed (100%)
- Frontend: All E2E flows verified
- Document generation: 21 successful generations in history
- All P0 issues confirmed FIXED

### Previous Update (February 3, 2026) - Template Storage, Mapping & Integrations Fix

**MAJOR FIX: Template File Persistence**
- Templates are now stored in MongoDB as base64 encoded content
- Files automatically restore from MongoDB if missing on disk (survives deployments)
- New endpoints:
  - `POST /api/documents/templates-migrate` - Migrate existing templates to MongoDB
  - `POST /api/documents/templates/{id}/restore` - Manually restore a template file
  - `GET /api/documents/templates-health` - Check health of all templates
  - `GET /api/documents/templates/{id}/health` - Check health of a specific template

**FIXED: Dropbox Integration**
- Updated token to work with Dropbox Business team accounts
- Added `DROPBOX_TEAM_MEMBER_ID` support for team member file access
- Fixed `get_dropbox_client()` to use team member ID consistently across all operations
- Save to Dropbox now working after document generation

**FIXED: Slack Integration**
- Updated to user token (xoxp-) with `chat:write` scope
- Notifications now successfully sent to `#action-required` channel
- Send for approval working correctly

**ENHANCED: Airtable Field Mapping**
- Dynamic field fetching from Airtable Master List (now shows 135 fields)
- Mapping page now shows:
  - **Master List (Airtable)** - All actual column names from Airtable
  - **Computed Fields** - Derived fields like clientcitystatezip, currentdate, etc.
- Fields are sorted alphabetically for easy navigation

**Credentials Updated:**
- Dropbox Token: Updated with `files.metadata.read` scope
- Dropbox Team Member ID: `dbmid:AACmiRiMkDfhRfMcQyfl5Bo72idxNo472nI`
- Slack Token: User token with `chat:write` scope

### Previous Update (February 3, 2026) - Fixes & New Mapping Screen

**UPDATED: Dropbox Token**
- Updated Dropbox access token with new token provided by user
- Added improved error handling for missing `files.metadata.read` permission
- User-friendly error messages now shown when Dropbox app permissions are insufficient

**FIXED: Slack "Send for Review" Channel**
- Fixed the Slack channel configuration to use runtime loading (was being cached at module load time)
- Now correctly reads `SLACK_CHANNEL_ACTION_REQUIRED` from environment at runtime
- Notifications properly sent to `#action-required` channel

**NEW FEATURE: Dedicated Field Mapping Screen**
- New page at `/documents/mapping/:templateId` for managing template field mappings
- Stats dashboard showing total fields, Airtable mapped, Staff Input, and Leave Blank counts
- Search/filter functionality for field names
- Color-coded legend and visual feedback for mapping status
- Save button with unsaved changes indicator
- Help text explaining mapping options
- Back button to return to Documents page
- New API endpoints:
  - `GET /api/documents/templates/:id/mapping` - Get template mapping configuration
  - `POST /api/documents/templates/:id/mapping` - Save mapping directly to template

**UI IMPROVEMENTS:**
- DocumentsPage "Map Fields" button now navigates to dedicated mapping page
- Button shows "Edit Mapping" with green styling when mapping already exists
- Added external link icon to indicate navigation to new page

### Previous Update (February 2, 2026) - Features & Bug Fixes

**NEW FEATURE: Enhanced Generated History UI**
- Added search filter to search documents by template/client name
- Added status filter dropdown (All Status, Success, Failed)
- Added sort order dropdown (Newest First, Oldest First)
- Results count badge updates based on active filters
- Documents display with date, client name, Dropbox status, and download button

**NEW FEATURE: Estate Planning "Complete All" Button**
- Added "Complete All" button to Estate Planning Task Tracker
- Works on both ClientsPage side panel (shows as "All" button) and EstatePlanningDetail page
- Marks all incomplete tasks as Done/Yes in a single API call
- Shows success toast with count of completed tasks
- Button only appears when there are incomplete tasks

**NEW FEATURE: Task Tracker Auto-Create Tasks**
- When a tracker item is marked as "Needed", automatically creates a task in Airtable Tasks table
- Task name mapped from tracker field (e.g., "Initial Orders" → "Draft Initial Orders")
- Due date set to 3 days from today
- Task automatically linked to the case
- Includes sync metadata: `TRACKER_SYNC|matterId|fieldKey|completedValue`

**NEW FEATURE: Task Completion Bi-directional Sync**
- When a task with TRACKER_SYNC metadata is marked as Complete/Done, automatically updates the tracker
- Supports multiple completion statuses: Complete, Completed, Done, Filed, Yes, Dispatched & Complete

**BUG FIX: Airtable Field Mappings Not Applied**
- Fixed auto-loading of mapping profiles when no profile explicitly selected
- Fixed PDF field mappings not being applied (was only checking `mapping.fields`, now also checks `mapping.pdfFields`)
- Fixed value lookup using mapped Airtable field name instead of PDF field name
- Added `variable_source_map` to track variable-to-source mappings

**BUG FIX: Staff Input Priority**
- Airtable data now has priority over saved staff inputs
- Staff input fields only shown when there's NO Airtable data for that field
- `needs_input` correctly set to `false` when Airtable data exists

**ENHANCEMENT: Mapping Profile Management UI**
- Enhanced Mappings tab with better cards showing field counts and mapping type breakdown
- Added Profile View Modal showing all field mappings in a table
- View, Edit, and Delete buttons for each profile

**BUG FIX: UI Improvements**
- Removed confusing "Default mapping" option from profile selector
- Removed "Save to Dropbox" toggle from Step 3 - now only in success modal
- Added "Save All to Dropbox" and "Send All for Review" batch buttons in success modal

### Previous Update (February 2, 2026) - Bug Fixes for Document Generation

**NEW: Success Page with Post-Generation Actions:**
After documents are generated, a success modal appears with options for each document:
- **Save to Dropbox** - Opens folder browser with search to select destination folder
- **Download** - Download the generated document locally  
- **Send to Attorney for Approval** - Sends Slack message to #action-required channel

**NEW: Document Approval Workflow:**
- **Approval Page** (`/document-approval/:approvalId`) - Preview and approve documents
- When "Send to Attorney" is clicked:
  - Creates approval record in MongoDB
  - Sends formatted Slack message to #action-required with document links
  - Each document has a "View & Approve" link
- When attorney clicks "Approve":
  - Updates approval status
  - Creates staff portal notification for drafter
  - Posts approval confirmation to Slack

**NEW: Mapping Modal Improvements:**
- **Default is now "Leave Blank"** (not Staff Input)
- **Three mapping options**: Leave Blank, Staff Input Required, Airtable Field
- **Custom variable names**: When "Staff Input Required" is selected, an input field appears to set a display name (e.g., "Case Number", "Property Value")
- **Named variables saved to database**: Staff entries are saved per client so they don't have to be re-entered
- **Search filter** for field mappings

**NEW: Dropbox Folder Browser:**
- Browse folders hierarchically with back navigation
- Search folders by name
- Select destination folder and save

**Backend Endpoints Added:**
- `GET /api/documents/dropbox/folders` - List Dropbox folders
- `GET /api/documents/dropbox/search` - Search Dropbox folders
- `POST /api/documents/dropbox/save` - Save file to specific folder
- `POST /api/documents/send-for-approval` - Send docs to Slack for approval
- `GET /api/documents/approval/:id` - Get approval details
- `POST /api/documents/approval/:id/approve` - Approve a document
- `GET /api/documents/notifications` - Get user notifications
- `POST /api/documents/notifications/:id/read` - Mark notification read

### Previous Update - Batch Document Generation

**Batch Document Generation Feature:**
- Users can select **multiple templates** at once using checkboxes
- **Consolidated variable form**: All required variables merged and deduplicated
- **Separate output files**: Each template generates its own file
- New backend endpoints:
  - `POST /api/documents/generate-batch` - Generate multiple documents at once
  - `POST /api/documents/get-batch-variables` - Get consolidated variables for batch

### Previous - Document Generation Module Structure
- `POST /api/documents/staff-inputs/{client_id}` - Save staff inputs for a client

**Data Storage (MongoDB):**
- `doc_templates` - Template metadata
- `doc_mapping_profiles` - Variable mappings
- `generated_docs` - Generation history
- `client_staff_inputs` - Staff inputs per client (persisted for reuse)

### Previous Session (January 31, 2026) - Document Generation Module Initial Build
- Nested variables: `{trustees.name}`, `{trustees.email}`

**Client Bundle Fields:**
- Basic: clientname, mattername, decedentname, casenumber, calendar, judge
- Contact: clientemail, clientphone, clientstreetaddress, clientcitystatezip
- Decedent: decedentstreetaddress, decedentcitystatezip, decedentdod, decedentdob
- Lists: executors, guardians, caretakers, trustees, beneficiaries, hpoa, fpoa, contacts, assets, debts

**Integrations:**
- Dropbox integration for automatic file saving (token configured)
- MongoDB storage for templates, profiles, and generation history
- Airtable data fetching with linked record expansion

**Data Storage (MongoDB):**
- `doc_templates` collection: Template metadata including county, case_type, category
- `doc_mapping_profiles` collection: Variable-to-field mappings
- `generated_docs` collection: Generation history and status

### Previous Session (January 30, 2026) - Auto-Complete & Auto-Create Task Features

**Complete All Tasks Button (Probate Task Tracker):**
- Added "Complete All Tasks" button to each section (Pre-Opening, Post-Opening) of the Probate task tracker
- Button appears inside the expanded section, above the task list
- Clicking the button marks all incomplete tasks in that section as complete with the appropriate status:
  - Tasks with "Filed" option → set to "Filed"
  - Tasks with "Dispatched & Complete" option → set to "Dispatched & Complete"  
  - Tasks with "Done" option → set to "Done"
  - Tasks with "Yes" option → set to "Yes"
- Button shows loading state while completing tasks
- After all tasks complete, button changes to "All Tasks Complete" with green styling
- Button disabled when all tasks already complete or while saving

**Auto-Create Task When "Needed":**
- When any task status is changed to "Needed" in the task tracker, a new task record is automatically created in Airtable
- Auto-created task properties:
  - Task name: "{task label} - {matter name}" (e.g., "Initial Orders - Estate of Smith")
  - Due date: 3 days from today
  - Status: "Not Started"
  - Priority: "Normal"
  - Linked to matter: Current case
  - Assigned to: None (blank)
  - Notes: Contains TRACKER_SYNC metadata for sync-back
- Toast notification confirms task creation with the task name and due date

**Task Tracker Sync-Back (NEW):**
- When an auto-created task is marked as "Complete" or "Done", the system automatically updates the original task tracker field
- Sync metadata stored in task Notes field: `TRACKER_SYNC|matterId|fieldKey|completedValue`
- Backend parses metadata and updates Master List record when task is completed
- Frontend shows special toast: "Task completed! Task tracker 'Field Name' updated to 'Done'"
- Works from both Tasks page and Dashboard task completion

### Previous Session (January 26, 2026) - Full Task Tracker in Client Preview Panel

**Full Task Tracker Implementation:**
- Client Preview Panel now shows the **exact same task tracker** as the detail pages
- **Probate Task Tracker** has 3 collapsible sections with individual progress rings:
  - Pre-Opening (9 tasks): Questionnaire, Petition Filed, Initial Orders, Oath and Bond, Waivers of Notice, Affidavit of Heirship, Notice of Petition, Copy of Will Filed, Courtesy Copies
  - Post-Opening (9 tasks): Asset Search, Unclaimed Property, Creditor Notification, EIN Number, Estate Bank Account, Notice of Will Admitted, Letters of Office, Real Estate Bond, Tax Return Info
  - Administration (7 tasks): Estate Accounting, Estate Tax Return, Receipts of Distribution, Final Report, Notice of Closing, Order of Discharge, Estate Closed
- **Estate Planning Task Tracker** has 1 collapsible section with 7 tasks:
  - Questionnaire Completed, Planning Session, Drafting, Client Review, Notarization Session, Physical Portfolio, Trust Funding
- Each section shows completed count and progress percentage
- Status icons (check, clock, circle) based on task status
- All task dropdowns have the same options as detail pages
- Stage dropdown editable for both Probate and Estate Planning

**Previous Updates This Session:**
- Clicking a client in the list opens a slide-in preview panel from the right
- Preview panel shows:
  - Case name with type badge (Probate/Estate Planning/Deed) and status badge (Active/Completed/Archived)
  - Four action buttons: Open Case, Add Task, Close Case, Archive Case
  - Client Information section (name, email, phone, sign up date)
  - Task Progress section with circular progress indicator
  - Current Stage badge
  - Key Tasks checklist specific to case type (Probate shows different tasks than Estate Planning)
- Add Task modal with Task Name (required), Due Date, and Notes fields
- Close Case button sets status to 'Completed'
- Archive Case button sets status to 'Archived'
- Panel closes by clicking X button or clicking backdrop

**Probate Progress Bar Verification:**
- Confirmed progress bar stages match Airtable "Stage (Probate)" field options:
  - Pre-Opening
  - Estate Opened
  - Creditor Notification Period
  - Administration
  - Estate Closed
- Stages are clickable to update case progress

### Previous Session (January 20, 2026) - Send Invoice UX Fix, File Upload & Invoices Page

**Send Invoice Form UX Enhancement:**
- Fixed the recurring "field required" issue which was a UX clarity problem, not a technical bug
- Root cause: Users typed in the matter search field but didn't click a result to select
- Added clear "No matter selected" warning box (amber) when no matter is selected
- Added "Click to select a matter:" header in the search dropdown
- Updated placeholder text to "Type to search, then click to select..."
- Selected matters now show in green badges with checkmark icons
- Removed browser native `required` attributes from SendInvoicePage.js
- Added `noValidate` to SendInvoicePage.js form

**Add Asset/Debt File Upload:**
- Added file upload functionality to Add Asset/Debt form in sidebar modal
- Added file upload to Add Asset/Debt form on Probate detail page
- Added file upload to Add Asset/Debt form on Estate Planning detail page
- Files are uploaded to server then attached to Airtable record via the Attachments field
- Improved Asset/Debt modal fields with proper select options and conditional type fields

**Invoices Page & Send Invoice Enhancements:**
- Created new Invoices page (`/invoices`) accessible from sidebar under Payments
- Invoices page shows: Matter, Service, Amount, Due Date, Paid? columns
- Includes stats cards for Total/Paid/Unpaid invoices
- Search functionality to filter invoices by matter or service
- Added "Due Date" field to Send Invoice form (sidebar modal)
- Added "Send Invoice" button to Probate detail page header
- Added "Send Invoice" button to Estate Planning detail page header
- Send Invoice from detail pages auto-fills the linked matter

### Previous Session (January 19, 2026) - Form Fixes & Probate Detail Page Updates

**Sidebar Forms Fixed:**
- Added `noValidate` to prevent browser validation on all forms
- Case Update modal simplified to only Message and Matter (searchable) fields
- All forms now use custom toast validation messages

**Probate Detail Page Forms Fixed:**
- **Add Contact** - Fixed to correctly pass all fields including matterId
- **Add Document** - Updated to only show Document Name and Document (file upload), auto-links to current matter
- **Add Mail** - Updated with all correct fields: What is being mailed?, Recipient Name, Street Address, City, State (dropdown), Zip Code, Mailing Speed
- **Add Date/Deadline** - Fixed to match sidebar form (Event, Date, Location, Invitee, All-Day checkbox, Notes), auto-links to current matter

**Probate Detail Page Tabs Updated:**
- **Documents tab** - Now shows Document Name and Document file (with download link)
- **Mail tab** - Now shows What is Being Mailed, Recipient, City/State, Mailing Speed, Date

### Previous Sessions
- Mobile optimization (responsive design)
- Form submission fixes for all action modals
- File upload for Assets & Debts
- Assets & Debts tab on Estate Planning page
- Editable Assets & Debts list page

## Key Technical Changes

### Backend Models (server.py)
- `CaseContactCreate`: name, type, phone, email, streetAddress, city, state, zipCode, relationshipToDecedent, matterId
- `DocumentCreate`: name, master_list_id, document_url, document_filename
- `MailCreate`: whatIsBeingMailed, matterId, recipientName, streetAddress, city, state, zipCode, mailingSpeed
- `DateDeadlineCreate`: event, date, matterId, notes, allDayEvent, location, invitee

### Frontend Components
- `/app/frontend/src/pages/ProbateCaseDetail.js` - Updated all modal handlers and tabs
- `/app/frontend/src/components/probate/AddRecordModal.js` - Added checkbox field type
- `/app/frontend/src/components/ActionModals.js` - Added noValidate, simplified Case Update

## Test Credentials
- **Admin:** `contact@illinoisestatelaw.com` / `IEL2024!`
- **Staff 1:** `brittany@illinoisestatelaw.com` / `IEL2026!`
- **Staff 2:** `jessica@illinoisestatelaw.com` / `IEL2026!`

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] All sidebar action forms
- [x] Probate detail page forms (Contact, Document, Mail, Deadline)
- [x] Mobile responsive optimization
- [x] Send Invoice form UX fix (matter selection clarity)
- [x] Add Asset/Debt file upload (sidebar and detail pages)
- [x] Invoices page under Payments
- [x] Due Date field in Send Invoice form
- [x] Send Invoice buttons on detail pages with pre-selected matter
- [x] Estate Planning detail page refactor (all tabs have modals, delete buttons, contact edit)
- [x] Client Preview Panel on Clients page with task tracker and action buttons
- [x] Verify Probate progress bar stages match Airtable options
- [x] Full task tracker in preview panel matching detail pages (3 sections for Probate, 1 for Estate Planning)
- [x] Complete All Tasks button for Probate task tracker sections
- [x] Auto-create task when task status changed to "Needed"
- [x] Task tracker sync-back when auto-created task is completed

### P1 (Important)
- [ ] Probate detail page contact edit functionality (currently has view-only modal)
- [ ] Loading states for form submissions

### P2 (Nice to Have)
- [ ] Complete backend router migration
- [ ] Calendar view for deadlines
- [ ] Email notifications
- [ ] Inform user about Airtable API key `schema.bases:write` permission needed for creating new select options
