const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CAPS Automation API',
    version: '1.0.0',
    description: 'API documentation for CAPS Automation endpoints',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorDetail: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          fields: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: {
            $ref: '#/components/schemas/ErrorDetail',
          },
        },
      },
      SuccessEnvelope: {
        type: 'object',
        properties: {
          data: { type: 'object', additionalProperties: true },
        },
      },
      PaginatedEnvelope: {
        type: 'object',
        properties: {
          data: { type: 'object', additionalProperties: true },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
              total: { type: 'integer' },
            },
          },
        },
      },
      ScopeFields: {
        type: 'object',
        properties: {
          teamId: { type: 'string', nullable: true },
          wingId: { type: 'string', nullable: true },
          committeeId: { type: 'string', nullable: true },
          scopeSource: {
            type: 'string',
            enum: ['inherited_user_scope', 'manually_selected_scope', 'self_selected_during_transition'],
          },
        },
      },
      Wing: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          leadUserId: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Committee: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          leadUserId: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkLog: {
        allOf: [
          { $ref: '#/components/schemas/ScopeFields' },
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              workDate: { type: 'string', format: 'date-time' },
              durationMinutes: { type: 'number' },
              status: {
                type: 'string',
                enum: ['draft', 'in_progress', 'pending_review', 'needs_revision', 'approved', 'Pending Review', 'Completed', 'Needs Revision'],
              },
              tag: { type: 'string' },
              submittedAt: { type: 'string', format: 'date-time', nullable: true },
              approvedAt: { type: 'string', format: 'date-time', nullable: true },
              approvedBy: { type: 'string', nullable: true },
              revisionComment: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      WeeklyReport: {
        allOf: [
          { $ref: '#/components/schemas/ScopeFields' },
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              weekKey: { type: 'string' },
              title: { type: 'string' },
              submittedBy: { type: 'string' },
              status: { type: 'string', enum: ['draft', 'submitted', 'approved', 'missing'] },
              highlights: { type: 'string' },
              metrics: {
                type: 'object',
                properties: {
                  attendancePct: { type: 'number' },
                  volunteerHours: { type: 'number' },
                  eventCount: { type: 'number' },
                  logCount: { type: 'number' },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              submittedAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        ],
      },
      PeriodReport: {
        allOf: [
          { $ref: '#/components/schemas/ScopeFields' },
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              periodType: { type: 'string', enum: ['monthly', 'quarterly_3', 'half_yearly_6', 'yearly'] },
              rangeStart: { type: 'string', format: 'date-time' },
              rangeEnd: { type: 'string', format: 'date-time' },
              sourceWeeklyReportIds: {
                type: 'array',
                items: { type: 'string' },
              },
              status: { type: 'string', enum: ['generated', 'published'] },
              snapshot: {
                type: 'object',
                properties: {
                  totalHours: { type: 'number' },
                  totalLogs: { type: 'number' },
                  events: { type: 'number' },
                  topContributors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string' },
                        hours: { type: 'number' },
                      },
                    },
                  },
                },
              },
              generatedAt: { type: 'string', format: 'date-time' },
              generatedBy: { type: 'string', nullable: true },
            },
          },
        ],
      },
      Event: {
        allOf: [
          { $ref: '#/components/schemas/ScopeFields' },
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              eventDate: { type: 'string', format: 'date-time' },
              startTime: { type: 'string' },
              location: { type: 'string' },
              scope: { type: 'string', enum: ['committee', 'wing', 'mixed', 'global'] },
              status: { type: 'string', enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] },
              createdBy: { type: 'string' },
              attendeeCount: { type: 'number' },
              photoSync: {
                type: 'object',
                properties: {
                  provider: { type: 'string' },
                  folderId: { type: 'string', nullable: true },
                  folderUrl: { type: 'string', nullable: true },
                  status: { type: 'string', enum: ['pending', 'ready', 'syncing', 'synced', 'failed'] },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      EventReport: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          eventId: { type: 'string' },
          status: { type: 'string', enum: ['Draft', 'Ready', 'Published'] },
          summary: { type: 'string' },
          outcomes: { type: 'array', items: { type: 'string' } },
          metrics: {
            type: 'object',
            properties: {
              attendance: { type: 'number' },
              photosUploaded: { type: 'number' },
              hoursLogged: { type: 'number' },
            },
          },
          generatedBy: { type: 'string', nullable: true },
          publishedBy: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Mom: {
        allOf: [
          { $ref: '#/components/schemas/ScopeFields' },
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              meetingDate: { type: 'string', format: 'date-time' },
              preparedBy: { type: 'string' },
              status: { type: 'string', enum: ['draft', 'under_review', 'published'] },
              attendees: { type: 'array', items: { type: 'string' } },
              agenda: { type: 'array', items: { type: 'string' } },
              notes: { type: 'array', items: { type: 'string' } },
              actionItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    ownerUserId: { type: 'string', nullable: true },
                    dueDate: { type: 'string', format: 'date-time', nullable: true },
                  },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      Notification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          type: { type: 'string', enum: ['info', 'warning', 'success', 'event', 'compliance', 'security', 'log', 'approval', 'revision'] },
          title: { type: 'string' },
          body: { type: 'string' },
          recipientUserId: { type: 'string' },
          sourceType: { type: 'string', enum: ['system', 'user', 'report_job'] },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      DriveFile: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          eventId: { type: 'string' },
          uploadedBy: { type: 'string' },
          googleFileId: { type: 'string', nullable: true },
          fileName: { type: 'string' },
          mimeType: { type: 'string' },
          sizeBytes: { type: 'number' },
          folderId: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['pending_upload', 'ready_to_sync', 'synced', 'failed'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TeamDirectory: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          type: { type: 'string', enum: ['wing', 'committee'] },
          name: { type: 'string' },
          description: { type: 'string' },
          leadUserId: { type: 'string', nullable: true },
          leadUserIds: { type: 'array', items: { type: 'string' } },
          memberIds: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DashboardResponse: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          hero: { type: 'object' },
          kpis: { type: 'array', items: { type: 'object' } },
          sections: { type: 'object' },
        },
      },
    },
    responses: {
      Ok: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SuccessEnvelope',
            },
          },
        },
      },
      Created: {
        description: 'Resource created successfully',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SuccessEnvelope',
            },
          },
        },
      },
      PaginatedOk: {
        description: 'Successful paginated response',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/PaginatedEnvelope',
            },
          },
        },
      },
      BadRequest: {
        description: 'Validation or bad request error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Authentication failed or missing credentials',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
      Forbidden: {
        description: 'Authenticated but not allowed',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
      NotFound: {
        description: 'Requested resource was not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
      Conflict: {
        description: 'Conflict with current resource state',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Wings', description: 'Wing management endpoints' },
    { name: 'Committees', description: 'Committee management endpoints' },
    { name: 'Work Logs', description: 'Volunteer and team activity logging' },
    { name: 'Reports', description: 'Weekly, period, event, and contribution reporting' },
    { name: 'MOMs', description: 'Minutes of meeting workflows' },
    { name: 'Events', description: 'Event management and photo upload metadata' },
    { name: 'Notifications', description: 'User notifications and reminder triggers' },
    { name: 'Dashboard', description: 'Role-aware dashboard aggregates' },
    { name: 'Stats', description: 'Analytics and contribution breakdowns' },
    { name: 'Organization', description: 'Team directory and role assignment endpoints' },
    { name: 'Profile', description: 'Current-user profile and security endpoints' },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js', './src/auth/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
