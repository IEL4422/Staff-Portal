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

### Latest Session (January 16, 2026) - Form Fixes
- **All Action Modal Forms Fixed (COMPLETED)**:
  - Audited all 6 action modal forms for payload key mismatches
  - Fixed `AddAssetDebtModal.js` - was using Airtable field names, now uses camelCase keys
  - Verified all other forms (SendInvoice, AddDeadline, AddContact, AddTask, SendMail) already using correct keys
  - All forms tested and working with 100% pass rate
  - Test Report: `/app/test_reports/iteration_8.json`

### Previous Session (January 15, 2026)
- **File Upload for Assets & Debts (COMPLETED)**:
  - Added file upload capability to the Asset/Debt edit modal
  - Select multiple files and upload to Airtable attachments
  - View existing attachments with download/preview buttons
  - Upload progress indicator with status for each file
  - New backend endpoint: `POST /api/airtable/assets-debts/{record_id}/attachments`

- **ActionModals.js Refactoring (COMPLETED)**:
  - Extracted `AddTaskModal` to `/components/modals/AddTaskModal.js`
  - Extracted `AddAssetDebtModal` to `/components/modals/AddAssetDebtModal.js`
  - Extracted `AddContactModal` to `/components/modals/AddContactModal.js`
  - Updated `modalUtils.js` with shared constants (US_STATE_ABBREVIATIONS, etc.)
  - ActionModals.js now imports from extracted component files

- **Assets & Debts Tab on Estate Planning Detail Page (COMPLETED)**:
  - Added new "Assets & Debts" tab to Estate Planning case detail page
  - Tab shows all assets and debts linked to the case
  - Records sorted by Status='Found' first
  - Clickable rows open detail/edit modal

- **Editable Assets & Debts List Page (COMPLETED)**:
  - Updated `/assets-debts` page with full edit functionality
  - Click any row to open detail modal
  - Edit mode supports all fields: Name of Asset, Status, Type of Asset/Debt, Value, Notes
  - Added Matter field (linked record) with searchable dropdown
  - Search filters matters by name as you type

### Earlier Sessions
- **Edit Assets & Debts Feature (COMPLETED)**: On Probate Detail page, users can edit asset/debt records
- **Code Refactoring (COMPLETED)**:
  - Backend modularization: `/backend/routers/auth.py`, webhooks.py, files.py
  - Utility files: `/backend/utils/cache.py`, airtable.py
  - Frontend components: EditableField, AssetDebtModal, AddRecordModal
- **Mobile Responsive Improvements (COMPLETED)**: Hamburger menu, collapsible sidebar
- **Sidebar Action Modals (COMPLETED)**: All 11 actions converted to pop-up modals

### Full Implementation
- **Dashboard**: Search (Case #, Email, Phone), stats, consultations, deadlines
- **Case Detail Pages**: Probate, Estate Planning, Deed, Lead
- **Action Pages**: Phone Intake, Mail, Invoice, Task, Deadline, Contact, Lead, Client
- **Special Features**: Reviews page with webhooks, Generate Documents, Payments tracking

## Design System
- Primary color: #2E7DA1
- Fonts: Manrope (headings), IBM Plex Sans (body)
- Dark sidebar (#0F172A) with light content area
- Rounded/pill buttons
- Card-based layout

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] User authentication
- [x] Dashboard with enhanced search
- [x] Case detail pages
- [x] All action forms (all 6 forms verified working)
- [x] Reviews page with webhooks
- [x] Generate Documents feature
- [x] Sidebar action modals

### P1 (Important)
- [x] Fix all form submission issues - **COMPLETED** (January 16, 2026)
- [x] Edit Assets & Debts feature - **COMPLETED**
- [ ] Loading states for form submissions

### P2 (Nice to Have - Refactoring)
- [x] Mobile responsive improvements - **COMPLETED**
- [x] Extract modal components from ActionModals.js - **PARTIAL**
- [ ] Complete backend router migration (move remaining routes from server.py)
- [ ] Continue ProbateCaseDetail.js refactoring
- [ ] Bulk actions on cases
- [ ] Email notifications
- [ ] Calendar view for deadlines

## Known Issues
- **Airtable API Permissions**: API key has insufficient privileges for schema modifications (affects dropdown option creation)

## Key Files
- `/app/backend/server.py` - Main backend API
- `/app/backend/routers/` - Modular router files
- `/app/frontend/src/components/ActionModals.js` - Action modal forms
- `/app/frontend/src/components/modals/` - Extracted modal components
- `/app/frontend/src/pages/` - Page components

## Test Credentials
- **Admin:** `contact@illinoisestatelaw.com` / `IEL2024!`
- **Staff 1:** `brittany@illinoisestatelaw.com` / `IEL2026!`
- **Staff 2:** `jessica@illinoisestatelaw.com` / `IEL2026!`
