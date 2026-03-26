import { useState } from 'react';
import { PlusCircle, MapPin, Users, Calendar, Edit2, Trash2, Eye, X, Save, Info, Lock } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';

const SEED_EVENTS = [
  { id: 1, title: 'Annual Volunteer Drive',    date: '2026-03-28', time: '09:00', location: 'City Hall, Bangalore',  wing: 'Community Wing', committee: 'Events Comm.',  attendees: 120, status: 'Upcoming', assignedTo: ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'], description: 'Yearly volunteer recruitment and orientation event open to all wings.' },
  { id: 2, title: 'Q1 Review Board Meeting',   date: '2026-04-02', time: '14:00', location: 'Conf Room A',           wing: 'Admin',           committee: 'Exec Comm.',    attendees: 24,  status: 'Upcoming', assignedTo: ['Admin', 'Super Admin'],                           description: 'Quarterly performance review with all wing heads.' },
  { id: 3, title: 'Tech Workshop: AI Series',  date: '2026-04-05', time: '10:00', location: 'Auditorium B',          wing: 'Tech Wing',       committee: 'Dev Board',     attendees: 68,  status: 'Upcoming', assignedTo: ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'], description: 'Hands-on AI/ML workshop series for tech volunteers.' },
  { id: 4, title: 'Community Health Camp',     date: '2026-03-20', time: '08:00', location: 'Koramangala Ground',    wing: 'Health Wing',     committee: 'Health Comm.',  attendees: 300, status: 'Completed',assignedTo: ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'], description: 'Free health checkup camp for the local community.' },
  { id: 5, title: 'Fundraiser Gala 2026',      date: '2026-03-15', time: '18:00', location: 'Grand Ballroom',        wing: 'Admin',           committee: 'Finance Comm.', attendees: 180, status: 'Completed',assignedTo: ['Admin', 'Super Admin'],                           description: 'Annual fundraiser to support community programs.' },
  { id: 6, title: 'New Volunteer Orientation', date: '2026-04-10', time: '11:00', location: 'Training Room 2',       wing: 'HR Wing',         committee: 'Vol. Affairs',  attendees: 45,  status: 'Upcoming', assignedTo: ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'], description: 'Onboarding session for all new volunteers joining this cycle.' },
];

const statusColors = { Upcoming: 'badge-primary', Ongoing: 'badge-warning', Completed: 'badge-success' };

/* ── Modal shell ─────────────────────────────────────────────── */
const Modal = ({ title, onClose, children, maxWidth = '520px' }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box" style={{ maxWidth }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex', padding: '0.25rem', borderRadius: '0.375rem' }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

/* ── Event Form (Create / Edit) ──────────────────────────────── */
const EventFormModal = ({ initial, role, currentUser, onClose, onSave }) => {
  const isEdit = !!initial;

  const lockWing      = role === ROLES.VOLUNTEER || role === ROLES.TEAM_LEAD || role === ROLES.ADMIN;
  const lockCommittee = role === ROLES.VOLUNTEER || role === ROLES.TEAM_LEAD;

  const assignedWing      = lockWing      ? (currentUser?.wing      || '') : '';
  const assignedCommittee = lockCommittee ? (currentUser?.committee || '') : '';

  const [form, setForm] = useState({
    title:       initial?.title       || '',
    date:        initial?.date        || '',
    time:        initial?.time        || '',
    location:    initial?.location    || '',
    wing:        initial?.wing        || assignedWing,
    committee:   initial?.committee   || assignedCommittee,
    attendees:   initial?.attendees   || '',
    description: initial?.description || '',
    status:      initial?.status      || 'Upcoming',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const audienceHint = role === ROLES.TEAM_LEAD
    ? `Creating for your committee: ${assignedWing} · ${assignedCommittee}`
    : role === ROLES.ADMIN
    ? `Creating for your wing: ${assignedWing}. Select any committee within it.`
    : 'This event will be visible organization-wide.';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: initial?.id || Date.now(), ...form, attendees: Number(form.attendees) || 0, assignedTo: initial?.assignedTo || ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'] });
    onClose();
  };

  const LockedField = ({ label, value, placeholder, onChange, locked }) => (
    <div>
      <label className="input-label">
        {label}{locked && <span style={{ color: 'var(--color-outline)', fontWeight: 400, fontSize: '0.75rem' }}> (assigned)</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input className="input-field"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          readOnly={locked}
          style={{ background: locked ? 'var(--color-surface-low)' : undefined, cursor: locked ? 'not-allowed' : undefined, paddingRight: locked ? '2rem' : undefined }}
        />
        {locked && <Lock size={12} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', pointerEvents: 'none' }} />}
      </div>
    </div>
  );

  return (
    <Modal title={isEdit ? `Edit: ${initial.title}` : 'Create New Event'} onClose={onClose} maxWidth="600px">
      <p style={{ margin: '-0.25rem 0 1rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{audienceHint}</p>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          <div><label className="input-label">Event Title *</label><input className="input-field" placeholder="Event name" value={form.title} onChange={e => set('title', e.target.value)} required /></div>
          <div className="mobile-safe-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
            <div><label className="input-label">Date *</label><input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} required /></div>
            <div><label className="input-label">Time</label><input className="input-field" type="time" value={form.time} onChange={e => set('time', e.target.value)} /></div>
            <div>
              <label className="input-label">Status</label>
              <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)} style={{ cursor: 'pointer' }}>
                {['Upcoming', 'Ongoing', 'Completed'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="input-label">Location</label><input className="input-field" placeholder="Venue / address" value={form.location} onChange={e => set('location', e.target.value)} /></div>
          <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <LockedField label="Wing" value={form.wing} placeholder="e.g. Tech Wing" onChange={e => set('wing', e.target.value)} locked={lockWing} />
            <LockedField label="Committee" value={form.committee} placeholder={role === ROLES.ADMIN ? 'Any committee in your wing' : 'e.g. Dev Board'} onChange={e => set('committee', e.target.value)} locked={lockCommittee} />
          </div>
          <div><label className="input-label">Expected Attendees</label><input className="input-field" type="number" min="0" placeholder="0" value={form.attendees} onChange={e => set('attendees', e.target.value)} /></div>
          <div><label className="input-label">Description</label><textarea className="input-field" placeholder="What is this event about?" rows={3} value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} /></div>
        </div>
        <div className="card-action-row" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            <Save size={14} /> {isEdit ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ── View event detail ───────────────────────────────────────── */
const ViewModal = ({ event, onClose }) => (
  <Modal title="Event Details" onClose={onClose} maxWidth="540px">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ padding: '1rem', background: 'var(--gradient-primary)', borderRadius: '0.75rem', color: '#fff' }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>{event.title}</h2>
        <span className="badge" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>{event.status}</span>
      </div>
      <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {[
          { label: 'Date', value: event.date },
          { label: 'Time', value: event.time || '—' },
          { label: 'Location', value: event.location || '—' },
          { label: 'Attendees', value: event.attendees },
          { label: 'Wing', value: event.wing || '—' },
          { label: 'Committee', value: event.committee || '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem', fontWeight: 500 }}>{value}</p>
          </div>
        ))}
      </div>
      {event.description && (
        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Description</p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface)', lineHeight: 1.6, background: 'var(--color-surface-low)', padding: '0.75rem', borderRadius: '0.5rem' }}>{event.description}</p>
        </div>
      )}
    </div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
      <button className="btn-secondary" onClick={onClose}>Close</button>
    </div>
  </Modal>
);

/* ── Delete confirm ──────────────────────────────────────────── */
const ConfirmDelete = ({ event, onConfirm, onClose }) => (
  <Modal title="Delete Event" onClose={onClose} maxWidth="400px">
    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '0 0 1.5rem' }}>
      Are you sure you want to delete <strong style={{ color: 'var(--color-on-surface)' }}>"{event.title}"</strong>? This cannot be undone.
    </p>
    <div className="card-action-row">
      <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
      <button onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, padding: '0.5rem 1rem', background: 'var(--color-error)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
        Delete Event
      </button>
    </div>
  </Modal>
);

/* ── Event Card ──────────────────────────────────────────────── */
const EventCard = ({ event, role, onView, onEdit, onDelete }) => {
  const canManage = can(role, 'manageCommitteeEvents');
  const canCreate = can(role, 'createWingEvent');

  return (
    <div className="card event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="event-card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3, minWidth: 0, overflowWrap: 'anywhere' }}>{event.title}</h3>
        <span className={`badge ${statusColors[event.status] || 'badge-neutral'}`} style={{ flexShrink: 0 }}>{event.status}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          <Calendar size={13} style={{ flexShrink: 0 }} />
          <span>{event.date}{event.time ? ` · ${event.time}` : ''}</span>
        </div>
        {event.location && (
          <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
            <MapPin size={13} style={{ flexShrink: 0 }} />
            <span>{event.location}</span>
          </div>
        )}
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          <Users size={13} style={{ flexShrink: 0 }} />
          <span>{event.attendees} attendees · {event.wing} · {event.committee}</span>
        </div>
        {event.description && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.description}
          </p>
        )}
      </div>

      <div className="event-card-actions" style={{ paddingTop: '0.625rem', borderTop: '1px solid var(--color-surface-high)', display: 'flex', gap: '0.5rem' }}>
        <button className="btn-secondary" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', flex: 1 }} onClick={() => onView(event)}>
          <Eye size={13} /> View
        </button>
        {canManage && (
          <button className="btn-ghost" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', justifyContent: 'center' }} onClick={() => onEdit(event)}>
            <Edit2 size={13} /> Edit
          </button>
        )}
        {canCreate && (
          <button onClick={() => onDelete(event)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: 'none', border: '1px solid rgba(186,26,26,.25)', cursor: 'pointer', color: 'var(--color-error)', fontSize: '0.8125rem', fontWeight: 500, borderRadius: '0.375rem', justifyContent: 'center' }}>
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Events Page ─────────────────────────────────────────────── */
const Events = () => {
  const { role, user } = useAuthStore();
  const [events, setEvents]     = useState(SEED_EVENTS);
  const [filter, setFilter]     = useState('All');
  const [createModal, setCreate] = useState(false);
  const [editModal, setEdit]    = useState(null);
  const [viewModal, setView]    = useState(null);
  const [deleteModal, setDelete] = useState(null);

  const viewable = role === ROLES.VOLUNTEER
    ? events.filter(e => e.assignedTo?.includes(role))
    : events;

  const filtered = viewable.filter(e => filter === 'All' || e.status === filter);

  const createEvent = (ev)  => setEvents(es => [ev, ...es]);
  const saveEvent   = (ev)  => setEvents(es => es.map(e => e.id === ev.id ? ev : e));
  const deleteEvent = () => { setEvents(es => es.filter(e => e.id !== deleteModal.id)); setDelete(null); };

  const pageTitle = role === ROLES.VOLUNTEER ? 'My Events'
    : role === ROLES.TEAM_LEAD ? 'Committee Events'
    : role === ROLES.ADMIN ? 'Wing Events'
    : 'All Events';

  return (
    <>
      <TopBar title={pageTitle} />
      <div className="page-body">
        {/* Controls */}
        <div className="page-controls">
          <div className="card-action-row" style={{ flex: 1 }}>
            {['All', 'Upcoming', 'Ongoing', 'Completed'].map(f => (
              <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          {can(role, 'manageCommitteeEvents') && (
            <button className="btn-primary" onClick={() => setCreate(true)}>
              <PlusCircle size={15} /> Create Event
            </button>
          )}
        </div>

        {role === ROLES.VOLUNTEER && (
          <div className="card-meta-row" style={{ padding: '0.75rem 1rem', background: 'var(--color-primary-fixed)', borderRadius: '0.625rem', fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '1rem' }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            Showing events you have been assigned to. Contact your Team Lead for more.
          </div>
        )}

        {/* Grid */}
        <div className="events-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem' }}>
          {filtered.map(event => (
            <EventCard
              key={event.id} event={event} role={role}
              onView={setView} onEdit={setEdit} onDelete={setDelete}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-on-surface-variant)' }}>
              <Calendar size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>No events found.</p>
            </div>
          )}
        </div>

        {/* Modals */}
        {createModal && <EventFormModal role={role} currentUser={user} onClose={() => setCreate(false)} onSave={createEvent} />}
        {editModal   && <EventFormModal initial={editModal} role={role} currentUser={user} onClose={() => setEdit(null)} onSave={saveEvent} />}
        {viewModal   && <ViewModal event={viewModal} onClose={() => setView(null)} />}
        {deleteModal && <ConfirmDelete event={deleteModal} onConfirm={deleteEvent} onClose={() => setDelete(null)} />}
      </div>
    </>
  );
};

export default Events;
