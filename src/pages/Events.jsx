import { useEffect, useRef, useState } from 'react';
import { Calendar, Camera, Edit2, Eye, FileText, ImagePlus, Info, Lock, MapPin, PlusCircle, Save, Trash2, Users, X } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { COMMITTEE_OPTIONS, WING_OPTIONS } from '../data/orgOptions';
import { api, formatDateTime, getErrorMessage, unwrap } from '../lib/api';
import { normalizeEvent } from '../lib/adapters';

const SEED_EVENTS = [
  { id: 1, title: 'Annual Volunteer Drive', date: '2026-03-28', time: '09:00', location: 'City Hall, Bangalore', wing: 'Community Wing', committee: 'Events Comm.', attendees: 120, status: 'Completed', assignedTo: ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'], description: 'Yearly volunteer recruitment and orientation event open to all teams.', report: { status: 'Ready', owner: 'Morgan Chen', lastUpdated: '2026-03-29', summary: 'Drive completed with strong turnout and onboarding conversion.' }, photos: [{ id: 11, name: 'registration-desk.jpg', uploadedBy: 'Riya Gupta', status: 'Synced', driveFolder: 'drive://events/annual-volunteer-drive', uploadedAt: '2026-03-28 11:15' }, { id: 12, name: 'orientation-stage.jpg', uploadedBy: 'Rahul Sharma', status: 'Pending Sync', driveFolder: 'drive://events/annual-volunteer-drive', uploadedAt: '2026-03-28 12:02' }] },
  { id: 2, title: 'Q1 Review Board Meeting', date: '2026-04-02', time: '14:00', location: 'Conf Room A', wing: 'Admin', committee: 'Exec Comm.', attendees: 24, status: 'Upcoming', assignedTo: ['Admin', 'Super Admin'], description: 'Quarterly performance review with all team leads.', report: { status: 'Not Started', owner: 'Jordan Smith', lastUpdated: '-', summary: '' }, photos: [] },
  { id: 3, title: 'Tech Workshop: AI Series', date: '2026-04-05', time: '10:00', location: 'Auditorium B', wing: 'Tech Wing', committee: 'Dev Board', attendees: 68, status: 'Upcoming', assignedTo: ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'], description: 'Hands-on AI/ML workshop series for tech volunteers.', report: { status: 'Draft', owner: 'Alex Rivera', lastUpdated: '2026-03-29', summary: 'Outline created for post-event report and attendance capture.' }, photos: [{ id: 31, name: 'poster-banner.png', uploadedBy: 'Sam Lee', status: 'Synced', driveFolder: 'drive://events/tech-workshop-ai-series', uploadedAt: '2026-03-27 09:44' }] },
];

const statusColors = { Upcoming: 'badge-primary', Ongoing: 'badge-warning', Completed: 'badge-success' };

const Modal = ({ title, onClose, children, maxWidth = '760px' }) => (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal-box" style={{ maxWidth }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex', padding: '0.25rem', borderRadius: '0.375rem' }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

const SelectField = ({ label, value, locked, options, onChange }) => (
  <div>
    <label className="input-label">{label}{locked ? <span style={{ color: 'var(--color-outline)', fontWeight: 400, fontSize: '0.75rem' }}> (assigned)</span> : null}</label>
    <div style={{ position: 'relative' }}>
      <select className="input-field" value={value} onChange={onChange} disabled={locked} style={{ cursor: locked ? 'not-allowed' : 'pointer', background: locked ? 'var(--color-surface-low)' : undefined }}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      {locked ? <Lock size={12} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', pointerEvents: 'none' }} /> : null}
    </div>
  </div>
);

const EventFormModal = ({ initial, role, currentUser, onClose, onSave }) => {
  const lockWing = role === ROLES.VOLUNTEER || role === ROLES.ADMIN;
  const lockCommittee = role === ROLES.VOLUNTEER;
  const [form, setForm] = useState({ title: initial?.title || '', date: initial?.date || '', time: initial?.time || '', location: initial?.location || '', wing: initial?.wing || currentUser?.wing || '', committee: initial?.committee || currentUser?.committee || '', attendees: initial?.attendees || '', description: initial?.description || '', status: initial?.status || 'Upcoming' });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...(initial || {}), id: initial?.id || Date.now(), ...form, attendees: Number(form.attendees) || 0, assignedTo: initial?.assignedTo || ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'], report: initial?.report || { status: 'Not Started', owner: currentUser?.name || 'Team Lead', lastUpdated: '-', summary: '' }, photos: initial?.photos || [] });
    onClose();
  };

  return (
    <Modal title={initial ? `Edit: ${initial.title}` : 'Create New Event'} onClose={onClose} maxWidth="620px">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.875rem' }}>
        <div><label className="input-label">Event Title *</label><input className="input-field" value={form.title} onChange={(e) => set('title', e.target.value)} required /></div>
        <div className="mobile-safe-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
          <div><label className="input-label">Date *</label><input className="input-field" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
          <div><label className="input-label">Time</label><input className="input-field" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></div>
          <div><label className="input-label">Status</label><select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>{['Upcoming', 'Ongoing', 'Completed'].map((status) => <option key={status}>{status}</option>)}</select></div>
        </div>
        <div><label className="input-label">Location</label><input className="input-field" value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
        <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <SelectField label="Label 1" value={form.wing} locked={lockWing} options={WING_OPTIONS} onChange={(e) => set('wing', e.target.value)} />
          <SelectField label="Label 2" value={form.committee} locked={lockCommittee} options={COMMITTEE_OPTIONS} onChange={(e) => set('committee', e.target.value)} />
        </div>
        <div><label className="input-label">Expected Attendees</label><input className="input-field" type="number" min="0" value={form.attendees} onChange={(e) => set('attendees', e.target.value)} /></div>
        <div><label className="input-label">Description</label><textarea className="input-field" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} style={{ resize: 'vertical' }} /></div>
        <div className="card-action-row"><button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button><button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> {initial ? 'Save Changes' : 'Create Event'}</button></div>
      </form>
    </Modal>
  );
};

const EventWorkspaceModal = ({ event, role, onClose, onSave, onUpload }) => {
  const canEditReport = can(role, 'manageCommitteeEvents');
  const [summary, setSummary] = useState(event.report?.summary || '');

  const saveReport = () => onSave({ ...event, report: { ...event.report, status: summary ? 'Ready' : event.report.status, summary, lastUpdated: '2026-03-29' } });
  return (
    <Modal title={`Event Workspace: ${event.title}`} onClose={onClose}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem', margin: 0 }}>
            <div className="card-flex-between" style={{ marginBottom: '0.75rem' }}><h4 style={{ margin: 0, fontSize: '0.95rem' }}>Event Report</h4><span className={`badge ${event.report?.status === 'Ready' ? 'badge-success' : event.report?.status === 'Draft' ? 'badge-warning' : 'badge-neutral'}`}>{event.report?.status || 'Not Started'}</span></div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>Owner: {event.report?.owner || 'Unassigned'} - Last updated: {event.report?.lastUpdated || '-'}</div>
            <textarea className="input-field" rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} readOnly={!canEditReport} placeholder="Post-event summary, outcomes, attendance notes, issues, and next actions." style={{ resize: 'vertical' }} />
            <div className="card-action-row" style={{ marginTop: '0.75rem' }}><button className="btn-secondary" onClick={saveReport} disabled={!canEditReport}><FileText size={14} /> Save Report</button></div>
          </div>

          <div className="card" style={{ padding: '1rem', margin: 0 }}>
            <div className="card-flex-between" style={{ marginBottom: '0.75rem' }}><h4 style={{ margin: 0, fontSize: '0.95rem' }}>Photo Upload Tracking</h4><button className="btn-primary" onClick={onUpload}><ImagePlus size={14} /> Upload</button></div>
            <div style={{ padding: '0.75rem', borderRadius: '0.625rem', background: 'var(--color-surface-low)', marginBottom: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>In production the backend should store file status, uploader id, event id, Google Drive folder id, and retry state for each upload.</div>
            <div style={{ display: 'grid', gap: '0.625rem', maxHeight: '260px', overflow: 'auto' }}>
              {event.photos.length === 0 ? <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>No uploads yet.</div> : event.photos.map((photo) => (
                <div key={photo.id} style={{ padding: '0.75rem', borderRadius: '0.625rem', background: 'var(--color-surface-low)' }}>
                  <div className="card-flex-between"><strong style={{ fontSize: '0.85rem' }}>{photo.name}</strong><span className={`badge ${photo.status === 'Synced' ? 'badge-success' : 'badge-warning'}`}>{photo.status}</span></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.3rem' }}>{photo.uploadedBy} - {photo.uploadedAt}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '0.2rem' }}>{photo.driveFolder}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', margin: 0 }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Production Flow</h4>
          <div className="mobile-safe-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
            {[
              { title: 'Event Created', desc: 'Backend creates event and report shell' },
              { title: 'Photos Uploaded', desc: 'Backend stores file records with sync states' },
              { title: 'Drive Sync', desc: 'Worker uploads files to Google Drive and persists folder ids' },
              { title: 'Event Closed', desc: 'Report is locked with media, attendance, and audit trail' },
            ].map((item) => <div key={item.title} style={{ padding: '0.875rem', borderRadius: '0.75rem', background: 'var(--color-surface-low)' }}><div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>{item.title}</div><div style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>{item.desc}</div></div>)}
          </div>
        </div>
      </div>
    </Modal>
  );
};

const ConfirmDelete = ({ event, onConfirm, onClose }) => (
  <Modal title="Delete Event" onClose={onClose} maxWidth="400px">
    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '0 0 1.5rem' }}>Are you sure you want to delete <strong style={{ color: 'var(--color-on-surface)' }}>'{event.title}'</strong>? This cannot be undone.</p>
    <div className="card-action-row"><button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button><button onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, padding: '0.5rem 1rem', background: 'var(--color-error)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>Delete Event</button></div>
  </Modal>
);

const EventCard = ({ event, role, onWorkspace, onEdit, onDelete }) => {
  const canManage = can(role, 'manageCommitteeEvents');
  const canDelete = can(role, 'createWingEvent');
  return (
    <div className="card event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="event-card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}><h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3, minWidth: 0, overflowWrap: 'anywhere' }}>{event.title}</h3><span className={`badge ${statusColors[event.status] || 'badge-neutral'}`} style={{ flexShrink: 0 }}>{event.status}</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><Calendar size={13} /><span>{event.date}{event.time ? ` - ${event.time}` : ''}</span></div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><MapPin size={13} /><span>{event.location}</span></div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><Users size={13} /><span>{event.attendees} attendees - {event.wing} - {event.committee}</span></div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><FileText size={13} /><span>Report: {event.report.status}</span></div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><Camera size={13} /><span>{event.photos.length} photo uploads tracked</span></div>
      </div>
      <div className="event-card-actions" style={{ paddingTop: '0.625rem', borderTop: '1px solid var(--color-surface-high)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn-secondary" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', flex: 1 }} onClick={() => onWorkspace(event)}><Eye size={13} /> Workspace</button>
        {canManage && <button className="btn-ghost" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', justifyContent: 'center' }} onClick={() => onEdit(event)}><Edit2 size={13} /> Edit</button>}
        {canDelete && <button onClick={() => onDelete(event)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: 'none', border: '1px solid rgba(186,26,26,.25)', cursor: 'pointer', color: 'var(--color-error)', fontSize: '0.8125rem', fontWeight: 500, borderRadius: '0.375rem', justifyContent: 'center' }}><Trash2 size={13} /> Delete</button>}
      </div>
    </div>
  );
};

