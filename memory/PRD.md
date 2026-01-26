# Illinois Estate Law Staff Portal - PRD

## Original Problem Statement
Build a staff portal for Illinois Estate Law (an estate planning and probate law firm). The portal integrates with Airtable as a database and acts as a client management system.

## What's Been Implemented

### Latest Session (January 26, 2026) - Editable Task Tracker & Client Preview Panel

**Editable Task Tracker in Client Preview Panel:**
- Stage/Status dropdown is now fully editable for both Probate and Estate Planning cases
- Probate Stage has 5 options: Pre-Opening, Estate Opened, Creditor Notification Period, Administration, Estate Closed
- Estate Planning Stage has 8 options: Questionnaire, Planning Session, Drafting, Review, Notary Session, Digital & Physical Portfolio, Trust Funding, Completed
- All individual tasks are now editable with appropriate status dropdowns:
  - Probate: 12 tasks with status options (Yes/No, Done/In Progress/Waiting/Not Started/Not Applicable/Needed)
  - Estate Planning: 7 tasks with status options (Yes/No, Done/In Progress/Needed/N/A)
- Task dropdown colors change based on status (green=Done, blue=In Progress, orange=Needed, etc.)
- Progress circle updates dynamically when tasks are changed
- Loading spinner shows while saving changes
- Changes save directly to Airtable via masterListApi.update()

**Client Preview Panel on Clients Page:**
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

### P1 (Important)
- [ ] Probate detail page contact edit functionality (currently has view-only modal)
- [ ] Loading states for form submissions

### P2 (Nice to Have)
- [ ] Complete backend router migration
- [ ] Calendar view for deadlines
- [ ] Email notifications
- [ ] Inform user about Airtable API key `schema.bases:write` permission needed for creating new select options
