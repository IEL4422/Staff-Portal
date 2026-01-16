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

### Latest Session (January 16, 2026) - Mobile Optimization
- **Mobile Responsive Optimization (COMPLETED)**:
  - Enhanced mobile header with icon-only navigation (text labels hidden on mobile)
  - Full-screen mobile search overlay with larger touch targets
  - Horizontal scrollable stat cards on mobile
  - Card-based layouts for tables on mobile (Contacts, Assets, Tasks, Documents, Deadlines)
  - Mobile-optimized sidebar with larger touch targets and proper safe area padding
  - Full-width modals on mobile with sticky headers/footers
  - Improved tab navigation (horizontal scroll on mobile, icon + count display)
  - Mobile-friendly forms with larger input fields
  - Desktop site remains unchanged

- **All Action Modal Forms Fixed (COMPLETED)**:
  - Audited all 6 action modal forms for payload key mismatches
  - Fixed `AddAssetDebtModal.js` - was using Airtable field names, now uses camelCase keys
  - Verified all other forms (SendInvoice, AddDeadline, AddContact, AddTask, SendMail) already using correct keys
  - All forms tested and working with 100% pass rate
  - Test Report: `/app/test_reports/iteration_8.json`

### Previous Session (January 15, 2026)
- **File Upload for Assets & Debts (COMPLETED)**
- **ActionModals.js Refactoring (COMPLETED)**
- **Assets & Debts Tab on Estate Planning Detail Page (COMPLETED)**
- **Editable Assets & Debts List Page (COMPLETED)**

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

## Mobile Responsive Breakpoints
- **Mobile**: < 640px (sm breakpoint)
- **Tablet**: 640px - 1023px
- **Desktop**: >= 1024px (lg breakpoint)

## Prioritized Backlog

### P0 (Critical) - ALL COMPLETED
- [x] User authentication
- [x] Dashboard with enhanced search
- [x] Case detail pages
- [x] All action forms
- [x] Reviews page with webhooks
- [x] Generate Documents feature
- [x] Sidebar action modals
- [x] Mobile responsive optimization

### P1 (Important)
- [x] Fix all form submission issues - **COMPLETED**
- [x] Edit Assets & Debts feature - **COMPLETED**
- [x] Mobile optimization - **COMPLETED**
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

## Key Files Modified for Mobile
- `/app/frontend/src/App.css` - Enhanced mobile CSS styles
- `/app/frontend/src/components/Header.js` - Mobile-friendly navigation
- `/app/frontend/src/components/Sidebar.js` - Mobile sidebar improvements
- `/app/frontend/src/components/ActionModal.js` - Full-width mobile modals
- `/app/frontend/src/pages/Dashboard.js` - Mobile card layouts
- `/app/frontend/src/pages/ProbateCaseDetail.js` - Mobile-friendly tabs and tables

## Test Credentials
- **Admin:** `contact@illinoisestatelaw.com` / `IEL2024!`
- **Staff 1:** `brittany@illinoisestatelaw.com` / `IEL2026!`
- **Staff 2:** `jessica@illinoisestatelaw.com` / `IEL2026!`
