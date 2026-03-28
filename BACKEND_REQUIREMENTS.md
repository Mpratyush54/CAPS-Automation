# WorkLog Backend Requirements Document

**Project Name:** WorkLog - Kinetic Work Organization System  
**Date Created:** March 29, 2026  
**Frontend Repository:** CAPS-Automaion-frontend  
**Tech Stack:** React 19, Vite, TailwindCSS, Zustand, Axios

---

## 1. System Overview

WorkLog is a comprehensive work organization and volunteer management system designed to track, manage, and report on volunteer work across multiple wings and committees. The system supports role-based access control with four permission levels and provides real-time dashboards, analytics, and organization management.

### Core Objectives:
- Track volunteer work hours and activities via work logs
- Manage events across wings and committees
- Generate team and organizational reports
- Provide role-based access to features and data
- Enable notifications and communications
- Maintain organizational hierarchy (Wings → Committees → Members)

---

## 2. Role-Based Access Control (RBAC)

### User Roles (Ascending Privilege Order):
1. **Volunteer** - Execution level, can only view and manage own data
2. **Team Lead** - Committee-level management, can manage team data
3. **Admin** - Wing-level management
4. **Super Admin** - Full system access across all wings

### Permission Matrix:

| Permission | Volunteer | Team Lead | Admin | Super Admin |
|-----------|-----------|-----------|-------|------------|
| Add own log | ✓ | ✓ | ✓ | ✓ |
| View own logs | ✓ | ✓ | ✓ | ✓ |
| View team logs | ✗ | ✓ | ✓ | ✓ |
| View all logs | ✗ | ✗ | ✓ | ✓ |
| Approve logs | ✗ | ✓ | ✓ | ✓ |
| View assigned events | ✓ | ✓ | ✓ | ✓ |
| Create committee events | ✗ | ✓ | ✓ | ✓ |
| Create wing events | ✗ | ✗ | ✓ | ✓ |
| Create global events | ✗ | ✗ | ✗ | ✓ |
| View team reports | ✗ | ✓ | ✓ | ✓ |
| View wing reports | ✗ | ✗ | ✓ | ✓ |
| View global reports | ✗ | ✗ | ✗ | ✓ |
| Manage organization | ✗ | ✗ | ✓ | ✓ |
| Send notifications (committee) | ✗ | ✓ | ✓ | ✓ |
| Send notifications (wing) | ✗ | ✗ | ✓ | ✓ |
| Send notifications (global) | ✗ | ✗ | ✗ | ✓ |

---

## 3. Authentication & Authorization

