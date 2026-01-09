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

### Latest Session (January 9, 2026)
- **Generate Documents Feature (NEW)**: Created a new "Generate Documents" page accessible from the sidebar under Actions. Includes three document types:
  - **Court Order**: Basic form with matter search and additional notes
  - **Quit Claim Deed**: Full form with Grantor info (conditional Grantor 2 for married couples/individuals), Grantee info (conditional Grantee Language for trusts/LLCs with example text), and Property info
  - **Legal Letter**: Basic form with matter search and additional notes
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

### P1 (Important)
- [x] Better error messages for form submissions (improved)
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
- `/app/frontend/src/pages/ReviewsPage.js` - Reviews management
- `/app/frontend/src/pages/ProbateCaseDetail.js` - Probate case details
- `/app/frontend/src/pages/TasksPage.js` - Tasks list
- `/app/frontend/src/pages/LeadsPage.js` - Leads list

## Test Credentials
- **Admin:** `contact@illinoisestatelaw.com` / `IEL2024!`
- **Staff 1:** `brittany@illinoisestatelaw.com` / `IEL2026!`
- **Staff 2:** `jessica@illinoisestatelaw.com` / `IEL2026!`
