# Illinois Estate Law Staff Portal - PRD

## Original Problem Statement
Build a staff portal for Illinois Estate Law (an estate planning and probate law firm). The portal integrates with Airtable as a database and acts as a client management system.

## What's Been Implemented

### Latest Session (January 20, 2026) - Send Invoice UX Fix

**Send Invoice Form UX Enhancement:**
- Fixed the recurring "field required" issue which was a UX clarity problem, not a technical bug
- Root cause: Users typed in the matter search field but didn't click a result to select
- Added clear "No matter selected" warning box (amber) when no matter is selected
- Added "Click to select a matter:" header in the search dropdown
- Updated placeholder text to "Type to search, then click to select..."
- Selected matters now show in green badges with checkmark icons
- Removed browser native `required` attributes from SendInvoicePage.js
- Added `noValidate` to SendInvoicePage.js form

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

### P1 (Important)
- [ ] Loading states for form submissions
- [ ] Estate Planning detail page - same updates as Probate

### P2 (Nice to Have)
- [ ] Complete backend router migration
- [ ] Calendar view for deadlines
- [ ] Email notifications
