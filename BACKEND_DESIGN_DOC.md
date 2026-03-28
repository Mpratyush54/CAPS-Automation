# WorkLog Backend Design Doc

**Project:** WorkLog  
**Date:** March 29, 2026  
**Backend Stack:** Node.js, MongoDB, Redis  
**Frontend State:** Mock-data driven React app in this repo

---

## 1. Purpose

This document describes the backend design required to support the current frontend and the newly requested workflows:

- wing and committee stored as independent assignments, but log scope is inherited from the signed-in user for Volunteer and Team Lead
- event-level reports
- weekly reports as the source for monthly, 3-month, 6-month, and yearly reports
- MOMs prepared by volunteers
- admin and super admin visibility into volunteer contribution hours
- notifications when a Team Lead misses a weekly report
- event photo uploads routed to Google Drive

The frontend should continue using mock data until these APIs are ready.

---

## 2. Architecture

### Services

1. **API Service**
   - Node.js with Express or Fastify
   - handles auth, CRUD APIs, reporting commands, file upload initiation

2. **Background Worker**
   - Node.js worker process
   - consumes Redis jobs for:
   - report generation
   - notification dispatch
   - Google Drive upload sync
   - reminder scheduling

3. **MongoDB**
   - primary source of truth
   - stores users, logs, events, reports, MOMs, notifications metadata

4. **Redis**
   - caching
   - job queue
   - rate limiting
   - ephemeral reminder state and idempotency keys

### Suggested runtime split

- `apps/api`
- `apps/worker`
- `packages/shared`

---

## 3. Core Design Decisions

### 3.1 Wing and Committee Independence and Log Ownership

Wing and committee must not be modeled as a strict parent-child requirement in operational records.

Use this rule:

- a user may have a `primaryWingId`
- a user may have a `primaryCommitteeId`
- an event, log, report, or MOM may reference:
  - only wing
  - only committee
  - both
  - neither for global records

This supports the frontend requirement that wing and committee are independent labels for team assignment and reporting scope.

Special logging rule:

- Volunteer logs must inherit the logged-in user's assigned wing and committee
- Team Lead logs must inherit the logged-in user's assigned wing and committee
- Admin and Super Admin logs may explicitly choose wing and committee from dropdowns
- wing and committee remain independent values even when both are present on a log

### 3.2 Weekly Report as Source of Truth

Weekly reports are authored by Team Leads.  
Monthly, 3-month, 6-month, and yearly reports are generated from approved weekly reports.

Rule:

- only weekly reports are manually authored
- all higher-period reports are derived artifacts
- derived reports can be regenerated safely

### 3.3 Event Report per Event

Every event may have zero or one event summary report.

Rule:

- event report references `eventId`
- photo attachments are stored as Google Drive file metadata
- event report status can be `draft`, `ready`, `published`

### 3.4 MOMs

MOMs are lightweight meeting records prepared by volunteers or leads.

Rule:

- volunteers can create MOM drafts
- Team Leads/Admins can review/publish

### 3.5 Contribution Tracking

Contribution is computed from approved work logs, grouped by:

- volunteer
- committee
- wing
- period

Admins and Super Admins can query contribution summaries and rankings.

---

## 4. Data Model

Use Mongo collections with `ObjectId` keys and timestamps.

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
    "phone": "string",
    "avatarUrl": "string | null"
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
  "description": "string",
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
  "description": "string",
  "leadUserId": "ObjectId | null",
  "isActive": true,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Note: no mandatory `wingId` field here. If a business relationship is still needed for browsing, keep it separately in a mapping collection.

### 4.4 `scopeMappings`

Optional mapping collection for directory views:

```json
{
  "_id": "ObjectId",
  "wingId": "ObjectId",
  "committeeId": "ObjectId",
  "isPrimary": true,
  "createdAt": "Date"
}
```

This preserves independence while still allowing admin grouping.

