# WorkLog Backend Design Doc

**Project:** WorkLog  
**Date:** March 29, 2026  
**Backend Stack:** Node.js, MongoDB, Redis  
**Frontend State:** React app in this repo currently runs on mock data

---

## 1. Purpose

This document is the backend contract for the current frontend, not a generic backend note.

It covers:

- every major frontend page currently implemented
- the backend entities each page needs
- API endpoints required for those pages
- request body/query/header format for each endpoint
- role and scope rules the backend must enforce

The current frontend has material requirements across:

- login/auth
- dashboard
- logs
- events
- analytics/stats
- report center
- organization directory
- notifications
- profile/security

The previous backend doc was incomplete for dashboard, report center, event workspace, notifications, organization management, and profile flows. This version fills those gaps.

---

## 2. Scope Model

### 2.1 Core Rule

Wing and committee must be treated as parallel labels, not a strict parent-child dependency in operational records.

Every scoped record may store:

- `wingId`
- `committeeId`

Both are optional independently unless a specific workflow requires one.

Allowed combinations:

- only `wingId`
- only `committeeId`
- both
- neither for global/system records

### 2.2 Role Scope Rules

- `Volunteer`
  - belongs to one assigned wing and one assigned committee
  - may only create/edit own logs
  - sees only assigned events and own notifications/profile
- `Team Lead`
  - belongs to one assigned wing and one assigned committee
  - approves logs inside owned committee scope
  - submits weekly reports for owned team scope
  - may create/manage committee events
- `Admin`
  - usually wing-scoped
  - may create wing events
  - may view wing-wide logs, reports, notifications, directory
  - may manually choose wing/committee in some create flows
- `Super Admin`
  - global access
  - may create global events
  - may manage wings, users, role assignments, system-level reports

### 2.3 Scope Inheritance Rules

For writes:

- volunteer and team lead log creation must ignore client-supplied `wingId` and `committeeId`; backend derives them from authenticated user
- volunteer event photo uploads inherit event scope, not arbitrary user input
- team lead weekly report submission is constrained to lead-owned scope
- admin and super admin may provide explicit `wingId` and/or `committeeId` where allowed

---

## 3. Frontend Pages and Required Backend Support

### 3.1 Login

Frontend file: `src/pages/Login.jsx`

Needs:

- credential authentication
- user role
- assigned wing and committee labels
- access token and refresh strategy

### 3.2 Dashboard

Frontend file: `src/pages/Dashboard.jsx`

Needs role-specific dashboard payloads:

- volunteer dashboard
- team lead dashboard
- admin dashboard
- super admin dashboard

### 3.3 Logs

Frontend file: `src/pages/Logs.jsx`

Needs:

- own log CRUD
- team log review workflow
- admin/global log listing
- status filtering
- search
- approval and revision comments

### 3.4 Events

Frontend file: `src/pages/Events.jsx`

Needs:

- event CRUD
- role-based field locking
- event workspace
- event report draft/update
- event photo uploads with Google Drive sync tracking

### 3.5 Stats

Frontend file: `src/pages/Reports.jsx`

Needs:

- KPI summaries
- weekly hours/log charts
- 6-month trend chart
- contribution table
- label 1 / label 2 / global filters
- export data source

### 3.6 Report Center

Frontend file: `src/pages/ReportCenter.jsx`

Needs:

- weekly report listing
- derived monthly / 3-month / 6-month / yearly report listing
- weekly report submission
- missing report visibility
- MOM listing and lifecycle

### 3.7 Organization

Frontend file: `src/pages/Organization.jsx`

Needs:

- team directory entries storing `labelOne` and `labelTwo`
- member add/edit/remove
- team add/edit/remove
- role assignment support

### 3.8 Notifications

Frontend file: `src/pages/Notifications.jsx`

Needs:

- inbox list
- unread state
- mark-read actions
- mark-all-read action
- manual notification send with audience targeting
- system-generated notifications from jobs

### 3.9 Profile

Frontend file: `src/pages/Profile.jsx`

Needs:

- current profile read
- limited self-update
- avatar upload support
- personal summary metrics
- recent activity
- password change
- 2FA placeholder-compatible backend contract
- delete account flow if product keeps it

---

## 4. Data Model

Use MongoDB collections with `ObjectId` primary keys and `createdAt` / `updatedAt` timestamps unless noted.

### 4.1 `users`

