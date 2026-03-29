import { formatDateInput, formatDurationLabel, titleizeStatus } from './api';
import { ROLES } from '../rbac';

const scopeName = (scope) => {
  if (!scope) return '';
  if (typeof scope === 'string') return scope;
  return scope.name || '';
};

export const normalizeUser = (user) => {
  if (!user) return null;
  return {
    id: String(user.id || user._id || ''),
    name: user.name || 'User',
    email: user.email || '',
    wing: scopeName(user.wing) || user.wingName || user.labelOne || null,
    committee: scopeName(user.committee) || user.committeeName || user.labelTwo || null,
    role: user.role || null,
    profession: user.profession || '',
    expertise: user.expertise || '',
  };
};

export const normalizeLog = (log, currentUserId) => {
  const durationMinutes = Number(log.durationMinutes || 0);
  return {
    id: String(log._id || log.id || ''),
    submitter: log.submitter?.name || log.user?.name || log.userName || log.submitterName || 'Me',
    title: log.title || '',
    date: formatDateInput(log.workDate || log.date),
    duration: log.durationLabel || formatDurationLabel(durationMinutes),
    hours: String(Math.floor(durationMinutes / 60)),
    minutes: String(durationMinutes % 60),
    tag: log.tag || '',
    wing: scopeName(log.wing) || log.wingName || '',
    committee: scopeName(log.committee) || log.committeeName || '',
    team: log.team || (log.teamId ? { id: log.teamId, name: log.teamName } : null),
    status: (log.status || 'draft').toLowerCase(),
    isOwn: String(log.userId || log.user?._id || log.user?.id) === String(currentUserId) || !!log.isOwn,
    tlComment: log.revisionComment || log.tlComment || null,
    notes: log.description || log.notes || '',
    description: log.description || '',
  };
};

export const normalizeEvent = (event) => ({
  id: event._id || event.id,
  title: event.title || '',
  date: formatDateInput(event.eventDate || event.date),
  time: event.startTime || event.time || '',
  location: event.location || '',
  wing: scopeName(event.wing) || event.wingName || '',
  committee: scopeName(event.committee) || event.committeeName || '',
  attendees: Number(event.attendeeCount ?? event.attendees ?? 0),
  status: titleizeStatus(event.status || 'upcoming'),
  assignedTo: event.assignedRoleVisibility || event.assignedTo || ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'],
  description: event.description || '',
  report: {
    status: titleizeStatus(event.report?.status || event.eventReport?.status || 'draft'),
    owner: event.report?.owner || event.eventReport?.owner || event.reportOwner || 'Unassigned',
    lastUpdated: formatDateInput(event.report?.updatedAt || event.eventReport?.updatedAt || event.report?.lastUpdated || event.eventReport?.lastUpdated) || '-',
    summary: event.report?.summary || event.eventReport?.summary || '',
  },
  photos: (event.photos || []).map((photo) => ({
    id: photo._id || photo.id,
    name: photo.fileName || photo.name,
    uploadedBy: photo.uploadedByName || photo.uploadedBy || 'Unknown',
    status: titleizeStatus(photo.status || 'uploaded'),
    driveFolder: photo.folderUrl || photo.driveFolder || photo.folderId || '',
    uploadedAt: photo.createdAt || photo.uploadedAt || '',
  })),
});

export const normalizeNotification = (item) => ({
  id: item._id || item.id,
  type: item.type || 'info',
  title: item.title || '',
  body: item.body || '',
  time: item.timeLabel || item.time || '',
  fullTime: item.fullTime || item.createdAt || '',
  read: !!(item.isRead ?? item.read),
  from: item.from || item.fromLabel || 'System',
  role: item.role || item.fromRoleLabel || 'System',
  audience: item.audience || item.audienceLabel || 'You',
});

export const normalizeTeam = (team) => {
  if (!team) return null;
  const leadIds = Array.from(new Set([
    ...(team.leadUserIds || []).map(id => String(id)),
    team.leadUserId ? String(team.leadUserId) : null,
    team.leadId ? String(team.leadId) : null
  ].filter(Boolean)));
  
  return {
    id: String(team._id || team.id || ''),
    wingId: team.labelOneWingId || team.wingId || null,
    committeeId: team.labelTwoCommitteeId || team.committeeId || null,
    labelOne: team.labelOne || team.labelOneName || '',
    labelTwo: team.labelTwo || team.labelTwoName || '',
    leadIds,
    lead: team.lead?.name || team.leadName || team.lead || (leadIds.length > 0 ? `${leadIds.length} Leaders` : 'Unassigned'),
    focus: team.focus || '',
    members: (team.members || []).map((member) => {
      const mId = String(member._id || member.id || '');
      const mRole = member.role || 'Volunteer';
      const isLead = leadIds.includes(mId) || [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(mRole);
      
      return {
        id: mId,
        name: member.name || '',
        email: member.email || '',
        role: mRole,
        isLead,
        joined: formatDateInput(member.joined || member.joinDate || member.createdAt),
      };
    }),
  };
};

export const normalizeReportRow = (row) => ({
  id: row._id || row.id,
  team: row.team || row.committeeName || row.labelTwo || '',
  labelOne: row.labelOne || row.wingName || '',
  period: row.period || titleizeStatus(row.periodType || 'weekly'),
  periodKey: row.periodKey || row.weekKey || '',
  title: row.title || '',
  status: titleizeStatus(row.status || 'draft'),
  owner: row.owner || row.submittedByName || row.generatedByName || 'System',
  source: row.source || 'Manual',
  generatedFrom: row.generatedFrom || '-',
  hours: Number(row.hours || row.snapshot?.totalHours || row.metrics?.volunteerHours || 0),
});

export const normalizeMom = (mom) => ({
  id: mom._id || mom.id,
  title: mom.title || '',
  team: mom.team || mom.committeeName || mom.labelTwo || '',
  preparedBy: mom.preparedByName || mom.preparedBy || '',
  role: mom.role || 'Volunteer',
  meetingDate: formatDateInput(mom.meetingDate),
  status: titleizeStatus(mom.status || 'draft'),
});
