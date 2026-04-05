import { describe, it, expect } from 'vitest';
import { ROLES, hasMinRole, can, getNavItems } from '../../src/rbac';

describe('Unit: RBAC', () => {
  describe('hasMinRole', () => {
    it('should correctly evaluate role hierarchy', () => {
      expect(hasMinRole(ROLES.SUPER_ADMIN, ROLES.ADMIN)).toBe(true);
      expect(hasMinRole(ROLES.ADMIN, ROLES.TEAM_LEAD)).toBe(true);
      expect(hasMinRole(ROLES.TEAM_LEAD, ROLES.VOLUNTEER)).toBe(true);
      expect(hasMinRole(ROLES.VOLUNTEER, ROLES.SUPER_ADMIN)).toBe(false);
    });

    it('should return true for identical roles', () => {
      expect(hasMinRole(ROLES.ADMIN, ROLES.ADMIN)).toBe(true);
    });

    it('should handle unknown roles gracefully', () => {
      expect(hasMinRole('Guest', ROLES.VOLUNTEER)).toBe(false);
      expect(hasMinRole(ROLES.SUPER_ADMIN, 'Unknown')).toBe(true);
    });
  });

  describe('can', () => {
    it('should identify global permissions for Super Admin', () => {
      expect(can(ROLES.SUPER_ADMIN, 'manageWings')).toBe(true);
      expect(can(ROLES.SUPER_ADMIN, 'systemConfig')).toBe(true);
    });

    it('should restrict Volunteers to execution-level tasks', () => {
      expect(can(ROLES.VOLUNTEER, 'addOwnLog')).toBe(true);
      expect(can(ROLES.VOLUNTEER, 'approveLog')).toBe(false);
      expect(can(ROLES.VOLUNTEER, 'manageUsers')).toBe(false);
    });

    it('should correctly map Team Lead specific permissions', () => {
      expect(can(ROLES.TEAM_LEAD, 'approveLog')).toBe(true);
      expect(can(ROLES.TEAM_LEAD, 'viewTeamLogs')).toBe(true);
      expect(can(ROLES.TEAM_LEAD, 'manageWings')).toBe(false);
    });
  });

  describe('getNavItems', () => {
    it('should return only personal items for Volunteers', () => {
      const items = getNavItems(ROLES.VOLUNTEER);
      const labels = items.map(i => i.label);
      expect(labels).toEqual(['Dashboard', 'Logs', 'Events', 'Notifications', 'Profile']);
    });

    it('should return all management items for Admin', () => {
      const items = getNavItems(ROLES.ADMIN);
      const labels = items.map(i => i.label);
      expect(labels).toContain('Stats');
      expect(labels).toContain('Reports');
      expect(labels).toContain('Organization');
    });
  });
});
