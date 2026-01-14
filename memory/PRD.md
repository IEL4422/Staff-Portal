# Illinois Estate Law Staff Portal - PRD

## Original Problem Statement
Build a staff portal for Illinois Estate Law (an estate planning and probate law firm). The portal integrates with Airtable as a database and acts as a client management system. Features include:
- Visually pleasing, modern, simple design with rounded buttons
- Different case detail pages (Leads, Probate, Estate Planning, Deeds)
- Sidebar with action items for client management
- Dashboard with search, consultations, and deadlines

## User Personas
1. **Law Firm Staff** - Primary users managing client cases, deadlines, and communications
2. **Office Manager** - Tracks payments, invoices, and overall case status
3. **Attorneys** - Review case details and client information

## Core Requirements
- User authentication (JWT-based)
- Dashboard with search, stats, consultations, deadlines
- Case detail pages with inline editing
- Action forms for: Phone Intake, Mail, Invoice, Task, Deadline, Contact, Lead, Client
- Payments tracking
- Airtable integration for data storage

## What's Been Implemented

### Latest Session (January 14, 2026)
- **Edit Assets & Debts Feature (COMPLETED)**: On Probate Detail page, users can now edit asset/debt records:
  - Click on any asset/debt row to open detail modal
  - Click "Edit" button to switch to edit mode
  - Modify fields: Name, Asset/Debt type, Status, Value, Type of Asset/Debt, Notes
  - Click "Save" to persist changes to Airtable
  - Bug Fixed: Corrected Airtable field names (`Name of Asset` instead of `Name of Asset/Debt`, `Asset or Debt` instead of `Asset or Debt?`)
  - Testing: 100% pass rate (10/10 backend tests, 10/10 frontend tests)
  - New backend endpoint: `PATCH /api/airtable/assets-debts/{record_id}`

### Session (January 13, 2026)
- **Add Task Modal Bug Fix**: Fixed payload key mismatch in sidebar "Add Task" modal. Frontend was sending Airtable-style keys (`'Task'`, `'Status'`, `'Due Date'`) instead of camelCase keys (`task`, `status`, `due_date`) expected by backend Pydantic model.
- **Task Delete Bug Fix**: Fixed "Failed to delete task" error on All Tasks page. The delete handler was only updating `tasks` state but not `allTasks` state, causing the UI to not reflect the deletion.
- **Assets & Debts Enhancement**: On Probate Detail page:
  - Sorted assets/debts so Status = "Found" appears at the top
  - Made each row clickable to open a detail modal
  - Detail modal shows: Name, Asset/Debt type, Status, Value, Type of Asset/Debt, Notes, and Attachments (with View/Download buttons)
- **Quit Claim Deed Form Enhancement**:
  - Changed "Grantee(s) Name" label to "Grantee Name"
  - Added "Grantee 2 Name" field that conditionally appears when Grantee Designation is "a married couple" or "individuals"
  - Fixed document generation submission by correcting Airtable field names (`"Grantor Name"` and `"Grantee Name"` instead of `"Grantor(s) Name"` and `"Grantee(s) Name"`)
  - Added `grantee_2_name` field to backend model and field mapping
  - Added "County" field to Property Information section
  - Fixed "Grantee Language" field mapping to Airtable
  - Made ALL fields required with proper validation (including conditional fields like Grantor 2, Grantee 2, Grantee Language)
- **Code Refactoring (Phase 1)**:
  - Created `/frontend/src/components/modals/` directory structure for future modal extraction
  - Created `modalUtils.js` with shared constants (form options, US states) and helper functions (getErrorMessage, formatCurrency, formatDate)
  - Created `index.js` with documentation for future refactoring plan
  - Updated `ActionModals.js` to import shared utilities from new modals directory
  - Created `/backend/models/schemas.py` with all Pydantic models extracted
  - Created `/backend/utils/auth.py` with authentication utilities

### Session (January 12, 2026)
- **Sidebar Action Modals (NEW)**: Converted all sidebar action forms into pop-up modals for better UX:
  - Add Client, Add Lead, Add Task, Add Date/Deadline, Add Case Contact, Add Asset/Debt, Phone Call Intake, Send Case Update, Send Invoice, Send Mail, Upload File
  - Users can now perform actions without losing their context on the current page
  - "Generate Documents" remains as page navigation (as intended)
  - Modal system uses React Context (`ActionModalsContext`) for state management
  - All modals tested and working (100% test pass rate)

