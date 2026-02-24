# IN&OUT Moving - Admin Portal Documentation

## Overview

The Admin Portal is the internal operations hub for IN&OUT Moving staff. It provides tools for managing customers, jobs, team communications, and daily operations. Access is restricted to authenticated staff members with appropriate roles.

---

## Access & Authentication

### Roles and Permissions

| Role | Access Level | Capabilities |
|------|--------------|--------------|
| **Master Admin** | Full system access | All features, user management, audit logs, system settings |
| **Admin** | Administrative access | Customer management, job management, team announcements, reporting |
| **Dispatcher** | Operations access | Job scheduling, crew assignment, customer search, calendar management |
| **Crew** | Limited access | View assigned jobs, team announcements, basic messaging |

### Login
- URL: `/admin`
- Authentication: Email/password via Supabase Auth
- Role verification: Server-side via `get_staff_context()` RPC function

---

## Features

### 1. Dashboard (`/admin`)

The main admin dashboard displays real-time operational data:

**Stats Overview:**
- Jobs Today: Active jobs scheduled for the current date
- Jobs This Week: Total jobs for the current week
- Pending Deposits: Jobs awaiting deposit payment
- Pending Approvals: AI-generated draft jobs needing review
- Active Crew: Staff members currently available
- Jobs In Progress: Moves currently being executed

**Quick Actions:**
- Search Customer: Opens customer search modal
- View Calendar: Navigate to job calendar
- Team Announcements: View/create team announcements

**Alerts Section:**
- Urgent announcements from management
- Overdue callbacks
- Jobs without crew assigned
- Deposit collection reminders

---

### 2. Customer Search

Access: Click "Search Customer" button or press `Ctrl+K` / `Cmd+K`

**Search Methods:**
- **By Name**: Partial or full customer name (case-insensitive)
- **By Phone**: Any format (digits extracted automatically)
- **By Email**: Partial or full email address
- **By Job Number**: Job reference number (e.g., "INO-2026-0001")

**Search Results Display:**
- Customer name and contact information
- Total jobs count
- Last job date
- Quick action buttons: View Profile, Call, Email, View Jobs

**Usage:**
1. Open the search modal
2. Select search type or leave as "All Fields"
3. Enter search term (minimum 2 characters)
4. Click on a result to view full profile

---

### 3. Job Calendar

Access: Dashboard → Calendar button or `/admin` calendar section

**Views:**
- **Month View**: Overview of all jobs with daily counts
- Color-coded by status:
  - Blue: Scheduled
  - Orange: In Progress
  - Green: Completed
  - Red: Cancelled
  - Gray: Lead/Quoted

**Calendar Features:**
- Navigate months with arrow buttons
- "Today" quick-jump button
- Click any job to open Job Details modal
- Visual indicators for:
  - Jobs without crew assigned (warning icon)
  - Jobs missing deposits (dollar icon)
  - Upcoming jobs within 48 hours (clock icon)

**Job Details Modal:**
- Full customer information
- Origin and destination addresses
- Scheduled date and time
- Crew assignment status
- Edit capabilities (click-to-edit):
  - Reschedule date
  - Update status
  - Add internal notes
  - Assign crew members

---

### 4. Team Announcements

Access: Dashboard → Announcements section or bell icon

**Viewing Announcements:**
- Sorted by priority (urgent → important → normal)
- Then by date (newest first)
- Unread announcements highlighted
- Click to mark as read

**Creating Announcements (Admin/Dispatcher only):**
1. Click "New Announcement" button
2. Enter title and content
3. Select priority level:
   - **Normal**: Standard communications
   - **Important**: Requires attention
   - **Urgent**: Critical/time-sensitive
4. Select target roles (who should see this)
5. Optionally attach a file (PDF, images supported)
6. Set expiration date (optional)
7. Click "Post Announcement"