### 4.5 `workLogs`

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "title": "string",
  "description": "string",
  "workDate": "Date",
  "durationMinutes": 150,
  "status": "draft | in_progress | pending_review | needs_revision | approved",
  "tag": "string",
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
  "description": "string",
  "eventDate": "Date",
  "startTime": "string",
  "location": "string",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "scopeSource": "inherited_user_scope | manually_selected_scope",
  "scope": "committee | wing | mixed | global",
  "status": "upcoming | ongoing | completed | cancelled",
  "createdBy": "ObjectId",
  "attendeeCount": 120,
  "photoSync": {
    "provider": "google_drive",
    "folderId": "string | null",
    "folderUrl": "string | null",
    "status": "pending | ready | syncing | synced | failed"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 4.7 `eventReports`

```json
{
  "_id": "ObjectId",
  "eventId": "ObjectId",
  "status": "draft | ready | published",
  "summary": "string",
  "outcomes": ["string"],
  "metrics": {
    "attendance": 120,
    "photosUploaded": 42,
    "hoursLogged": 86
  },
  "generatedBy": "ObjectId | null",
  "publishedBy": "ObjectId | null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Unique index:

- `{ eventId: 1 }`

### 4.8 `weeklyReports`

```json
{
  "_id": "ObjectId",
  "weekKey": "2026-W12",
  "title": "Committee delivery summary",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "scopeSource": "inherited_user_scope | manually_selected_scope",
  "submittedBy": "ObjectId",
  "status": "draft | submitted | approved | missing",
  "highlights": "string",
  "metrics": {
    "attendancePct": 92,
    "volunteerHours": 48,
    "eventCount": 2,
    "logCount": 17
  },
  "createdAt": "Date",
  "updatedAt": "Date",
  "submittedAt": "Date | null"
}
```

Indexes:

- unique `{ weekKey: 1, committeeId: 1, wingId: 1 }`
- `{ status: 1, submittedAt: 1 }`

### 4.9 `periodReports`

Derived reports only.

```json
{
  "_id": "ObjectId",
  "periodType": "monthly | quarterly_3 | half_yearly_6 | yearly",
  "rangeStart": "Date",
  "rangeEnd": "Date",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "scopeSource": "inherited_user_scope | manually_selected_scope",
  "sourceWeeklyReportIds": ["ObjectId"],
  "status": "generated | published",
  "snapshot": {
    "totalHours": 210,
    "totalLogs": 54,
    "events": 3,
    "topContributors": [
      { "userId": "ObjectId", "hours": 22 }
    ]
  },
  "generatedAt": "Date",
  "generatedBy": "ObjectId | null"
}
```

### 4.10 `moms`

```json
{
  "_id": "ObjectId",
  "title": "Volunteer coordination sync",
  "meetingDate": "Date",
  "preparedBy": "ObjectId",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "scopeSource": "inherited_user_scope | manually_selected_scope",
  "status": "draft | under_review | published",
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

### 4.11 `notifications`

```json
{
  "_id": "ObjectId",
  "type": "info | warning | success | event | compliance",
  "title": "string",
  "body": "string",
  "recipientUserId": "ObjectId",
  "sourceType": "system | user | report_job",
  "sourceRef": {
    "entityType": "weeklyReport | eventReport | event | mom | null",
    "entityId": "ObjectId | null"
  },
  "isRead": false,
  "createdAt": "Date"
}
```

Indexes:

- `{ recipientUserId: 1, isRead: 1, createdAt: -1 }`

### 4.12 `driveFiles`

```json
{
  "_id": "ObjectId",
  "eventId": "ObjectId",
  "uploadedBy": "ObjectId",
  "googleFileId": "string",
  "fileName": "string",
  "mimeType": "string",
  "sizeBytes": 12345,
  "folderId": "string",
  "status": "uploaded | failed",
  "createdAt": "Date"
}
```

---

## 5. Redis Usage

### 5.1 Cache keys

- `dashboard:user:{userId}`
- `reports:contrib:{scope}:{id}:{period}`
- `org:tree`
- `notifications:unread:{userId}`

TTL:

- dashboard: 5 min
- contribution summaries: 10 min
- organization tree: 15 min

### 5.2 Queue names

- `report-generate`
- `report-reminders`
- `notification-send`
- `google-drive-sync`

Use BullMQ or Bee-Queue.

### 5.3 Scheduled jobs

- weekly report deadline checker
- overdue reminder sender
- period report generation
- failed drive upload retry

---

## 6. API Design

### 6.1 Reporting APIs

#### `POST /api/reports/weekly`
- create or update weekly report draft/submission

#### `POST /api/reports/weekly/:id/submit`
- marks report as submitted
- enqueues derived-report generation job

#### `POST /api/reports/weekly/:id/generate-derived`
- manual re-generation
- Team Lead+

#### `GET /api/reports/weekly`
- filters:
  - `weekKey`
  - `wingId`
  - `committeeId`
  - `status`

#### `GET /api/reports/period`
- filters:
  - `periodType`
  - `wingId`
  - `committeeId`
  - `rangeStart`
  - `rangeEnd`

#### `GET /api/reports/events`
- event report listing

#### `POST /api/reports/events/:eventId/generate`
- creates or refreshes event report

#### `GET /api/reports/contributions`
- returns volunteer hour summaries
- filters:
  - `wingId`
  - `committeeId`
  - `period=weekly|monthly|3m|6m|yearly`

Response:

```json
{
  "scope": {
    "wingId": "string | null",
    "committeeId": "string | null",
    "period": "monthly"
  },
  "totals": {
    "hours": 312,
    "logs": 76
  },
  "contributors": [
    {
      "userId": "string",
      "name": "Riya Gupta",
      "hours": 28,
      "logs": 9
    }
  ]
}
```

### 6.2 MOM APIs

#### `POST /api/moms`
- Volunteer+

#### `PATCH /api/moms/:id`
- author or reviewer

#### `POST /api/moms/:id/publish`
- Team Lead+

#### `GET /api/moms`
- filters by wing, committee, date, status

### 6.3 Google Drive upload APIs

#### `POST /api/events/:id/photos/upload-url`

Two implementation options:

1. server receives file then uploads to Google Drive
2. browser uploads to backend, backend streams to Drive

Recommended now:

- browser uploads to backend
- backend worker streams to Drive
- metadata persisted in `driveFiles`

#### `GET /api/events/:id/photos`
- list photo metadata and sync status

---

## 7. Background Job Flows

### 7.1 Weekly report reminder flow

1. scheduler runs every hour
2. find committees/wings missing current `weekKey`
3. create notification jobs for:
   - Team Lead
   - Admin of related wing
   - Super Admin if still overdue after threshold
4. store reminder lock in Redis to avoid duplicate sends

### 7.2 Derived report generation flow

1. weekly report submitted
2. enqueue `report-generate`
3. worker loads source weekly reports for required range
4. aggregate approved logs, event reports, attendance metrics
5. upsert `periodReports`
6. enqueue notification to Team Lead/Admin/Super Admin

### 7.3 Event photo upload flow

1. user uploads photo(s)
2. backend stores temporary upload metadata
3. enqueue `google-drive-sync`
4. worker uploads to target Drive folder
5. persist `googleFileId`, `folderId`, status
6. update event report metrics

---

## 8. Aggregation Strategy

Use Mongo aggregation pipelines for:

- volunteer hours by period
- logs by status
- event participation summaries
- top contributors per scope

Recommended materialization:

- cache hot aggregates in Redis
- optionally maintain nightly rollup collection if data volume grows

Potential rollup collection:

### `contributionRollups`

```json
{
  "_id": "ObjectId",
  "periodKey": "2026-03",
  "periodType": "monthly",
  "userId": "ObjectId",
  "wingId": "ObjectId | null",
  "committeeId": "ObjectId | null",
  "scopeSource": "inherited_user_scope | manually_selected_scope",
  "approvedHours": 28,
  "approvedLogs": 9,
  "generatedAt": "Date"
}
```

---

## 9. Auth and RBAC

Use JWT access tokens with refresh tokens.

Permissions required for new features:

- `createWeeklyReport`: Team Lead+
- `viewAllReports`: Admin, Super Admin
- `viewContributionSummaries`: Admin, Super Admin
- `createMom`: Volunteer+
- `publishMom`: Team Lead+
- `manageDriveUploads`: Admin, Super Admin, event owner

Enforce row-level checks:

- volunteers: own logs, own MOMs, assigned events
- team leads: committee-scoped data they own
- admins: wing-scoped data
- super admins: global

---

## 10. Validation Rules

### Work logs

- Volunteer and Team Lead requests must ignore client-supplied `wingId` and `committeeId`
- backend must derive `wingId` and `committeeId` from the authenticated user profile for those roles
- Admin and Super Admin may submit logs with manually selected `wingId`, `committeeId`, or both
- dropdown options in frontend should come from the active wings and committees collections, not from nested dependency logic

### Weekly reports

- unique per `weekKey + committeeId + wingId`
- must have at least one scope reference unless global
- Team Lead can only submit for allowed scope

### Derived reports

- no manual editing of computed metrics
- can be republished, not manually authored

### MOMs

- title required
- meeting date required
- at least one of notes, agenda, action items required

### Event photos

- mime type whitelist
- size cap per image
- daily upload limit per user

---

## 11. Google Drive Integration

Use a service account or delegated OAuth depending on org policy.

Recommended folder pattern:

- `/WorkLog/Events/{eventId}-{slug}/`

Store in config:

- Google Drive parent folder id
- service account credentials

Failure handling:

- retries with backoff
- status surfaced as `failed`
- admin can retry manually

---

## 12. Suggested Implementation Order

### Phase 1

- auth
- users, wings, committees
- work logs
- contribution summary endpoint

### Phase 2

- weekly reports
- missing-report notification scheduler
- period report generation

### Phase 3

- event reports
- MOM APIs
- event photo upload pipeline to Google Drive

### Phase 4

- audit logs
- rollups
- hardening, observability, retry tooling

---

## 13. Open Questions

1. Should a committee be allowed to appear under multiple wings in the admin directory, or is the independence only for tagging/reporting?
2. Are higher-period reports read-only snapshots, or can admins annotate them after generation?
3. Should Google Drive uploads happen synchronously for small files, or always through background jobs?
4. Do missing weekly report reminders escalate immediately to Super Admin, or after one missed cycle?

---

## 14. Frontend/Backend Contract for Now

Until the backend is implemented:

- frontend continues to use local mock data
- field names should roughly match this design
- higher-period reports should be treated as derived data, not manually entered data
- event photo upload UI should show sync status rather than assume upload success

This keeps frontend work unblocked while the backend is built.