```json
{
  "_id": "ObjectId",
  "name": "Alex Rivera",
  "email": "alex@example.com",
  "passwordHash": "string",
  "role": "Volunteer | Team Lead | Admin | Super Admin",
  "primaryWingId": "ObjectId | null",
  "primaryCommitteeId": "ObjectId | null",
  "isActive": true,
  "profile": {
    "phone": "string | null",
    "bio": "string | null",
    "joinDate": "Date | null",
    "avatarUrl": "string | null"
  },
  "security": {
    "twoFactorEnabled": false,
    "lastPasswordChangedAt": "Date | null"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Indexes:

- unique `email`
- `{ role: 1, primaryWingId: 1 }`
- `{ primaryCommitteeId: 1 }`

### 4.2 `wings`

```json
{
  "_id": "ObjectId",
  "name": "Tech Wing",
  "description": "string | null",
  "leadUserId": "ObjectId | null",
  "isActive": true,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 4.3 `committees`

```json
{
  "_id": "ObjectId",
  "name": "Dev Board",
  "description": "string | null",
  "leadUserId": "ObjectId | null",
  "isActive": true,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 4.4 `teamDirectories`

This drives the Organization page and explicitly supports the frontend language of `labelOne` and `labelTwo`.

```json
{
  "_id": "ObjectId",
  "labelOneWingId": "ObjectId | null",
  "labelTwoCommitteeId": "ObjectId | null",
  "labelOneName": "Tech Wing",
  "labelTwoName": "Dev Board",
  "leadUserId": "ObjectId | null",
  "focus": "Development and delivery",
  "memberCount": 4,
  "isActive": true,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 4.5 `workLogs`

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "title": "string",
  "description": "string | null",
  "workDate": "Date",
  "durationMinutes": 150,
  "tag": "string | null",
  "status": "Draft | In Progress | Pending Review | Needs Revision | Completed",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "scopeSource": "inherited_user_scope | manually_selected_scope",
  "submittedAt": "Date | null",
  "approvedAt": "Date | null",
  "approvedBy": "ObjectId | null",
  "revisionComment": "string | null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Indexes:

- `{ userId: 1, workDate: -1 }`
- `{ committeeId: 1, workDate: -1 }`
- `{ wingId: 1, workDate: -1 }`
- `{ status: 1, submittedAt: -1 }`

### 4.6 `events`

```json
{
  "_id": "ObjectId",
  "title": "string",
  "description": "string | null",
  "eventDate": "Date",
  "startTime": "string | null",
  "location": "string | null",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "scope": "committee | wing | mixed | global",
  "status": "Upcoming | Ongoing | Completed | Cancelled",
  "createdBy": "ObjectId",
  "attendeeCount": 0,
  "assignedRoleVisibility": ["Volunteer", "Team Lead", "Admin", "Super Admin"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 4.7 `eventReports`

```json
{
  "_id": "ObjectId",
  "eventId": "ObjectId",
  "status": "Not Started | Draft | Ready | Published",
  "ownerUserId": "ObjectId | null",
  "summary": "string",
  "lastUpdatedAt": "Date | null",
  "publishedAt": "Date | null",
  "publishedBy": "ObjectId | null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Unique index:

- `{ eventId: 1 }`

### 4.8 `driveFiles`

```json
{
  "_id": "ObjectId",
  "eventId": "ObjectId",
  "uploadedBy": "ObjectId",
  "fileName": "string",
  "mimeType": "string",
  "sizeBytes": 12345,
  "storageProvider": "google_drive",
  "googleFileId": "string | null",
  "folderId": "string | null",
  "folderUrl": "string | null",
  "status": "Pending Sync | Syncing | Synced | Failed",
  "retryCount": 0,
  "uploadedAt": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 4.9 `weeklyReports`

```json
{
  "_id": "ObjectId",
  "weekKey": "2026-W13",
  "teamDirectoryId": "ObjectId | null",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "title": "Weekly execution summary",
  "submittedBy": "ObjectId",
  "status": "Draft | Submitted | Approved | Missing",
  "source": "Manual",
  "hours": 54,
  "highlights": "string | null",
  "generatedFrom": null,
  "submittedAt": "Date | null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Unique index:

- `{ weekKey: 1, wingId: 1, committeeId: 1 }`

### 4.10 `periodReports`

```json
{
  "_id": "ObjectId",
  "periodType": "Monthly | 3 Months | 6 Months | Yearly",
  "periodKey": "Mar 2026",
  "teamDirectoryId": "ObjectId | null",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "title": "Monthly team summary",
  "status": "Generated | Published",
  "source": "Auto",
  "generatedFrom": "2026-W09 to 2026-W12",
  "hours": 187,
  "sourceWeeklyReportIds": ["ObjectId"],
  "createdAt": "Date",
  "updatedAt": "Date",
  "generatedAt": "Date"
}
```

### 4.11 `moms`

```json
{
  "_id": "ObjectId",
  "title": "Volunteer coordination sync",
  "meetingDate": "Date",
  "teamDirectoryId": "ObjectId | null",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "preparedBy": "ObjectId",
  "status": "Draft | Under Review | Published",
  "attendees": ["string"],
  "agenda": ["string"],
  "notes": ["string"],
  "actionItems": [
    {
      "text": "Prepare report",
      "ownerUserId": "ObjectId | null",
      "dueDate": "Date | null"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 4.12 `notifications`

```json
{
  "_id": "ObjectId",
  "type": "info | warning | success | event",
  "title": "string",
  "body": "string",
  "recipientUserId": "ObjectId",
  "read": false,
  "fromUserId": "ObjectId | null",
  "fromLabel": "System | Media Sync Worker | Report Engine | User Name",
  "fromRoleLabel": "System | Volunteer | Team Lead | Admin | Super Admin",
  "audienceLabel": "string",
  "sourceType": "manual | system | report_job | media_sync | log_review",
  "sourceRef": {
    "entityType": "workLog | event | eventReport | weeklyReport | periodReport | mom | null",
    "entityId": "ObjectId | null"
  },
  "createdAt": "Date"
}
```

Indexes:

- `{ recipientUserId: 1, read: 1, createdAt: -1 }`

### 4.13 `activityLogs`

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "action": "string",
  "entityType": "workLog | event | notification | user | report | mom",
  "entityId": "ObjectId | null",
  "summary": "string",
  "metadata": {},
  "createdAt": "Date"
}
```

---

## 5. API Conventions

### 5.1 Base Rules

- all APIs under `/api`
- all requests use `Content-Type: application/json` unless file upload
- auth header:

```http
Authorization: Bearer <access_token>
```

- list responses should support:
  - `page`
  - `pageSize`
  - `sortBy`
  - `sortOrder`

### 5.2 Standard Success Envelope

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 5.3 Standard Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "fields": {
      "title": "Title is required"
    }
  }
}
```

---

## 6. Authentication APIs

### 6.1 `POST /api/auth/login`

Purpose:

- sign in from Login page

Request body:

```json
{
  "email": "lead@worklog.io",
  "password": "password"
}
```

Needs:

- `email`
- `password`

Response:

```json
{
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt",
    "user": {
      "id": "user_id",
      "name": "Alex Rivera",
      "email": "lead@worklog.io",
      "role": "Team Lead",
      "wing": {
        "id": "wing_id",
        "name": "Tech Wing"
      },
      "committee": {
        "id": "committee_id",
        "name": "Dev Board"
      }
    }
  }
}
```

### 6.2 `POST /api/auth/refresh`

Request body:

```json
{
  "refreshToken": "jwt"
}
```

### 6.3 `POST /api/auth/logout`

Request body:

```json
{
  "refreshToken": "jwt"
}
```

---

## 7. Dashboard APIs

The frontend currently renders by role. Backend can expose one consolidated endpoint or role-specific endpoints. Preferred API:

### 7.1 `GET /api/dashboard`

Query params:

- `roleView=auto|volunteer|team-lead|admin|super-admin`
- `dateFrom=YYYY-MM-DD` optional
- `dateTo=YYYY-MM-DD` optional

No body.

Response shape:

```json
{
  "data": {
    "role": "Team Lead",
    "hero": {
      "greeting": "Good morning",
      "subtitle": "Your team's daily report is waiting."
    },
    "kpis": [],
    "sections": {}
  }
}
```

### 7.2 Volunteer dashboard data requirements

Backend must provide:

- `myHoursWeek`
- `myTaskCount`
- `assignedEventsCount`
- `myTasks`
- `weeklyHoursChart`

Example section:

```json
{
  "data": {
    "role": "Volunteer",
    "hero": {
      "greeting": "Good morning",
      "subtitle": "Ready to log your work today?"
    },
    "kpis": [
      { "key": "myHoursWeek", "label": "My Hours (Week)", "value": 14, "unit": "h" },
      { "key": "myTaskCount", "label": "My Tasks", "value": 3 },
      { "key": "assignedEventsCount", "label": "Events Assigned", "value": 2 }
    ],
    "sections": {
      "myTasks": [
        {
          "id": "task_id",
          "title": "Prepare onboarding doc",
          "deadline": "2026-03-30",
          "eventTitle": "Volunteer Drive",
          "status": "Pending"
        }
      ],
      "weeklyHoursChart": [
        { "day": "Mon", "hours": 5, "tasks": 3 }
      ]
    }
  }
}
```

### 7.3 Team lead dashboard data requirements

Backend must provide:

- `teamMembersCount`
- `teamHoursWeek`
- `pendingTasksCount`
- `logsSubmittedCount`
- `teamLogsToday`
- `committeeHoursWeekChart`
- `pendingApprovalsCount`

### 7.4 Admin dashboard data requirements

Backend must provide:

- `wingMembers`
- `committeesCount`
- `wingHoursWeek`
- `activeEvents`
- `committeePerformanceRows`

### 7.5 Super admin dashboard data requirements

Backend must provide:

- `totalMembers`
- `totalHoursWeek`
- `activeWings`
- `globalEvents`
- `organizationWideHoursWeekChart`
- `wingOverviewRows`

---

## 8. Work Log APIs

Frontend file: `src/pages/Logs.jsx`

### 8.1 `GET /api/logs`

Purpose:

- table list
- status counters
- search/filter
- role-based list view

Query params:

- `scope=me|team|wing|global`
- `status=Draft|In Progress|Pending Review|Needs Revision|Completed`
- `search=string`
- `dateFrom=YYYY-MM-DD`
- `dateTo=YYYY-MM-DD`
- `wingId=...`
- `committeeId=...`
- `userId=...`
- `page=1`
- `pageSize=20`

No body.

Response:

```json
{
  "data": {
    "rows": [
      {
        "id": "log_id",
        "submitter": {
          "id": "user_id",
          "name": "Riya Gupta"
        },
        "title": "Frontend Bug Fixes",
        "date": "2026-03-24",
        "hours": 2,
        "minutes": 30,
        "durationLabel": "2h 30m",
        "tag": "Development",
        "wing": { "id": "wing_id", "name": "Tech Wing" },
        "committee": { "id": "committee_id", "name": "Dev Board" },
        "status": "Needs Revision",
        "description": "string",
        "tlComment": "Screenshots required as evidence.",
        "isOwn": false
      }
    ],
    "counters": {
      "Draft": 1,
      "In Progress": 2,
      "Pending Review": 5,
      "Needs Revision": 1,
      "Completed": 7
    }
  },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 16
  }
}
```

### 8.2 `GET /api/logs/:id`

No body.

Response must include full detail for the view modal.

### 8.3 `POST /api/logs`

Purpose:

- create new log

Request body:

```json
{
  "title": "Sprint Planning Review",
  "description": "Agenda and outcomes",
  "workDate": "2026-03-26",
  "hours": 2,
  "minutes": 30,
  "tag": "Planning",
  "status": "Draft",
  "wingId": "optional_for_admin_or_super_admin",
  "committeeId": "optional_for_admin_or_super_admin"
}
```

Needs:

- `title`
- `workDate`
- `hours` and/or `minutes`
- `status`

Rules:

- volunteer/team lead supplied `wingId` and `committeeId` must be ignored
- backend stores duration as total minutes

### 8.4 `PATCH /api/logs/:id`

Purpose:

- edit existing own log before completion

Request body format is same as create, partial updates allowed:

```json
{
  "title": "Documentation Update",
  "description": "Updated API notes",
  "hours": 1,
  "minutes": 0,
  "status": "Pending Review"
}
```

### 8.5 `POST /api/logs/:id/submit`

Purpose:

- explicit submit for review

Request body:

```json
{
  "submissionNote": "optional"
}
```

### 8.6 `POST /api/logs/:id/approve`

Purpose:

- team lead/admin approval

Request body:

```json
{
  "comment": "Approved."
}
```

### 8.7 `POST /api/logs/:id/reject`

Purpose:

- request revision

Request body:

```json
{
  "comment": "Please add the agenda items and outcomes discussed."
}
```

Needs:

- `comment`

### 8.8 `DELETE /api/logs/:id`

No body.

Allowed only for own `Draft` or `Needs Revision` logs unless product later expands it.

---

## 9. Event APIs

Frontend file: `src/pages/Events.jsx`

### 9.1 `GET /api/events`

Purpose:

- event cards
- status filter chips

Query params:

- `status=Upcoming|Ongoing|Completed|Cancelled`
- `scope=assigned|team|wing|global`
- `dateFrom=YYYY-MM-DD`
- `dateTo=YYYY-MM-DD`
- `page=1`
- `pageSize=20`

Response:

```json
{
  "data": {
    "rows": [
      {
        "id": "event_id",
        "title": "Annual Volunteer Drive",
        "date": "2026-03-28",
        "time": "09:00",
        "location": "City Hall, Bangalore",
        "wing": { "id": "wing_id", "name": "Community Wing" },
        "committee": { "id": "committee_id", "name": "Events Comm." },
        "attendees": 120,
        "status": "Completed",
        "assignedTo": ["Volunteer", "Team Lead", "Admin", "Super Admin"],
        "description": "Yearly volunteer recruitment and orientation event open to all teams.",
        "report": {
          "status": "Ready",
          "owner": "Morgan Chen",
          "lastUpdated": "2026-03-29",
          "summary": "Drive completed with strong turnout."
        },
        "photosCount": 2
      }
    ]
  }
}
```

### 9.2 `GET /api/events/:id`

Purpose:

- event workspace modal

Must include:

- event detail
- embedded report summary
- photo upload rows

### 9.3 `POST /api/events`

Purpose:

- create event

Request body:

```json
{
  "title": "Tech Workshop: AI Series",
  "date": "2026-04-05",
  "time": "10:00",
  "location": "Auditorium B",
  "wingId": "wing_id",
  "committeeId": "committee_id",
  "attendees": 68,
  "description": "Hands-on AI/ML workshop series for tech volunteers.",
  "status": "Upcoming"
}
```

Needs:

- `title`
- `date`
- `status`

Rules:

- volunteer cannot create
- team lead can create committee-scoped event
- admin can create wing event and choose label(s)
- super admin can create global or mixed scope

### 9.4 `PATCH /api/events/:id`

Request body:

```json
{
  "title": "Updated title",
  "date": "2026-04-06",
  "time": "11:00",
  "location": "Updated hall",
  "wingId": "optional",
  "committeeId": "optional",
  "attendees": 72,
  "description": "Updated description",
  "status": "Ongoing"
}
```

### 9.5 `DELETE /api/events/:id`

No body.

### 9.6 `PUT /api/events/:id/report`

Purpose:

- save event report summary from workspace modal

Request body:

```json
{
  "summary": "Post-event summary, outcomes, attendance notes, issues, and next actions.",
  "status": "Draft | Ready"
}
```

Needs:

- `summary`

Response should return updated report metadata:

- `status`
- `owner`
- `lastUpdated`

### 9.7 `POST /api/events/:id/report/publish`

Request body:

```json
{
  "publishNote": "optional"
}
```

### 9.8 `POST /api/events/:id/photos`

Purpose:

- upload event photos

Use `multipart/form-data`.

Fields needed:

- `files[]`
- optional `caption`

Response:

```json
{
  "data": {
    "uploads": [
      {
        "id": "drive_file_id",
        "name": "registration-desk.jpg",
        "uploadedBy": "Riya Gupta",
        "status": "Pending Sync",
        "driveFolder": "https://drive.google.com/...",
        "uploadedAt": "2026-03-29T14:10:00.000Z"
      }
    ]
  }
}
```

### 9.9 `GET /api/events/:id/photos`

No body.

Returns tracked photo rows for workspace modal.

### 9.10 `POST /api/events/:id/photos/:photoId/retry-sync`

Purpose:

- admin/super admin retry failed uploads

Request body:

```json
{}
```

---

## 10. Stats APIs

Frontend file: `src/pages/Reports.jsx`

This page is not the report center. It is analytics/stats with charts and contribution breakdowns.

### 10.1 `GET /api/stats/overview`

Purpose:

- power KPI cards
- weekly bar chart
- pie chart
- monthly trend line

Query params:

- `view=team|wing|global`
- `labelOneId=...` optional
- `labelTwoId=...` optional
- `period=weekly|monthly|6m`

No body.

Response:

```json
{
  "data": {
    "scopeLabel": "Tech Wing · Dev Board",
    "kpi": {
      "hours": 390,
      "logs": 102,
      "events": 3,
      "efficiency": 91
    },
    "weekly": [
      { "week": "W1", "hours": 86, "logs": 22 }
    ],
    "pie": [
      { "name": "Dev Board", "value": 38 }
    ],
    "monthly": [
      { "month": "Oct", "hours": 180 }
    ]
  }
}
```

### 10.2 `GET /api/stats/breakdown`

Purpose:

- admin related-label breakdown table
- super admin label 1 comparison table

Query params:

- `view=admin-related-labels|global-label-one`
- `labelOneId=...` optional

Response:

```json
{
  "data": {
    "rows": [
      {
        "name": "Dev Board",
        "hours": 130,
        "logs": 34,
        "events": 1,
        "efficiency": 91
      }
    ]
  }
}
```

### 10.3 `GET /api/stats/contributions`

Purpose:

- contribution tracker table

Query params:

- `labelOneId=...` optional
- `labelTwoId=...` optional
- `period=weekly|monthly|3m|6m|yearly`
- `page=1`
- `pageSize=50`

Response:

```json
{
  "data": {
    "rows": [
      {
        "userId": "user_id",
        "volunteer": "Riya Gupta",
        "labelOne": "Tech Wing",
        "labelTwo": "Dev Board",
        "hours": 31,
        "logs": 19
      }
    ]
  }
}
```

### 10.4 `GET /api/stats/export`

Purpose:

- backend-supported export for CSV/PDF later

Query params:

- `format=csv|pdf`
- `view=team|wing|global`
- `labelOneId=...` optional
- `labelTwoId=...` optional
- `period=weekly|monthly|6m`

No body.

Response:

- file stream or signed download URL

---

## 11. Report Center APIs

Frontend file: `src/pages/ReportCenter.jsx`

### 11.1 `GET /api/reports`

Purpose:

- list weekly and derived reports in the table

Query params:

- `period=Weekly|Monthly|3 Months|6 Months|Yearly`
- `teamId=...`
- `scope=team|wing|global`
- `status=Submitted|Generated|Missing|Approved`
- `page=1`
- `pageSize=20`

Response:

```json
{
  "data": {
    "rows": [
      {
        "id": "report_id",
        "team": "Dev Board",
        "labelOne": "Tech Wing",
        "period": "Weekly",
        "periodKey": "2026-W12",
        "title": "Execution and blockers",
        "status": "Submitted",
        "owner": "Alex Rivera",
        "source": "Manual",
        "generatedFrom": "-",
        "hours": 48
      }
    ],
    "summary": {
      "weeklyStreams": 2,
      "openEscalations": 1,
      "autoGeneratedSummaries": 3,
      "annualReports": 1
    }
  }
}
```

### 11.2 `POST /api/reports/weekly`

Purpose:

- submit weekly report from "Submit Weekly" button

Request body:

```json
{
  "weekKey": "2026-W13",
  "teamId": "team_directory_id",
  "wingId": "wing_id",
  "committeeId": "committee_id",
  "title": "Weekly execution summary",
  "hours": 54,
  "highlights": "optional",
  "status": "Submitted"
}
```

Needs:

- `weekKey`
- scope determined by backend
- `title`
- `status`

Rules:

- only team lead+ can manually create weekly reports
- monthly/3 month/6 month/yearly are not manually authored

### 11.3 `POST /api/reports/weekly/:id/submit`

Request body:

```json
{
  "submitNote": "optional"
}
```

### 11.4 `POST /api/reports/weekly/:id/generate-derived`

Purpose:

- manual regeneration trigger if required

Request body:

```json
{
  "periodTypes": ["Monthly", "3 Months", "6 Months", "Yearly"]
}
```

### 11.5 `GET /api/reports/moms`

Purpose:

- MOM register table

Query params:

- `teamId=...`
- `wingId=...`
- `committeeId=...`
- `status=Draft|Under Review|Published`
- `dateFrom=YYYY-MM-DD`
- `dateTo=YYYY-MM-DD`

### 11.6 `POST /api/reports/moms`

Request body:

```json
{
  "title": "Volunteer coordination sync",
  "meetingDate": "2026-03-27",
  "teamId": "team_directory_id",
  "wingId": "wing_id",
  "committeeId": "committee_id",
  "attendees": ["Riya Gupta", "Rahul Sharma"],
  "agenda": ["Review pending work"],
  "notes": ["Key decisions taken"],
  "actionItems": [
    {
      "text": "Prepare report",
      "ownerUserId": "user_id",
      "dueDate": "2026-03-31"
    }
  ],
  "status": "Draft"
}
```

### 11.7 `PATCH /api/reports/moms/:id`

Partial body with same fields as create.

### 11.8 `POST /api/reports/moms/:id/publish`

Request body:

```json
{
  "publishNote": "optional"
}
```

---

## 12. Organization APIs

Frontend file: `src/pages/Organization.jsx`

### 12.1 `GET /api/organization/teams`

Purpose:

- left nav team list
- selected team header
- member table

Query params:

- `search=string`
- `scope=owned|wing|global`
- `page=1`
- `pageSize=50`

Response:

```json
{
  "data": {
    "rows": [
      {
        "id": "team_id",
        "labelOne": "Tech Wing",
        "labelTwo": "Dev Board",
        "lead": {
          "id": "user_id",
          "name": "Alex Rivera"
        },
        "focus": "Development and delivery",
        "members": [
          {
            "id": "member_id",
            "name": "Jamie Park",
            "email": "jamie@worklog.io",
            "role": "Volunteer",
            "joined": "2025-10-01"
          }
        ]
      }
    ]
  }
}
```

### 12.2 `POST /api/organization/teams`

Purpose:

- add team labels

Request body:

```json
{
  "labelOne": "Tech Wing",
  "labelTwo": "Dev Board",
  "labelOneWingId": "optional",
  "labelTwoCommitteeId": "optional",
  "leadUserId": "user_id",
  "focus": "Development and delivery"
}
```

### 12.3 `PATCH /api/organization/teams/:id`

Partial update with same fields as create.

### 12.4 `DELETE /api/organization/teams/:id`

No body.

### 12.5 `POST /api/organization/teams/:id/members`

Purpose:

- add member to selected team

Request body:

```json
{
  "name": "Jamie Park",
  "email": "jamie@worklog.io",
  "role": "Volunteer",
  "joined": "2025-10-01"
}
```

If the product uses existing users only, backend should instead accept:

```json
{
  "userId": "existing_user_id",
  "role": "Volunteer",
  "joined": "2025-10-01"
}
```

### 12.6 `PATCH /api/organization/teams/:id/members/:memberId`

Request body:

```json
{
  "name": "Updated Name",
  "email": "updated@worklog.io",
  "role": "Team Lead",
  "joined": "2025-10-01"
}
```

### 12.7 `DELETE /api/organization/teams/:id/members/:memberId`

No body.

### 12.8 `POST /api/organization/roles/assign`

Purpose:

- future-proof "Manage Roles" button

Request body:

```json
{
  "userId": "user_id",
  "role": "Admin",
  "wingId": "optional",
  "committeeId": "optional",
  "teamId": "optional"
}
```

---

## 13. Notification APIs

Frontend file: `src/pages/Notifications.jsx`

### 13.1 `GET /api/notifications`

Purpose:

- inbox list

Query params:

- `filter=All|Unread|Read`
- `page=1`
- `pageSize=50`

Response:

```json
{
  "data": {
    "rows": [
      {
        "id": "notification_id",
        "type": "warning",
        "title": "Weekly report missing",
        "body": "Outreach Team has not submitted the weekly report for 2026-W12.",
        "timeLabel": "14m ago",
        "fullTime": "Mar 29, 2026 - 08:56 AM",
        "read": false,
        "from": "System",
        "role": "System",
        "audience": "Outreach Team, Community Wing Admins"
      }
    ],
    "unreadCount": 3
  }
}
```

### 13.2 `PATCH /api/notifications/:id/read`

Request body:

```json
{
  "read": true
}
```

### 13.3 `PATCH /api/notifications/read-all`

Request body:

```json
{}
```

### 13.4 `POST /api/notifications`

Purpose:

- manual send from send modal

Request body:

```json
{
  "type": "info",
  "title": "Volunteer Drive reminder",
  "body": "Please ensure logistics are in place.",
  "audienceType": "committee | wing | global | specific_member | specific_role",
  "committeeId": "optional",
  "wingId": "optional",
  "recipientUserIds": ["optional_user_ids"],
  "targetRole": "optional_role"
}
```

Needs:

- `type`
- `title`
- `body`
- one targeting method

### 13.5 Notification creation sources the backend must support

System-generated notifications needed by frontend flows:

- weekly report missing
- event photo sync pending/failed
- yearly/monthly/derived report generated
- event reminder
- log approved
- user/team assignment updates

---

## 14. Profile APIs

Frontend file: `src/pages/Profile.jsx`

### 14.1 `GET /api/profile/me`

Purpose:

- profile card
- editable form
- role badge
- summary metrics
- recent activity

Response:

```json
{
  "data": {
    "user": {
      "id": "user_id",
      "name": "Alex Rivera",
      "email": "alex@example.com",
      "phone": "+91 98765 43210",
      "wing": "Tech Wing",
      "committee": "Dev Board",
      "joinDate": "2025-09-15",
      "bio": "Passionate volunteer...",
      "avatarUrl": null,
      "role": "Team Lead"
    },
    "summary": {
      "hours": 234,
      "logs": 64
    },
    "recentActivity": [
      {
        "id": "activity_id",
        "action": "Sprint Planning Review logged",
        "timeLabel": "30m ago",
        "type": "log"
      }
    ],
    "security": {
      "twoFactorEnabled": false
    }
  }
}
```

### 14.2 `PATCH /api/profile/me`

Purpose:

- save profile edits

Request body:

```json
{
  "name": "Alex Rivera",
  "phone": "+91 98765 43210",
  "bio": "Updated bio"
}
```

Fields backend should allow:

- `name`
- `phone`
- `bio`

Fields backend should not allow self-edit:

- `email`
- `role`
- `wing`
- `committee`
- `joinDate`

### 14.3 `POST /api/profile/me/avatar`

Use `multipart/form-data`.

Field:

- `file`

### 14.4 `POST /api/profile/me/change-password`

Request body:

```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