**Attachment Support:**
- Maximum file size: 10MB
- Supported formats: PDF, PNG, JPG, JPEG, GIF, DOC, DOCX
- Files stored in Supabase Storage

---

### 5. Team Messages

Internal staff-to-staff messaging system.

**Features:**
- Send messages to specific staff members
- View message thread history
- High priority flag for urgent messages
- Attachment support
- Read receipts

**Inbox:**
- Unread messages highlighted
- Sorted by date (newest first)
- Reply directly from message view

---

## Database Tables

### Core Tables

| Table | Purpose |
|-------|---------|
| `customers` | Customer profiles and contact information |
| `jobs` | Job records with scheduling and status |
| `users` | User profiles linked to auth |
| `user_roles` | Role assignments for access control |
| `staff_profiles` | Employee details and availability |

### Team Communications

| Table | Purpose |
|-------|---------|
| `team_announcements` | Company-wide announcements |
| `team_announcement_reads` | Tracks who has read each announcement |
| `team_messages` | Staff-to-staff internal messages |

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `draft_jobs` | AI-generated job suggestions pending approval |
| `interactions` | Customer interaction history |
| `call_logs` | Phone call records from Riley AI |
| `ai_summaries` | AI-generated summaries of customer interactions |

---

## RPC Functions

### `search_customers(search_term, search_type)`
Search customers by name, email, phone, or job number.

**Parameters:**
- `search_term`: Text to search for
- `search_type`: 'all', 'name', 'email', 'phone', 'job_number'

**Returns:** Table of matching customers with job statistics

---

### `get_calendar_jobs(start_date, end_date)`
Retrieve jobs for calendar display.

**Parameters:**
- `start_date`: Beginning of date range
- `end_date`: End of date range

**Returns:** Table of jobs with customer info for the date range

---

### `get_admin_dashboard_stats()`
Get real-time dashboard statistics.

**Returns:** JSON object with:
- `jobs_today`
- `jobs_this_week`
- `pending_deposits`
- `pending_approvals`
- `total_customers`
- `unread_messages`
- `active_crew`
- `jobs_in_progress`

---

### `get_unread_announcements_count()`
Get count of unread announcements for current user.

**Returns:** Integer count

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open customer search |
| `Escape` | Close modal |

---

## Security

### Row Level Security (RLS)
All tables have RLS enabled. Policies ensure:
- Staff can only access data appropriate for their role
- Customers cannot access admin data
- Audit trail maintained for sensitive operations

### Authentication Flow
1. User logs in via Supabase Auth
2. `get_staff_context()` verifies staff role
3. Role checked on each protected route
4. Session validated on API calls

---

## Troubleshooting

### "Access Denied" Error
- Verify your account has an admin/dispatcher/crew role assigned
- Check that your session hasn't expired (re-login)
- Contact master admin if role assignment is missing

### Search Not Returning Results
- Ensure minimum 2 characters entered
- Check search type matches your query (name vs phone vs email)
- Verify customer exists in system

### Calendar Not Loading Jobs
- Check date range is valid
- Verify jobs exist in the selected month
- Ensure you have appropriate role permissions

### Announcements Not Appearing
- Check if announcement has expired
- Verify your role is in the target roles list
- Refresh the page to fetch latest data

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-24 | Initial admin portal release |
| | | - Dashboard with real-time stats |
| | | - Customer search (name, phone, email, job number) |
| | | - Monthly job calendar with color-coded status |
| | | - Team announcements with attachments |
| | | - Job details modal with click-to-edit |

---

## Future Enhancements

- [ ] Drag-and-drop job rescheduling
- [ ] Crew availability calendar overlay
- [ ] Automated report generation
- [ ] SMS broadcast to crew
- [ ] Route optimization integration
- [ ] Customer portal link generation

---

## Support

For technical issues or feature requests, contact the development team or create an issue in the project repository.

**Master Admin Contact:** scottmiller@inandoutmovin.com
