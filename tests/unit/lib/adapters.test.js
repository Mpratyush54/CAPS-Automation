import { describe, it, expect } from 'vitest';
import { 
  normalizeUser, normalizeLog, normalizeEvent, normalizeNotification, normalizeTeam, normalizeReportRow 
} from '../../../src/lib/adapters';

describe('Unit: lib/adapters', () => {
  /* ─── normalizeUser ─── */
  describe('normalizeUser', () => {
    it('should map core user properties', () => {
      const rawUser = { _id: '123', name: 'Alok', wing: { name: 'Tech Wing' }, profession: 'Engineer' };
      const normalized = normalizeUser(rawUser);
      expect(normalized.id).toBe('123');
      expect(normalized.name).toBe('Alok');
      expect(normalized.wing).toBe('Tech Wing');
      expect(normalized.profession).toBe('Engineer');
    });

    it('should handle missing data gracefully', () => {
      expect(normalizeUser(null)).toBeNull();
      expect(normalizeUser(undefined)).toBeNull();
    });

    it('should fallback name to "User" when missing', () => {
      const normalized = normalizeUser({ _id: '1' });
      expect(normalized.name).toBe('User');
    });

    it('should handle wing as a plain string', () => {
      const normalized = normalizeUser({ _id: '1', wing: 'Operations' });
      expect(normalized.wing).toBe('Operations');
    });
  });

  /* ─── normalizeLog ─── */
  describe('normalizeLog', () => {
    it('should correctly compute duration and ownership', () => {
      const rawLog = { 
        _id: 'L1', 
        title: 'API Fix', 
        durationMinutes: 90, 
        userId: 'U1',
        workDate: '2026-03-25T19:42:07.001Z'
      };
      const normalized = normalizeLog(rawLog, 'U1');
      expect(normalized.id).toBe('L1');
      expect(normalized.duration).toBe('1h 30m');
      expect(normalized.isOwn).toBe(true);
      expect(normalized.date).toBe('2026-03-25');
    });

    it('should set isOwn to false for different users', () => {
      const rawLog = { userId: 'U1' };
      const normalized = normalizeLog(rawLog, 'U2');
      expect(normalized.isOwn).toBe(false);
    });

    it('should extract hours and minutes correctly', () => {
      const normalized = normalizeLog({ durationMinutes: 150 }, 'U1');
      expect(normalized.hours).toBe('2');
      expect(normalized.minutes).toBe('30');
    });

    it('should handle zero duration', () => {
      const normalized = normalizeLog({ durationMinutes: 0 }, 'U1');
      expect(normalized.duration).toBe('0h 0m');
    });

    it('should parse team data from embedded object', () => {
      const normalized = normalizeLog({ team: { id: 'T1', name: 'DSC' } }, 'U1');
      expect(normalized.team.name).toBe('DSC');
    });

    it('should construct team from teamId when team object is missing', () => {
      const normalized = normalizeLog({ teamId: 'T1', teamName: 'DSC' }, 'U1');
      expect(normalized.team.id).toBe('T1');
      expect(normalized.team.name).toBe('DSC');
    });
  });

  /* ─── normalizeTeam ─── */
  describe('normalizeTeam', () => {
    it('should properly identify lead status', () => {
      const rawTeam = { 
        _id: 'T1', 
        leadUserIds: ['L1', 'L2'],
        members: [{ _id: 'L1', name: 'Lead 1' }, { _id: 'V1', name: 'Volunteer 1' }]
      };
      const normalized = normalizeTeam(rawTeam);
      expect(normalized.members[0].isLead).toBe(true);
      expect(normalized.members[1].isLead).toBe(false);
    });

    it('should return null for null input', () => {
      expect(normalizeTeam(null)).toBeNull();
    });

    it('should handle leadUserId (singular)', () => {
      const rawTeam = { _id: 'T1', leadUserId: 'L1', members: [{ _id: 'L1', name: 'Lead' }] };
      const normalized = normalizeTeam(rawTeam);
      expect(normalized.leadIds).toContain('L1');
      expect(normalized.members[0].isLead).toBe(true);
    });

    it('should default lead label when no leads are assigned', () => {
      const rawTeam = { _id: 'T1', members: [] };
      const normalized = normalizeTeam(rawTeam);
      expect(normalized.lead).toBe('Unassigned');
    });
  });

  /* ─── normalizeEvent ─── */
  describe('normalizeEvent', () => {
    it('should handle reports, photos, and team assignments', () => {
      const rawEvent = { 
        _id: 'E1', 
        status: 'upcoming',
        teams: [{ id: 'T1', name: 'DSC' }],
        photos: [{ _id: 'P1', fileName: 'test.jpg' }]
      };
      const normalized = normalizeEvent(rawEvent);
      expect(normalized.id).toBe('E1');
      expect(normalized.status).toBe('Upcoming');
      expect(normalized.teams).toHaveLength(1);
      expect(normalized.teams[0].name).toBe('DSC');
      expect(normalized.photos).toHaveLength(1);
      expect(normalized.photos[0].name).toBe('test.jpg');
    });

    it('should default empty teams array when missing', () => {
      const normalized = normalizeEvent({ _id: 'E2' });
      expect(normalized.teams).toEqual([]);
    });

    it('should normalize report metadata', () => {
      const rawEvent = {
        _id: 'E3',
        report: { status: 'submitted', owner: 'Admin', summary: 'Done' },
      };
      const normalized = normalizeEvent(rawEvent);
      expect(normalized.report.status).toBe('Submitted');
      expect(normalized.report.owner).toBe('Admin');
    });

    it('should default status to "Upcoming" for unknown', () => {
      const normalized = normalizeEvent({ _id: 'E4' });
      expect(normalized.status).toBe('Upcoming');
    });
  });

  /* ─── normalizeNotification ─── */
  describe('normalizeNotification', () => {
    it('should normalize notification fields', () => {
      const raw = {
        _id: 'N1',
        type: 'reminder',
        title: 'Meeting at 4pm',
        body: 'Please join.',
        isRead: false,
        from: 'System',
      };
      const normalized = normalizeNotification(raw);
      expect(normalized.id).toBe('N1');
      expect(normalized.type).toBe('reminder');
      expect(normalized.read).toBe(false);
      expect(normalized.title).toBe('Meeting at 4pm');
    });

    it('should default from to "System"', () => {
      const normalized = normalizeNotification({ _id: 'N2' });
      expect(normalized.from).toBe('System');
    });
  });

  /* ─── normalizeReportRow ─── */
  describe('normalizeReportRow', () => {
    it('should normalize report row with metrics', () => {
      const raw = {
        _id: 'R1',
        title: 'Weekly Summary',
        status: 'draft',
        team: 'Design',
        hours: 42,
      };
      const normalized = normalizeReportRow(raw);
      expect(normalized.id).toBe('R1');
      expect(normalized.status).toBe('Draft');
      expect(normalized.team).toBe('Design');
      expect(normalized.hours).toBe(42);
    });
  });
});
