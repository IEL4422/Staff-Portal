# Illinois Estate Law Staff Portal - PRD

## Original Problem Statement
Build a staff portal for Illinois Estate Law (an estate planning and probate law firm). The portal integrates with Airtable as a database and acts as a client management system.

## What's Been Implemented

### Latest Session (January 30, 2026) - Auto-Complete & Auto-Create Task Features

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
- Toast notification confirms task creation with the task name and due date

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

### P1 (Important)
- [ ] Probate detail page contact edit functionality (currently has view-only modal)
- [ ] Loading states for form submissions

### P2 (Nice to Have)
- [ ] Complete backend router migration
- [ ] Calendar view for deadlines
- [ ] Email notifications
- [ ] Inform user about Airtable API key `schema.bases:write` permission needed for creating new select options