### Login Flow:
- **Endpoint:** `POST /api/auth/login`
- **Request Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "Volunteer|Team Lead|Admin|Super Admin",
      "wing": "string (nullable for Super Admin)",
      "committee": "string (nullable for Admin and above)"
    }
  }
  ```

### Token Management:
- JWT-based authentication
- Token stored in localStorage on frontend
- Token should be included in `Authorization: Bearer <token>` header for all requests
- Implement token refresh mechanism
- Session timeout after inactivity

### Demo Accounts (for testing):
- `volunteer@worklog.io` / `password` - Volunteer role
- `lead@worklog.io` / `password` - Team Lead role
- `admin@worklog.io` / `password` - Admin role
- `superadmin@worklog.io` / `password` - Super Admin role

---

## 4. Database Schema & Data Models

### 4.1 User Model
```
User {
  id: UUID (Primary Key)
  email: String (Unique)
  password: String (hashed)
  name: String
  role: Enum(Volunteer, Team Lead, Admin, Super Admin)
  wing_id: UUID (FK to Wing, nullable for Super Admin)
  committee_id: UUID (FK to Committee, nullable for Admin+)
  created_at: DateTime
  updated_at: DateTime
  is_active: Boolean
  profile: {
    phone: String
    bio: String
    join_date: DateTime
    avatar_url: String
  }
}
```

### 4.2 Wing Model
```
Wing {
  id: UUID (Primary Key)
  name: String (Unique)
  lead_id: UUID (FK to User/Admin responsible)
  description: String
  created_at: DateTime
  updated_at: DateTime
  member_count: Integer (denormalized for performance)
}
```

### 4.3 Committee Model
```
Committee {
  id: UUID (Primary Key)
  wing_id: UUID (FK to Wing, Required)
  name: String
  lead_id: UUID (FK to User/Team Lead)
  description: String
  created_at: DateTime
  updated_at: DateTime
  member_count: Integer (denormalized)
}
```

### 4.4 Work Log Model
```
WorkLog {
  id: UUID (Primary Key)
  user_id: UUID (FK to User - who logged)
  title: String
  description: String
  date: Date
  duration_hours: Integer
  duration_minutes: Integer
  status: Enum(Draft, In Progress, Pending Review, Needs Revision, Completed)
  tag: String (Category: Planning, Docs, Meeting, Development, Testing, etc.)
  wing_id: UUID (FK to Wing)
  committee_id: UUID (FK to Committee)
  created_at: DateTime
  updated_at: DateTime
  submitted_at: DateTime (nullable)
  approved_at: DateTime (nullable)
  approved_by: UUID (FK to User - Team Lead, nullable)
  revision_comment: String (nullable) - Comment from TL if rejected
  
  Indexes:
  - (user_id, date)
  - (status, wing_id)
  - (committee_id, date)
}
```

### 4.5 Event Model
```
Event {
  id: UUID (Primary Key)
  title: String
  description: String
  date: Date
  time: Time
  location: String
  wing_id: UUID (FK to Wing)
  committee_id: UUID (FK to Committee, nullable)
  created_by: UUID (FK to User)
  attendees_count: Integer
  status: Enum(Upcoming, Ongoing, Completed, Cancelled)
  scope: Enum(committee, wing, global) - determines visibility
  created_at: DateTime
  updated_at: DateTime
  
  Indexes:
  - (status, date)
  - (wing_id, date)
  - (committee_id, date)
}
```

### 4.6 Notification Model
```
Notification {
  id: UUID (Primary Key)
  user_id: UUID (FK to User - recipient)
  type: Enum(info, warning, success, event)
  title: String
  body: String
  from_user_id: UUID (FK to User - sender, nullable)
  audience: Enum(personal, committee, wing, global)
  scope_id: UUID (nullable - wing_id or committee_id)
  is_read: Boolean (Default: false)
  created_at: DateTime
  
  Indexes:
  - (user_id, is_read)
  - (user_id, created_at)
}
```

### 4.7 Activity Log Model (for audit trail)
```
ActivityLog {
  id: UUID (Primary Key)
  user_id: UUID (FK to User)
  action: String (e.g., 'log_created', 'log_approved', 'event_registered')
  entity_type: String (WorkLog, Event, etc.)
  entity_id: UUID
  changes: JSON (before/after values)
  created_at: DateTime
  
  Indexes:
  - (user_id, created_at)
  - (entity_type, entity_id)
}
```

---

## 5. Core Features & API Endpoints

### 5.1 Dashboard (`/api/dashboard/*`)

#### GET /api/dashboard/volunteer
Returns volunteer-specific dashboard data:
```json
{
  "hero": {
    "greeting": "string",
    "subtitle": "string"
  },
  "stats": {
    "weekly_hours": number,
    "task_count": number,
    "assigned_events": number
  },
  "my_tasks": [
    {
      "id": "uuid",
      "title": "string",
      "deadline": "date",
      "event": "string (nullable)",
      "status": "Pending|In Progress|Completed"
    }
  ],
  "my_weekly_chart": [
    { "day": "Mon", "hours": number, "tasks": number }
  ]
}
```

#### GET /api/dashboard/team-lead
Returns team lead dashboard with team metrics:
```json
{
  "team_logs": [
    {
      "member": "string",
      "task": "string",
      "time": "string",
      "status": "Completed|In Progress"
    }
  ],
  "pending_approvals": number,
  "team_summary": {
    "total_hours": number,
    "completion_rate": number
  }
}
```

#### GET /api/dashboard/admin
Returns wing-level metrics:
```json
{
  "wing_stats": [
    {
      "wing": "string",
      "members": number,
      "hours": number,
      "logs": number,
      "completion": "percentage"
    }
  ]
}
```

#### GET /api/dashboard/super-admin
Returns global system metrics and charts

---

### 5.2 Work Logs (`/api/logs/*`)

#### POST /api/logs
Create a new work log
```json
{
  "title": "string",
  "description": "string",
  "date": "YYYY-MM-DD",
  "duration_hours": number,
  "duration_minutes": number,
  "tag": "string",
  "committee_id": "uuid",
  "status": "Draft|In Progress|Pending Review"
}
```

#### GET /api/logs
Fetch logs based on role/permissions:
- Query params: `?status=&date_from=&date_to=&committee_id=&user_id=`
- Returns paginated results (20 items default)

#### GET /api/logs/:id
Get single log with full details

#### PATCH /api/logs/:id
Update own log (volunteer)
- Only Draft/In Progress/Needs Revision can be updated
- Cannot change status to Completed (TL only)

#### POST /api/logs/:id/submit
Submit log for review
- Changes status from Draft/In Progress → Pending Review

#### POST /api/logs/:id/approve
Approve log (Team Lead only)
- Changes status to Completed
- Add optional comment

#### POST /api/logs/:id/reject
Reject log with feedback (Team Lead only)
- Changes status to Needs Revision
- Requires comment

#### DELETE /api/logs/:id
Delete log (Draft or In Progress only)

---

### 5.3 Events (`/api/events/*`)

#### POST /api/events
Create event
```json
{
  "title": "string",
  "description": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "location": "string",
  "wing_id": "uuid",
  "committee_id": "uuid (nullable)",
  "attendees_count": number,
  "scope": "committee|wing|global"
}
```

#### GET /api/events
Fetch events based on user's wings/committees
- Query params: `?status=&date_from=&date_to=`
- Returns all events user is assigned to

#### GET /api/events/:id
Get event details

#### PATCH /api/events/:id
Update event (creator or admin only)

#### DELETE /api/events/:id
Delete event (creator or admin only)

#### POST /api/events/:id/register
Register user for event

#### DELETE /api/events/:id/register
Unregister from event

#### GET /api/events/:id/attendees
List registered attendees

---

### 5.4 Reports (`/api/reports/*`)

#### GET /api/reports/team
Get team-level reports (Team Lead+)
```json
{
  "kpi": {
    "total_hours": number,
    "total_logs": number,
    "approval_rate": number,
    "team_efficiency": number
  },
  "weekly_chart": [
    { "week": "W1", "hours": number, "logs": number }
  ],
  "committee_breakdown": [array]
}
```

#### GET /api/reports/wing
Get wing-level reports (Admin+)
- Similar structure to team reports but for entire wing

#### GET /api/reports/global
Get system-wide reports (Super Admin only)

#### GET /api/reports/export
Export reports as CSV/PDF
- Query param: `?format=csv|pdf`

---

### 5.5 Organization/Structure (`/api/organization/*`)

#### GET /api/organization
Fetch organization hierarchy:
```json
{
  "wings": [
    {
      "id": "uuid",
      "name": "string",
      "lead": "string",
      "member_count": number,
      "committees": [
        {
          "id": "uuid",
          "name": "string",
          "lead": "string",
          "member_count": number,
          "members": [
            {
              "id": "uuid",
              "name": "string",
              "email": "string",
              "role": "Volunteer",
              "joined": "date"
            }
          ]
        }
      ]
    }
  ]
}
```

#### POST /api/organization/wings
Create new wing (Super Admin only)

#### PATCH /api/organization/wings/:id
Update wing (Admin+)

#### DELETE /api/organization/wings/:id
Delete wing (Super Admin only)

#### POST /api/organization/committees
Create committee (Admin+)

#### PATCH /api/organization/committees/:id
Update committee (Admin+)

#### DELETE /api/organization/committees/:id
Delete committee (Admin+)

#### POST /api/organization/members/assign
Assign user to committee/wing

#### DELETE /api/organization/members/:user_id
Remove member from committee/wing

---

### 5.6 Notifications (`/api/notifications/*`)

#### GET /api/notifications
Fetch all notifications for logged-in user
- Query params: `?limit=50&offset=0&unread_only=true`
- Returns sorted by created_at DESC

#### PATCH /api/notifications/:id/read
Mark notification as read

#### PATCH /api/notifications/mark-all-read
Mark all notifications as read

#### POST /api/notifications
Send notification (Admin+ only)
```json
{
  "type": "info|event|success|warning",
  "title": "string",
  "body": "string",
  "audience": "personal|committee|wing|global",
  "recipient_ids": ["uuid"] (for personal),
  "scope_id": "uuid (wing or committee id)"
}
```

#### DELETE /api/notifications/:id
Delete single notification

---

### 5.7 User Profile (`/api/users/*`)

#### GET /api/users/me
Get current user profile:
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "role": "string",
  "wing": "string",
  "committee": "string",
  "phone": "string",
  "bio": "string",
  "join_date": "date",
  "avatar_url": "string"
}
```

#### PATCH /api/users/me
Update own profile (limited fields)
- Can update: name, phone, bio
- Cannot change: email, role, wing, committee

#### GET /api/users/:id
Get user profile (visible based on permissions)

#### GET /api/users
List users (Admin+ with filtering)
- Query params: `?role=&wing_id=&committee_id=&limit=50`

#### POST /api/users/:id/change-password
Change password

#### POST /api/users/:id/activity-log
Get activity log for user (audit trail)

---

## 6. Validation Rules

### Work Logs:
- Title: 5-200 characters, required
- Duration: minimum 1 minute, maximum 12 hours per log
- Date: cannot be in future, cannot be more than 90 days old (soft limit)
- Status transitions:
  - Draft → In Progress / Pending Review / Draft
  - In Progress → Pending Review / Draft / In Progress
  - Pending Review → Completed (TL) / Needs Revision (TL)
  - Needs Revision → Pending Review / Draft

### Events:
- Title: 5-100 characters
- Date: must be future date (or current)
- Attendees: 0-10000
- Scope: determined by who created (volunteer → committee, TL → wings, Admin → wing, SuperAdmin → global)

### User Assignment:
- A volunteer belongs to exactly one wing and one committee
- A Team Lead manages one committee under one wing
- An Admin manages one complete wing
- A Super Admin has no wing/committee assignment

---

## 7. Error Handling

### Standard Error Response:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} (optional)
  }
}
```

### Common Error Codes:
- `UNAUTHORIZED` - 401: Not logged in or invalid token
- `FORBIDDEN` - 403: Insufficient permissions
- `NOT_FOUND` - 404: Resource not found
- `VALIDATION_ERROR` - 422: Invalid request data
- `CONFLICT` - 409: Resource already exists
- `SERVER_ERROR` - 500: Internal server error
- `RATE_LIMITED` - 429: Too many requests

---

## 8. Performance & Optimization

### Caching:
- Cache dashboard data for 5 minutes per user
- Cache organization hierarchy for 15 minutes
- Implement cache invalidation on updates

### Database Indexes:
- User: (email), (wing_id, role)
- WorkLog: (user_id, date), (status, wing_id), (committee_id, date)
- Event: (status, date), (wing_id, date), (committee_id, date)
- Notification: (user_id, is_read), (user_id, created_at)

### Query Optimization:
- Implement pagination for all list endpoints (default 20, max 100)
- Use SELECT specific fields, not SELECT *
- Implement lazy loading for nested relationships
- Archive old logs/events after 2 years

### Rate Limiting:
- 100 requests per minute per user
- 30 requests per minute for login endpoint
- 5 requests per minute for bulk operations

---

## 9. Search & Filtering

### Work Logs Search:
- By title (full-text search)
- By status
- By date range
- By committee
- By submitter (for TL+)
- By tag

### Events Search:
- By title (full-text search)
- By status
- By date range
- By location
- By wing/committee

### Organization Search:
- Find users by name/email
- Filter wings/committees

---

## 10. Integration Points

### Frontend to Backend:
- Base URL: `process.env.REACT_APP_API_URL` (default: http://localhost:3000)
- All requests use `Content-Type: application/json`
- Include `Authorization: Bearer <token>` header
- CORS should allow frontend domain

### External Services (optional for future):
- Email service for notifications
- File storage (S3/GCS) for exports and avatars
- Analytics service for reporting

---

## 11. Security Requirements

### Authentication:
- Hash passwords using bcrypt (min 10 rounds)
- Implement JWT with 24-hour expiry
- Refresh token mechanism for extending sessions
- Log failed login attempts

### Authorization:
- Validate permissions on every request
- Implement row-level security (users see only their wing/committee data)
- Audit trails for sensitive operations

### Data Protection:
- All endpoints require HTTPS in production
- Implement CORS restrictions
- SQL injection prevention via parameterized queries
- XSS protection
- CSRF tokens for state-changing requests

### Password Policy:
- Minimum 8 characters
- At least one uppercase, lowercase, number, special character
- No password reuse (last 5 passwords)
- Account lockout after 5 failed attempts (30 min)

---

## 12. Testing Requirements

### Unit Tests:
- All business logic functions
- Permission checking
- Validation functions

### Integration Tests:
- All API endpoints with various roles
- Permission enforcement
- Data isolation per role

### Load Testing:
- Dashboard endpoint: should handle 1000+ concurrent users
- Report generation: complete in < 30 seconds

---

## 13. Deployment & DevOps

### Environment Variables:
```
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=<random_secret>
JWT_EXPIRES_IN=24h
NODE_ENV=production
API_PORT=3000
API_URL=https://api.worklog.io
FRONTEND_URL=https://worklog.io
```

### Database:
- PostgreSQL 12+ recommended
- Run migrations on startup
- Automated backups (daily)
- Connection pooling (25-50 connections)

### Monitoring:
- Log all API requests with response times
- Alert on error rates > 1%
- Monitor database connection pool usage
- Track critical business metrics (logs approved, events created, etc.)

---

## 14. Timeline & Milestones

### Phase 1 (Week 1-2): Core Infrastructure
- Database setup and schema
- Authentication system (login, JWT)
- User and role management

### Phase 2 (Week 3-4): Core Features
- Work logs CRUD + approval workflow
- Events CRUD
- Organization hierarchy

### Phase 3 (Week 5-6): Advanced Features
- Reporting and analytics
- Notifications system
- Dashboard aggregations

### Phase 4 (Week 7-8): Polish & Release
- Performance optimization
- Security hardening
- Documentation and testing
- Production deployment

---

## 15. Frontend Technology Stack (Reference)

- **Framework:** React 19
- **Routing:** React Router DOM 7
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Charts:** Recharts
- **Styling:** TailwindCSS, PostCSS
- **Icons:** Lucide React
- **Build Tool:** Vite

---

## Contact & Questions

For clarifications on requirements, please consult with the frontend team at the repository: `d:\CAPS-Automaion-frontend`

**System Name:** WorkLog  
**Project Title:** Kinetic Work Organization System  
**Document Version:** 1.0  
**Last Updated:** March 29, 2026