### 14.5 `POST /api/profile/me/two-factor/setup`

Request body:

```json
{}
```

### 14.6 `POST /api/profile/me/two-factor/verify`

Request body:

```json
{
  "code": "123456"
}
```

### 14.7 `DELETE /api/profile/me`

Request body:

```json
{
  "password": "current_password",
  "confirm": true
}
```

---

## 15. Redis and Background Jobs

### 15.1 Cache Keys

- `dashboard:user:{userId}`
- `stats:overview:{role}:{scopeHash}`
- `stats:contrib:{scopeHash}:{period}`
- `organization:teams:{scopeHash}`
- `notifications:unread:{userId}`

Suggested TTL:

- dashboard: 5 minutes
- stats: 10 minutes
- organization: 15 minutes
- unread counts: 2 minutes

### 15.2 Queue Names

- `report-generate`
- `report-reminders`
- `notification-send`
- `google-drive-sync`

### 15.3 Required Jobs

#### Weekly report reminder flow

1. scheduler checks missing weekly reports
2. create notifications for team lead
3. escalate to admin if overdue
4. escalate to super admin after configured threshold

#### Derived report generation flow

1. weekly report submitted
2. enqueue report generation
3. aggregate approved weekly inputs
4. upsert monthly / 3-month / 6-month / yearly reports
5. notify stakeholders

