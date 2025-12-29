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

## What's Been Implemented (December 29, 2025)

### Backend (FastAPI)
- JWT authentication (register, login, /me endpoint)
- Airtable integration with all CRUD operations
- Master List, Case Contacts, Case Tasks, Dates & Deadlines endpoints
- Mail, Invoice, Payments, Documents, Call Log, Judge Info endpoints
- Search functionality across tables
- Dashboard data endpoint
- Webhook placeholders for case updates and file uploads

### Frontend (React + shadcn UI)
- Login/Register page with Illinois Estate Law branding
- Dashboard with:
  - Search functionality
  - Stats cards (Total Cases, Active Probate, Estate Planning, Pending Leads)
  - Recent & Upcoming Consultations
  - Upcoming Deadlines (30 days)
- Case Detail Pages:
  - Probate Case Detail with inline editing
  - Estate Planning Detail
  - Deed Detail
  - Lead Detail
- Action Pages:
  - Phone Call Intake (Tally form embed)
  - Send Case Update (webhook placeholder)
  - Send Mail (Airtable form)
  - Send Invoice (Airtable form)
  - Add Task (Airtable form)
  - Add Date/Deadline (Airtable form)
  - Upload File (webhook placeholder)
  - Add Case Contact (Airtable form)
  - Add Lead (Airtable form)
  - Add Client (Airtable form)
- Payments Page with stats and table
- Dark sidebar with navigation

### Design System
- Primary color: #2E7DA1
- Fonts: Manrope (headings), IBM Plex Sans (body)
- Dark sidebar (#0F172A) with light content area
- Rounded/pill buttons
- Card-based layout

## Prioritized Backlog

### P0 (Critical) - Addressed
- [x] User authentication
- [x] Dashboard with search
- [x] Case detail pages
- [x] All action forms

### P1 (Important) - Partially Addressed
- [ ] Verify Airtable field names match actual schema
- [ ] Better error messages for form submissions
- [ ] Loading states for form submissions

### P2 (Nice to Have)
- [ ] Bulk actions on cases
- [ ] Email notifications
- [ ] Document upload to Airtable
- [ ] Calendar view for deadlines
- [ ] Reports/analytics dashboard
- [ ] Mobile responsive improvements

## Next Tasks
1. Verify Airtable table and field names match the actual schema
2. Add real webhook URLs for case updates and file uploads
3. Implement document viewer in case detail pages
4. Add bulk edit functionality
5. Implement notification system
