import { useEffect, useRef, useState } from 'react';
import { Calendar, Camera, Edit2, Eye, FileText, ImagePlus, Info, Lock, MapPin, PlusCircle, Save, Trash2, Users, X, AlertCircle } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { api, formatDateTime, getErrorMessage, unwrap } from '../lib/api';
import { normalizeEvent } from '../lib/adapters';

const statusColors = { upcoming: 'badge-primary', ongoing: 'badge-warning', completed: 'badge-success' };

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

const EventFormModal = ({ initial, role, wings, committees, onClose, onSave }) => {
  const [form, setForm] = useState({ 
    title: initial?.title || '', 
    date: initial?.date || '', 
    time: initial?.time || '', 
    location: initial?.location || '', 
    wingId: initial?.wingId || '', 
    committeeId: initial?.committeeId || '', 
    attendees: initial?.attendees || '', 
    description: initial?.description || '', 
    status: (initial?.status || 'upcoming').toLowerCase() 
  });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      ...form, 
      id: initial?.id, 
      attendees: Number(form.attendees) || 0 
    });
    onClose();
  };

  return (
    <Modal title={initial ? `Edit: ${initial.title}` : 'Create New Event'} onClose={onClose} maxWidth="620px">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.875rem' }}>
        <div><label className="input-label">Event Title *</label><input className="input-field" value={form.title} onChange={(e) => set('title', e.target.value)} required /></div>
        <div className="mobile-safe-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
          <div><label className="input-label">Date *</label><input className="input-field" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
          <div><label className="input-label">Time</label><input className="input-field" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></div>
          <div><label className="input-label">Status</label><select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>{['upcoming', 'ongoing', 'completed'].map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></div>
        </div>
        <div><label className="input-label">Location</label><input className="input-field" value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
        <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="input-label">Wing</label>
            <select className="input-field" value={form.wingId} onChange={(e) => set('wingId', e.target.value)}>
              <option value="">N/A</option>
              {wings.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Committee</label>
            <select className="input-field" value={form.committeeId} onChange={(e) => set('committeeId', e.target.value)}>
              <option value="">N/A</option>
              {committees.filter(c => !form.wingId || c.wingId === form.wingId).map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div><label className="input-label">Expected Attendees</label><input className="input-field" type="number" min="0" value={form.attendees} onChange={(e) => set('attendees', e.target.value)} /></div>
        <div><label className="input-label">Description</label><textarea className="input-field" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} style={{ resize: 'vertical' }} /></div>
        <div className="card-action-row"><button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button><button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> {initial ? 'Save Changes' : 'Create Event'}</button></div>
      </form>
    </Modal>
  );
};

const EventCard = ({ event, role, onWorkspace, onEdit, onDelete }) => {
  const canManage = can(role, 'manageCommitteeEvents');
  const canDelete = can(role, 'createWingEvent');
  const status = (event.status || 'upcoming').toLowerCase();
  
  return (
    <div className="card event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="event-card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3 }}>{event.title}</h3>
        <span className={`badge ${statusColors[status] || 'badge-neutral'}`} style={{ flexShrink: 0 }}>{status}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><Calendar size={13} /><span>{event.date}{event.time ? ` - ${event.time}` : ''}</span></div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><MapPin size={13} /><span>{event.location || 'No location set'}</span></div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><Users size={13} /><span>{event.attendees} attendees · {event.wing || 'No Wing'}</span></div>
      </div>
      <div className="event-card-actions" style={{ paddingTop: '0.625rem', borderTop: '1px solid var(--color-surface-high)', display: 'flex', gap: '0.5rem' }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => onWorkspace(event)}><Eye size={13} /> Workspace</button>
        {canManage && <button className="btn-ghost" onClick={() => onEdit(event)}><Edit2 size={13} /></button>}
        {canDelete && <button onClick={() => onDelete(event)} style={{ color: 'var(--color-error)' }}><Trash2 size={13} /></button>}
      </div>
    </div>
  );
};

const Events = () => {
  const { role, user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [wings, setWings] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [filter, setFilter] = useState('all');
  const [createModal, setCreate] = useState(false);
  const [editModal, setEdit] = useState(null);
  const [deleteModal, setDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const [wRes, cRes] = await Promise.all([
          api.get('/api/organization/wings'),
          api.get('/api/organization/committees')
        ]);
        setWings(unwrap(wRes).rows || []);
        setCommittees(unwrap(cRes).rows || []);
      } catch (e) {
        console.error('Failed to load org structure', e);
      }
    };
    loadOrg();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadEvents = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/events');
        const rows = unwrap(response).rows || [];
        if (mounted) {
          setEvents(rows.map(normalizeEvent));
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load events.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadEvents();
    return () => { mounted = false; };
  }, []);

  const filtered = events.filter((e) => filter === 'all' || (e.status || '').toLowerCase() === filter);

  const saveEvent = async (next) => {
    setError(null);
    try {
      const isEdit = !!next.id;
      const endpoint = isEdit ? `/api/events/${next.id}` : '/api/events';
      const method = isEdit ? 'patch' : 'post';
      
      const payload = {
        ...next,
        eventDate: formatDateTime(next.date, next.time),
      };
      
      const response = await api[method](endpoint, payload);
      const saved = normalizeEvent(unwrap(response));
      
      setEvents(prev => isEdit 
        ? prev.map(e => e.id === saved.id ? saved : e) 
        : [saved, ...prev]
      );
      setCreate(false);
      setEdit(null);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save event.'));
    }
  };

  const deleteEvent = async () => {
    if (!deleteModal?.id) return;
    try {
      await api.delete(`/api/events/${deleteModal.id}`);
      setEvents(prev => prev.filter(e => e.id !== deleteModal.id));
      setDeleteModal(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete event.'));
    }
  };

  const pageTitle = role === ROLES.VOLUNTEER ? 'My Events' : 'Event Board';

  return (
    <>
      <TopBar title={pageTitle} />
      <div className="page-body">
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.625rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="page-controls">
          <div className="card-action-row" style={{ flex: 1 }}>
            {['all', 'upcoming', 'ongoing', 'completed'].map((v) => (
              <button key={v} className={`chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {can(role, 'manageCommitteeEvents') && <button className="btn-primary" onClick={() => setCreate(true)}><PlusCircle size={15} /> Create</button>}
        </div>

        {loading && events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>Loading events...</div>
        ) : (
          <div className="events-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} role={role} onWorkspace={() => {}} onEdit={() => setEdit(event)} onDelete={() => setDeleteModal(event)} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-outline)' }}>
            <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p>No events found for this filter.</p>
          </div>
        )}

        {createModal && <EventFormModal wings={wings} committees={committees} role={role} onClose={() => setCreate(false)} onSave={saveEvent} />}
        {editModal && <EventFormModal initial={editModal} wings={wings} committees={committees} role={role} onClose={() => setEdit(null)} onSave={saveEvent} />}
        
        {deleteModal && (
          <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
            <div className="modal-box" style={{ maxWidth: '400px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Delete Event</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
                Are you sure you want to delete <strong style={{ color: 'var(--color-on-surface)' }}>{deleteModal.title}</strong>?
              </p>
              <div className="card-action-row">
                <button className="btn-secondary" onClick={() => setDeleteModal(null)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn-primary" onClick={deleteEvent} style={{ flex: 1, justifyContent: 'center', background: 'var(--color-error)' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Events;
