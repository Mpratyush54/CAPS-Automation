/**
 * RBAC — Role-Based Access Control helpers for WorkLog
 *
 * Roles (in ascending privilege order):
 *   'Volunteer'  → execution level, own data only
 *   'Team Lead'  → committee-level management
 *   'Admin'      → wing-level management
 *   'Super Admin'→ full system access
 */

export const ROLES = {
  VOLUNTEER:   'Volunteer',
  TEAM_LEAD:   'Team Lead',
  ADMIN:       'Admin',
  SUPER_ADMIN: 'Super Admin',
};

const RANK = {
  [ROLES.VOLUNTEER]:   1,
  [ROLES.TEAM_LEAD]:   2,
  [ROLES.ADMIN]:       3,
  [ROLES.SUPER_ADMIN]: 4,
};

/** Returns true if the user's role is at least `minRole` level */
export const hasMinRole = (userRole, minRole) =>
  (RANK[userRole] || 0) >= (RANK[minRole] || 0);

/** Permission map – granular capability flags per role */
export const PERMISSIONS = {
  // Logs
  addOwnLog:       [ROLES.VOLUNTEER, ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  viewOwnLogs:     [ROLES.VOLUNTEER, ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  viewTeamLogs:    [ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  viewAllLogs:     [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  approveLog:      [ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Events
  viewAssignedEvents: [ROLES.VOLUNTEER, ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  manageCommitteeEvents: [ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  createWingEvent:    [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  createGlobalEvent:  [ROLES.SUPER_ADMIN],

  // Reports
  viewTeamReports:  [ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  viewWingReports:  [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  viewGlobalReports:[ROLES.SUPER_ADMIN],

  // Organization
  viewOrg:         [ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  manageCommittees:[ROLES.ADMIN, ROLES.SUPER_ADMIN],
  manageWings:     [ROLES.SUPER_ADMIN],
  manageUsers:     [ROLES.SUPER_ADMIN],

  // Notifications
  receiveNotifications: [ROLES.VOLUNTEER, ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  sendToCommittee:  [ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  sendToWing:       [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  sendGlobal:       [ROLES.SUPER_ADMIN],

  // Tasks
  viewAssignedTasks:  [ROLES.VOLUNTEER, ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  assignTasks:        [ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // System
  systemConfig:    [ROLES.SUPER_ADMIN],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - user's role
 * @param {string} permission - key from PERMISSIONS
 */
export const can = (role, permission) =>
  Array.isArray(PERMISSIONS[permission]) && PERMISSIONS[permission].includes(role);

/**
 * Returns the nav items visible to the given role.
 * Admins and Super Admins always see Stats, Report Center, and Organization.
 * Team Leads see Stats, Report Center, and Organization.
 * Volunteers only see Dashboard, Logs, Events, Notifications, Profile.
 */
export const getNavItems = (role) => {
  const all = [
    { to: '/dashboard',    label: 'Dashboard',    icon: 'LayoutDashboard' },
    { to: '/logs',         label: 'Logs',          icon: 'ClipboardList' },
    { to: '/events',       label: 'Events',        icon: 'Calendar' },
    { to: '/reports',      label: 'Stats',         icon: 'BarChart3',   minRole: ROLES.TEAM_LEAD },
    { to: '/report-center',label: 'Reports',       icon: 'FileText',    minRole: ROLES.TEAM_LEAD },
    { to: '/organization', label: 'Organization',  icon: 'Building2',   minRole: ROLES.TEAM_LEAD },
    { to: '/notifications',label: 'Notifications', icon: 'Bell' },
    { to: '/profile',      label: 'Profile',       icon: 'User' },
  ];
  return all.filter(item => !item.minRole || hasMinRole(role, item.minRole));
};