const Events = () => {
  const { role, user } = useAuthStore();
  const [events, setEvents] = useState(SEED_EVENTS);
  const [filter, setFilter] = useState('All');
  const [createModal, setCreate] = useState(false);
  const [editModal, setEdit] = useState(null);
  const [workspaceModal, setWorkspace] = useState(null);
  const [deleteModal, setDelete] = useState(null);
  const [error, setError] = useState(null);
  const uploadEventRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const loadEvents = async () => {
      try {
        const response = await api.get('/api/events');
        const payload = unwrap(response);
        const rows = payload?.rows || payload?.items || payload || [];
        if (mounted && Array.isArray(rows) && rows.length) {
          setEvents(rows.map(normalizeEvent));
        }
      } catch {
        // Keep seed data as fallback.
      }
    };
    loadEvents();
    return () => {
      mounted = false;
    };
  }, []);

  const viewable = role === ROLES.VOLUNTEER ? events.filter((event) => event.assignedTo?.includes(role)) : events;
  const filtered = viewable.filter((event) => filter === 'All' || event.status === filter);
  const saveEvent = async (next) => {
    setError(null);
    const payload = {
      title: next.title,
      description: next.description,
      eventDate: formatDateTime(next.date, next.time),
      startTime: next.time,
      location: next.location,
      wingId: next.wing || undefined,
      committeeId: next.committee || undefined,
      attendeeCount: Number(next.attendees || 0),
      status: next.status.toLowerCase(),
    };
    try {
      const response = next.id && events.some((event) => event.id === next.id)
        ? await api.patch(`/api/events/${next.id}`, payload)
        : await api.post('/api/events', payload);
      const saved = normalizeEvent(unwrap(response) || next);
      setEvents((current) => current.some((event) => event.id === saved.id) ? current.map((event) => event.id === saved.id ? saved : event) : [saved, ...current]);
      return;
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save event.'));
    }
    setEvents((current) => current.some((event) => event.id === next.id) ? current.map((event) => event.id === next.id ? next : event) : [next, ...current]);
  };
  const deleteEvent = async () => {
    setError(null);
    try {
      await api.delete(`/api/events/${deleteModal.id}`);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete event.'));
    }
    setEvents((current) => current.filter((event) => event.id !== deleteModal.id));
  };
  const pageTitle = role === ROLES.VOLUNTEER ? 'My Events' : role === ROLES.TEAM_LEAD ? 'Team Events' : role === ROLES.ADMIN ? 'Label 1 Events' : 'All Events';

  const openWorkspace = async (event) => {
    setError(null);
    try {
      const [eventRes, photoRes] = await Promise.all([
        api.get(`/api/events/${event.id}`),
        api.get(`/api/events/${event.id}/photos`),
      ]);
      const detail = normalizeEvent(unwrap(eventRes) || event);
      const photosPayload = unwrap(photoRes);
      detail.photos = (photosPayload?.uploads || photosPayload?.items || photosPayload || []).map((photo) => ({
        id: photo._id || photo.id,
        name: photo.fileName || photo.name,
        uploadedBy: photo.uploadedByName || photo.uploadedBy || 'Unknown',
        status: photo.status === 'uploaded' ? 'Synced' : photo.status === 'failed' ? 'Failed' : 'Pending Sync',
        driveFolder: photo.folderUrl || photo.folderId || '',
        uploadedAt: photo.createdAt || photo.uploadedAt || '',
      }));
      setWorkspace(detail);
    } catch {
      setWorkspace(event);
    }
  };

  const saveWorkspace = async (next) => {
    setError(null);
    try {
      await api.put(`/api/events/${next.id}/report`, {
        summary: next.report?.summary || '',
        status: (next.report?.status || 'Draft').toLowerCase().replace(/\s+/g, '_'),
      });
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save event report.'));
    }
    saveEvent(next);
    setWorkspace(next);
  };

  const queuePhotoUpload = async (event, files) => {
    if (!files?.length) return;
    setError(null);
    try {
      await api.post(`/api/events/${event.id}/photos/upload-url`, {
        files: Array.from(files).map((file) => ({
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        })),
      });
      const uploaded = Array.from(files).map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: file.name,
        uploadedBy: user?.name || 'Volunteer',
        status: 'Pending Sync',
        driveFolder: 'Queued for backend sync',
        uploadedAt: new Date().toLocaleString(),
      }));
      const next = { ...event, photos: [...uploaded, ...(event.photos || [])] };
      setEvents((current) => current.map((item) => item.id === event.id ? next : item));
      setWorkspace(next);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Unable to queue photo upload.'));
    }
  };

  return (
    <>
      <TopBar title={pageTitle} />
      <div className="page-body">
        <input ref={uploadEventRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => workspaceModal && queuePhotoUpload(workspaceModal, e.target.files)} />
        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.625rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', fontSize: '0.8125rem' }}>{error}</div>}
        <div className="card" style={{ marginBottom: '1rem', background: 'var(--color-surface-low)' }}>
          <div className="card-flex-between" style={{ alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Event reports and photo tracking live inside each event</h3>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>Wing and committee are treated here as parallel team labels. The event stores both labels, but neither label depends on the other.</p>
            </div>
            <div className="card-action-row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-primary">{events.filter((event) => event.report.status === 'Ready').length} reports ready</span>
              <span className="badge badge-neutral">{events.reduce((sum, event) => sum + event.photos.length, 0)} photos tracked</span>
            </div>
          </div>
        </div>

        <div className="page-controls">
          <div className="card-action-row" style={{ flex: 1 }}>{['All', 'Upcoming', 'Ongoing', 'Completed'].map((value) => <button key={value} className={`chip${filter === value ? ' active' : ''}`} onClick={() => setFilter(value)}>{value}</button>)}</div>
          {can(role, 'manageCommitteeEvents') && <button className="btn-primary" onClick={() => setCreate(true)}><PlusCircle size={15} /> Create Event</button>}
        </div>

        {role === ROLES.VOLUNTEER && <div className="card-meta-row" style={{ padding: '0.75rem 1rem', background: 'var(--color-primary-fixed)', borderRadius: '0.625rem', fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '1rem' }}><Info size={14} style={{ flexShrink: 0 }} /> Volunteers can upload event photos here. Team leads and admins close the event report after media sync and summary review are complete.</div>}

        <div className="events-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1rem' }}>{filtered.map((event) => <EventCard key={event.id} event={event} role={role} onWorkspace={openWorkspace} onEdit={setEdit} onDelete={setDelete} />)}</div>

        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-on-surface-variant)' }}><Calendar size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} /><p>No events found.</p></div>}

        {createModal && <EventFormModal role={role} currentUser={user} onClose={() => setCreate(false)} onSave={saveEvent} />}
        {editModal && <EventFormModal initial={editModal} role={role} currentUser={user} onClose={() => setEdit(null)} onSave={saveEvent} />}
        {workspaceModal && <EventWorkspaceModal event={workspaceModal} role={role} currentUser={user} onClose={() => setWorkspace(null)} onSave={saveWorkspace} onUpload={() => uploadEventRef.current?.click()} />}
        {deleteModal && <ConfirmDelete event={deleteModal} onConfirm={deleteEvent} onClose={() => setDelete(null)} />}
      </div>
    </>
  );
};

export default Events;
