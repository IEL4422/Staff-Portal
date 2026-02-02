# Illinois Estate Law Staff Portal - PRD

## Original Problem Statement
Build a staff portal for Illinois Estate Law (an estate planning and probate law firm). The portal integrates with Airtable as a database and acts as a client management system.

## What's Been Implemented

### Latest Update (February 2, 2026) - Bug Fixes for Document Generation

**BUG FIX 1: PDF Document Generation "Loading Variables" Issue**
- Fixed frontend useEffect for batch variables that was getting stuck in "Loading variables..." state
- Root cause: async state updates were not properly handling cancellation when dependencies changed
- Solution: Added cancellation flag pattern in useEffect to prevent stale state updates
- Updated UI logic to show "All fields ready - no input required!" when no variables need input (batchVariables.some(v => v.needs_input) is false)
- PDF templates with unmapped fields (set to "Leave Blank") now correctly show ready state

**BUG FIX 2: Dropbox Folder Browser Error Handling**
- Added proper error handling for expired Dropbox access tokens
- Backend now returns 401 with clear error message: "Dropbox access token has expired. Please generate a new token..."
- Frontend shows user-friendly toast message instead of silently failing
- Both `loadDropboxFolders` and `searchDropboxFolders` functions handle auth errors

**Files Modified:**
- `/app/frontend/src/pages/GenerateDocumentsPage.js` - useEffect fix, UI logic update, Dropbox error handling
- `/app/backend/routers/documents.py` - Expired token detection in dropbox/folders and dropbox/search endpoints

### Previous Update (February 1, 2026) - Document Generation Success Flow & Approvals

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