#### Event photo sync flow

1. file uploaded
2. create `driveFiles` row with `Pending Sync`
3. enqueue `google-drive-sync`
4. upload to Drive
5. update status to `Synced` or `Failed`
6. notify event owner/admin on failure if needed

---

## 16. Validation Rules

### 16.1 Auth

- email required
- password required

### 16.2 Work logs

- `title` required
- `workDate` required
- total duration must be at least 1 minute
- volunteer/team lead cannot override assigned scope
- allowed status transitions:
  - `Draft -> Draft | In Progress | Pending Review`
  - `In Progress -> In Progress | Draft | Pending Review`
  - `Pending Review -> Completed | Needs Revision`
  - `Needs Revision -> Draft | In Progress | Pending Review`

### 16.3 Events

- `title` required
- `date` required
- `status` required
- `attendees` cannot be negative
- label locking by role must be enforced server-side, not just UI-side

### 16.4 Event reports

- one report per event
- `summary` may be blank in draft
- publish allowed only for authorized roles

### 16.5 Weekly reports

- only weekly reports are manual
- unique per `weekKey + wingId + committeeId`
- backend decides allowed team scope for submitting user

### 16.6 MOMs

- `title` required
- `meetingDate` required
- at least one of `agenda`, `notes`, `actionItems` required

