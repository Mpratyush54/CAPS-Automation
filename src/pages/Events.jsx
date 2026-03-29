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

const EventFormModal = ({ initial, role, teams, onClose, onSave }) => {
  const [form, setForm] = useState({ 
    title: initial?.title || '', 
    date: initial?.date || '', 
    time: initial?.time || '', 
    location: initial?.location || '', 
    teamIds: initial?.teamIds || (initial?.teamId ? [initial.teamId] : []), 
    attendees: initial?.attendees || '', 
    description: initial?.description || '', 
    status: (initial?.status || 'upcoming').toLowerCase() 
  });
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTeam = (teamId) => {
    setForm(prev => {
      const exists = prev.teamIds.includes(teamId);
      return {
        ...prev,
        teamIds: exists 
          ? prev.teamIds.filter(id => id !== teamId)
          : [...prev.teamIds, teamId]
      };
    });
  };

  return (
    <Modal title={initial ? `Edit: ${initial.title}` : 'Create New Event'} onClose={onClose} maxWidth="620px">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.875rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
        <div><label className="input-label">Event Title *</label><input className="input-field" value={form.title} onChange={(e) => set('title', e.target.value)} required /></div>
        <div className="mobile-safe-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
          <div><label className="input-label">Date *</label><input className="input-field" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
          <div><label className="input-label">Time</label><input className="input-field" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></div>
          <div><label className="input-label">Status</label><select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>{['upcoming', 'ongoing', 'completed'].map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></div>
        </div>
        <div><label className="input-label">Location</label><input className="input-field" value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
        
        <div style={{ background: 'var(--color-surface-low)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="input-label" style={{ marginBottom: 0 }}>Assigned Teams / Units</label>
          <input 
            className="input-field" 
            placeholder="Search teams..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--color-surface-high)', borderRadius: '0.5rem', padding: '0.25rem' }}>
            {filteredTeams.map(t => {
              const isSelected = form.teamIds.includes(t._id);
              return (
                <div 
                  key={t._id} 
                  onClick={() => toggleTeam(t._id)}
                  style={{ 
                    padding: '0.375rem 0.625rem', 
                    cursor: 'pointer', 
                    fontSize: '0.8125rem',
                    background: isSelected ? 'var(--color-primary-fixed)' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-on-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderRadius: '0.25rem',
                    marginBottom: '2px'
                  }}
                >
                  <div style={{ width: '12px', height: '12px', border: '1px solid var(--color-outline)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--color-primary)' : 'transparent' }}>
                    {isSelected && <X size={10} color="white" />}
                  </div>
                  {t.name}
                </div>
              );
            })}
          </div>
          {form.teamIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
              {form.teamIds.map(id => {
                const team = teams.find(t => t._id === id);
                return (
                  <span key={id} className="chip" style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem' }}>
                    {team?.name || 'Unknown Unit'}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div><label className="input-label">Expected Attendees</label><input className="input-field" type="number" min="0" value={form.attendees} onChange={(e) => set('attendees', e.target.value)} /></div>
        <div><label className="input-label">Description</label><textarea className="input-field" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} style={{ resize: 'vertical' }} /></div>
        <div className="card-action-row" style={{ marginTop: '0.5rem' }}><button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button><button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={form.teamIds.length === 0}><Save size={14} /> {initial ? 'Save Changes' : 'Create Event'}</button></div>
      </form>
    </Modal>
  );
};

const EventWorkspace = ({ event, role, user, onClose }) => {
  const [photos, setPhotos] = useState([]);
  const [summary, setSummary] = useState({ people: [], teams: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gallery');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD].includes(role);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get(`/api/events/${event.id}/photos`),
        isAdmin ? api.get(`/api/events/${event.id}/photos/summary`) : Promise.resolve({ data: { people: [], teams: [] } })
      ]);
      setPhotos(unwrap(pRes).rows || []);
      setSummary(unwrap(sRes) || { people: [], teams: [] });
    } catch (e) {
      console.error('Failed to load workspace data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [event.id]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      // Step 1: Request upload metadata (Bulk)
      const payload = {
        files: files.map(f => ({
          fileName: f.name,
          mimeType: f.type,
          sizeBytes: f.size
        }))
      };
      
      const { items } = unwrap(await api.post(`/api/events/${event.id}/photos/upload-url`, payload));
      
      // Step 2: Upload each file's content
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const item = items[i];
        
        // Convert to base64 for transmission via JSON (simplified for current environment)
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(file);
        });
        const base64 = await base64Promise;

        await api.post(`/api/events/${event.id}/photos/content`, {
          fileName: item.fileName,
          content: base64
        });
      }
      
      loadData();
      setActiveTab('gallery');
    } catch (err) {
      alert('Upload failed: ' + getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title={`Workspace: ${event.title}`} onClose={onClose} maxWidth="900px">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-surface-high)', paddingBottom: '0.5rem' }}>
        <button className={`chip ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>Gallery</button>
        <button className={`chip ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>Upload</button>
        {isAdmin && <button className={`chip ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Submissions</button>}
      </div>

      <div style={{ minHeight: '400px', maxHeight: '60vh', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>Loading...</div>
        ) : activeTab === 'gallery' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {photos.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No photos yet. Be the first to upload!</div>
            ) : photos.map(p => (
              <div key={p._id} className="card" style={{ padding: '0.25rem', position: 'relative' }}>
                <img 
                  src={p.displayUrl || 'https://via.placeholder.com/180'} 
                  alt={p.fileName}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '0.375rem' }} 
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/180?text=Syncing...'; }}
                />
                <div style={{ padding: '0.25rem', fontSize: '0.7rem' }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.fileName}</div>
                  <div style={{ opacity: 0.7 }}>By {p.uploadedByName || 'User'}</div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'upload' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', border: '2px dashed var(--color-outline)', borderRadius: '1rem', gap: '1rem' }}>
            <ImagePlus size={48} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Select photos to upload to this event</p>
            <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} />
            <button className="btn-primary" onClick={() => fileInputRef.current.click()} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Choose Files'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <section>
              <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>People-wise Submissions</h4>
              <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                <thead><tr><th>Name</th><th>Role</th><th>Team</th><th>Photos</th></tr></thead>
                <tbody>
                  {summary.people.map(p => (
                    <tr key={p.userId}><td>{p.name}</td><td>{p.role}</td><td>{p.teamName}</td><td>{p.count}</td></tr>
                  ))}
                  {summary.people.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', opacity: 0.5 }}>No submissions found</td></tr>}
                </tbody>
              </table>
            </section>
            <section>
              <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Team-wise Analytics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {summary.teams.map(t => (
                  <div key={t.teamId} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{t.count}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Total Photos</div>
                  </div>
                ))}
                {summary.teams.length === 0 && <div style={{ opacity: 0.5 }}>No team data available</div>}
              </div>
            </section>
          </div>
        )}
      </div>
    </Modal>
  );
};

const EventCard = ({ event, role, teams, onWorkspace, onEdit, onDelete }) => {
  const canManage = can(role, 'manageCommitteeEvents');
  const canDelete = can(role, 'createWingEvent');
  const status = (event.status || 'upcoming').toLowerCase();
  
  // Resolve team names
  const teamNames = (event.teamIds || []).map(id => {
    const t = teams.find(x => x._id === String(id));
    return t ? t.name : null;
  }).filter(Boolean);

  return (
    <div className="card event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="event-card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3 }}>{event.title}</h3>
        <span className={`badge ${statusColors[status] || 'badge-neutral'}`} style={{ flexShrink: 0 }}>{status}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><Calendar size={13} /><span>{event.date}{event.time ? ` - ${event.time}` : ''}</span></div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><MapPin size={13} /><span>{event.location || 'No location set'}</span></div>
        <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          <Users size={13} />
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {event.attendees} attendees • {teamNames.length > 0 ? teamNames.join(', ') : 'No Units Assigned'}
          </span>
        </div>
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
  const [teams, setTeams] = useState([]);
  const [filter, setFilter] = useState('all');
  const [createModal, setCreate] = useState(false);
  const [editModal, setEdit] = useState(null);
  const [deleteModal, setDelete] = useState(null);
  const [workspaceEvent, setWorkspaceEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const res = await api.get('/api/organization/teams');
        setTeams(unwrap(res).rows || []);
      } catch (e) {
        console.error('Failed to load teams', e);
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
              <EventCard key={event.id} event={event} role={role} teams={teams} onWorkspace={(ev) => setWorkspaceEvent(ev)} onEdit={() => setEdit(event)} onDelete={() => setDeleteModal(event)} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-outline)' }}>
            <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p>No events found for this filter.</p>
          </div>
        )}

        {createModal && <EventFormModal teams={teams} role={role} onClose={() => setCreate(false)} onSave={saveEvent} />}
        {editModal && <EventFormModal initial={editModal} teams={teams} role={role} onClose={() => setEdit(null)} onSave={saveEvent} />}
        {workspaceEvent && <EventWorkspace event={workspaceEvent} role={role} user={user} onClose={() => setWorkspaceEvent(null)} />}
        
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
