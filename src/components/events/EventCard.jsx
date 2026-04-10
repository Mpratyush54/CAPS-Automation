import React from 'react';
import { Calendar, MapPin, Trash2, Users, Eye, Edit2 } from 'lucide-react';
import { can } from '../../rbac';
import Badge from '../ui/Badge';

const statusVariants = { 
  upcoming: 'primary', 
  ongoing: 'warning', 
  completed: 'success' 
};

const EventCard = ({ event, role, teams, onWorkspace, onEdit, onDelete }) => {
  const canManage = can(role, 'manageCommitteeEvents');
  const canDelete = can(role, 'createWingEvent');
  const status = (event.status || 'upcoming').toLowerCase();

  const teamNames = event.teams?.length > 0 
    ? event.teams.map(t => t.name)
    : (event.teamIds || []).map(id => {
        const t = teams.find(x => x._id === String(id) || x.id === String(id));
        return t ? t.name : null;
      }).filter(Boolean);

  return (
    <div className="card event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="event-card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3 }}>{event.title}</h3>
        <Badge variant={statusVariants[status] || 'neutral'}>
          {status}
        </Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          <Calendar size={13} />
          <span>{event.date}{event.time ? ` - ${event.time}` : ''}</span>
        </div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          <MapPin size={13} />
          <span>{event.location || 'No location set'}</span>
        </div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          <Users size={13} />
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {event.attendees} attendees • {teamNames.length > 0 ? teamNames.join(', ') : 'No Units Assigned'}
          </span>
        </div>
      </div>
      <div className="event-card-actions" style={{ paddingTop: '0.625rem', borderTop: '1px solid var(--color-surface-high)', display: 'flex', gap: '0.5rem' }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => onWorkspace(event)}>
          <Eye size={13} /> Workspace
        </button>
        {canManage && (
          <button className="btn-ghost" onClick={() => onEdit(event)}>
            <Edit2 size={13} />
          </button>
        )}
        {canDelete && (
          <button className="btn-ghost" onClick={() => onDelete(event)} style={{ color: 'var(--color-error)' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

export default EventCard;
