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

### Latest Session (January 12, 2026)
- **Sidebar Action Modals (NEW)**: Converted all sidebar action forms into pop-up modals for better UX:
  - Add Client, Add Lead, Add Task, Add Date/Deadline, Add Case Contact, Add Asset/Debt, Phone Call Intake, Send Case Update, Send Invoice, Send Mail, Upload File
  - Users can now perform actions without losing their context on the current page
  - "Generate Documents" remains as page navigation (as intended)
  - Modal system uses React Context (`ActionModalsContext`) for state management
  - All modals tested and working (100% test pass rate)

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
- [ ] Loading states for form submissions
- [ ] Fix Probate "Client Role" update bug (Airtable schema issue)
- [ ] Fix Reviews page webhook buttons (may need Airtable permissions)

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