### 16.7 Notifications

- `title` required
- `body` required
- targeting must resolve to actual recipients

### 16.8 Profile

- self-edit only on allowed fields
- password change requires current password

---

## 17. Open Questions

1. Should a team directory entry always map to a real wing and real committee, or can label names exist without canonical entities?
2. Should Admin be allowed to edit profile email, or should all email changes stay in super-admin/user-management flows?
3. Should event report publication lock further photo uploads?
4. Should notifications support delete/archive, or only read/unread?
5. Does the product want tasks as a real backend entity now, since dashboard cards already surface them?

---

## 18. Implementation Priority

### Phase 1

- auth
- users / wings / committees / team directories
- logs CRUD + review
- notifications inbox basics
- profile read/update

### Phase 2

- dashboard aggregates
- events CRUD
- event report shell
- stats page endpoints

### Phase 3

- weekly reports
- derived reports
- MOMs
- missing report scheduler

### Phase 4

- Google Drive upload sync
- exports
- 2FA
- deeper audit logs

---

## 19. Frontend Mapping Summary

This is the minimum page-to-endpoint mapping the backend must satisfy:

- Login: `/api/auth/login`
- Dashboard: `/api/dashboard`
- Logs: `/api/logs`, `/api/logs/:id`, `/api/logs/:id/approve`, `/api/logs/:id/reject`
- Events: `/api/events`, `/api/events/:id`, `/api/events/:id/report`, `/api/events/:id/photos`
- Stats: `/api/stats/overview`, `/api/stats/breakdown`, `/api/stats/contributions`
- Report Center: `/api/reports`, `/api/reports/weekly`, `/api/reports/moms`
- Organization: `/api/organization/teams`, `/api/organization/teams/:id/members`
- Notifications: `/api/notifications`, `/api/notifications/:id/read`, `/api/notifications/read-all`
- Profile: `/api/profile/me`, `/api/profile/me/change-password`, `/api/profile/me/avatar`

This doc should now be treated as the backend build contract for the current frontend.