- **P1 Bug Fixes**:
  - **Probate "Client Role" Bug**: Removed non-existent "Client Role" field from Probate Detail page (field doesn't exist in Airtable schema)
  - **Reviews Webhooks Bug**: Moved webhook calls from direct `no-cors` fetch to backend API endpoints (`/api/webhooks/send-review-request` and `/api/webhooks/send-review-followup`) enabling proper error handling and success toasts
  - **Send Mail Form**: Fixed file attachments and state abbreviation mismatches
  - **Dashboard Consultations**: Updated to sort by most recent and filter to last 30 days
  - **Lead Detail**: Added "Mark as Hired" button and modal
  - **Send Case Update/Upload File/Generate Documents**: Fixed form submissions to correct Airtable tables

### Session (January 9, 2026)
- **Generate Documents Feature**: Created a new "Generate Documents" page accessible from the sidebar under Actions. Includes three document types:
  - **Court Order**: Form with Drafting Date, Matter (searchable), County dropdown, Appearance Purpose, Court Order Language, Case Number, Judge Name. Shows "Matter Information" box with Case Number and Linked Judge when matter is selected.
  - **Quit Claim Deed**: Form with Drafting Date, Grantor info (conditional Grantor 2 for married couples/individuals), Grantee info (conditional Grantee Language for trusts/LLCs with example text), and Property info
  - **Legal Letter**: Form with Drafting Date, Matter (searchable), Recipient Name, Recipient Street Address, Recipient City State Zip, Recipient Email, Summary of Letter
- **Bug Fixes**: Improved error handling for Review page webhook buttons and Probate detail page field updates (now shows specific error messages)
- **Quick Filters for Search**: Added filter buttons (All, Probate, Estate Planning, Lead, Deed) to both Dashboard search and Header global search
- **Enhanced Global Search Results**: Added Case Number (for Probate), Email Address, and Phone Number display in search results

### Previous Session Work
- **Leads Page UI Overhaul**: Two-row layout with larger fonts and prominent action buttons
- **Tasks Page Enhancements**: Added Notes field to each task, clickable matter names navigating to detail pages
- **New Reviews Page**: 
  - Filters for "Completed" non-Lead cases
  - Editable "Review Status" dropdown
  - Toggles for "Review Received?" and "Auto Follow Up"
  - "Send Request" and "Send Follow Up" buttons (Zapier webhooks)
  - "Archive" button to change status to "Archived"
- **Probate Page Enhancements**: Fixed Add Contact form, dynamic Estate Values calculation, Call Log filtering
- **Bug Fixes**: 
  - Add Asset/Debt attachment uploads (Airtable two-step API)
  - Send Invoice form submission
  - Package Purchased dropdown (20 options)
  - Lead Detail "Missed Consult" button

### Backend (FastAPI)
- JWT authentication (register, login, /me endpoint)
- Airtable integration with all CRUD operations
- Master List, Case Contacts, Case Tasks, Dates & Deadlines endpoints
- Mail, Invoice, Payments, Documents, Call Log, Judge Info endpoints
- Search functionality across tables
- Dashboard data endpoint

### Frontend (React + shadcn UI)
- Login/Register page with Illinois Estate Law branding
- Dashboard with search (showing Case #, Email, Phone), stats, consultations, deadlines
- Case Detail Pages: Probate, Estate Planning, Deed, Lead
- Action Pages: Phone Intake, Mail, Invoice, Task, Deadline, Contact, Lead, Client
- Payments Page
- Reviews Page
- Generate Documents Page (Court Order, Quit Claim Deed, Legal Letter)

### Design System
- Primary color: #2E7DA1
- Fonts: Manrope (headings), IBM Plex Sans (body)
- Dark sidebar (#0F172A) with light content area
- Rounded/pill buttons
- Card-based layout

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] User authentication
- [x] Dashboard with enhanced search (Case #, Email, Phone)
- [x] Case detail pages
- [x] All action forms
- [x] Reviews page with webhooks
- [x] Generate Documents feature (Court Order, Quit Claim Deed, Legal Letter)
- [x] Sidebar action modals (all 11 actions converted to pop-ups)

### P1 (Important)
- [x] Better error messages for form submissions (improved)
- [x] Fix Probate "Client Role" update bug - **FIXED** (field doesn't exist in Airtable, removed from UI)
- [x] Fix Reviews page webhook buttons - **FIXED** (moved to backend API with proper error handling)
- [x] Fix Add Task modal "field required" error - **FIXED** (mapped frontend keys to camelCase backend model)
- [x] Fix Task delete on All Tasks page - **FIXED** (updated both `tasks` and `allTasks` state on delete)
- [ ] Loading states for form submissions

### P2 (Nice to Have - Refactoring)
- [ ] Refactor monolithic `server.py` into modular FastAPI routers
- [ ] Refactor large frontend components (ProbateCaseDetail.js, EstatePlanningDetail.js)
- [ ] Bulk actions on cases
- [ ] Email notifications
- [ ] Calendar view for deadlines
- [ ] Reports/analytics dashboard
- [ ] Mobile responsive improvements

## Known Issues
- **Airtable API Permissions**: API key has insufficient privileges for schema modifications (affects dropdown option creation)

## Key Files
- `/app/backend/server.py` - Main backend API
- `/app/frontend/src/pages/Dashboard.js` - Dashboard with search
- `/app/frontend/src/components/Header.js` - Header with global search
- `/app/frontend/src/components/Sidebar.js` - Sidebar with action buttons
- `/app/frontend/src/components/ActionModals.js` - All action modal forms
- `/app/frontend/src/context/ActionModalsContext.js` - Modal state management
- `/app/frontend/src/pages/ReviewsPage.js` - Reviews management
- `/app/frontend/src/pages/ProbateCaseDetail.js` - Probate case details
- `/app/frontend/src/pages/TasksPage.js` - Tasks list
- `/app/frontend/src/pages/LeadsPage.js` - Leads list

## Test Credentials
- **Admin:** `contact@illinoisestatelaw.com` / `IEL2024!`
- **Staff 1:** `brittany@illinoisestatelaw.com` / `IEL2026!`
- **Staff 2:** `jessica@illinoisestatelaw.com` / `IEL2026!`
