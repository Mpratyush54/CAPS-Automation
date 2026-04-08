import { useEffect, useState, useRef } from 'react';
import {
  PlusCircle, Search, Edit2, Trash2, Clock, CheckCircle, Plus,
  Eye, X, Save, XCircle, AlertCircle, Send, ImagePlus, MapPin
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES } from '../rbac';
import { api, API_BASE_URL, formatDateTime, getErrorMessage, unwrap } from '../lib/api';
import { CardSkeleton } from '../components/Skeleton';

const MOM_STATUS_META = {
  draft: { label: 'Draft', color: 'badge-neutral' },
  pending_approval: { label: 'Pending Approval', color: 'badge-warning' },
  approved: { label: 'Approved', color: 'badge-success' },
};

/* -------------------- COMPONENTS -------------------- */

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay">
    <div className="modal-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', padding: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-surface-high)' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} className="btn-secondary" style={{ padding: '0.5rem' }}><X size={24} /></button>
      </div>
      <div style={{ flex: 1, padding: '0 2rem 2rem' }}>
        {children}
      </div>
    </div>
  </div>
);

const MomFormModal = ({ initial, teams, categories, onCategoryAdded, onClose, onSave, user }) => {
  const [form, setForm] = useState({
    title: initial?.title || '',
    meetingDate: initial?.meetingDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    category: initial?.category || '',
    meetingType: initial?.meetingType || 'In-Person',
    selectedAttendees: initial?.selectedAttendees || [],
    attendeesText: initial?.attendeesText || '',
    agenda: initial?.agenda || '',
    pointsDiscussed: initial?.pointsDiscussed || '',
    deadlinesSet: initial?.deadlinesSet || '',
    teamId: initial?.teamId || user?.teamId || '',
    geotag: initial?.geotag || null,
    photos: []
  });
  const [members, setMembers] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const fileInputRef = useRef();

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);

  const handleAddCategory = async () => {
     if (!newCat.trim()) return;
     try {
       await api.post('/api/moms/categories', { name: newCat.trim() });
       onCategoryAdded();
       set('category', newCat.trim());
       setNewCat('');
       setAddingCat(false);
     } catch (err) {
       alert(getErrorMessage(err));
     }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const fetchMembers = async () => {
      setMemberLoading(true);
      try {
        // We always try to fetch. Backend handles restrictions.
        const url = form.teamId 
          ? `/api/organization/users/all?teamId=${form.teamId}`
          : '/api/organization/users/all';
        const res = await api.get(url);
        const payload = unwrap(res);
        setMembers(payload.rows || []);
      } catch (e) {
        console.error('Failed to load members', e);
        setMembers([]);
      } finally {
        setMemberLoading(false);
      }
    };
    fetchMembers();
  }, [form.teamId]);

  const toggleAttendee = (userId) => {
    setForm(prev => ({
      ...prev,
      selectedAttendees: prev.selectedAttendees.includes(userId)
        ? prev.selectedAttendees.filter(id => id !== userId)
        : [...prev.selectedAttendees, userId]
    }));
  };

  const handleCaptureLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        set('geotag', { lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => {
        console.error(err);
        alert("Location capture failed. Ensure GPS is on.");
      });
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (form.photos.length === 0 && !initial) {
      alert("At least one geotagged photo is required.");
      return;
    }
    setSubmitting(true);
    try {
      const attendeeNames = members
        .filter(m => form.selectedAttendees.includes(m._id))
        .map(m => m.name);
      const finalAttendees = attendeeNames.join(', ');

      const payload = {
        title: form.title,
        meetingDate: form.meetingDate,
        category: form.category,
        meetingType: form.meetingType,
        attendees: finalAttendees,
        agenda: form.agenda,
        pointsDiscussed: form.pointsDiscussed,
        deadlinesSet: form.deadlinesSet,
        teamId: form.teamId,
        geotag: form.geotag
      };

      const momRes = await api.post('/api/moms', payload);
      const mom = unwrap(momRes);
      const momId = mom._id;

      if (form.photos.length > 0) {
        const uploadIntent = await api.post(`/api/moms/${momId}/photos/upload-url`, {
          files: form.photos.map(f => ({
            fileName: f.name,
            mimeType: f.type,
            sizeBytes: f.size
          }))
        });
        const { items: uploadItems } = unwrap(uploadIntent);

        for (let i = 0; i < form.photos.length; i++) {
          const file = form.photos[i];
          const intent = uploadItems[i];
          if (!intent) continue;

          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PATCH', `${API_BASE_URL}${intent.uploadUrl}`);
            xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('authToken')}`);
            xhr.setRequestHeader('x-offset', '0');
            xhr.setRequestHeader('x-total-size', file.size);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Upload failed'));
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
          });
        }
      }
      
      onSave();
      onClose();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={initial ? 'Edit MOM' : 'Generate MOM (Minutes of Meeting)'} onClose={onClose} maxWidth="700px">
      <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '1rem' }}>
          <div>
            <label className="input-label">Meeting Name *</label>
            <input className="input-field" placeholder="e.g. Weekly Sync" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div>
          <label className="input-label">Category *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="input-field" value={form.category} onChange={(e) => set('category', e.target.value)} required>
               <option value="">Select Category</option>
               {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {isAdmin && (
              <button 
                type="button" 
                onClick={() => setAddingCat(!addingCat)}
                className="btn-icon"
                style={{ height: '42px', width: '42px', flexShrink: 0 }}
              >
                <Plus size={20} />
              </button>
            )}
          </div>
          {addingCat && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <input 
                className="input-field" 
                placeholder="New Category..." 
                value={newCat} 
                onChange={e => setNewCat(e.target.value)}
              />
              <button type="button" onClick={handleAddCategory} className="btn-primary" style={{ height: '42px' }}>Add</button>
            </div>
          )}
        </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label">Date *</label>
            <input type="date" className="input-field" value={form.meetingDate} onChange={(e) => set('meetingDate', e.target.value)} required />
          </div>
          <div>
            <label className="input-label">Meeting Type *</label>
            <input className="input-field" placeholder="e.g. Planning, Review" value={form.meetingType} onChange={(e) => set('meetingType', e.target.value)} required />
          </div>
        </div>



        <div>
          <label className="input-label">Select Attendees (from your team) *</label>
          {memberLoading ? <p style={{ fontSize: '0.8rem' }}>Loading team members...</p> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--color-outline-variant)', padding: '0.75rem', borderRadius: '0.5rem' }}>
               {members.map(m => (
                 <button
                    key={m._id}
                    type="button"
                    onClick={() => toggleAttendee(m._id)}
                    className={`chip ${form.selectedAttendees.includes(m._id) ? 'active' : ''}`}
                    style={{ fontSize: '0.75rem' }}
                 >
                    {m.name}
                 </button>
               ))}
               {members.length === 0 && <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>No members found. Ensure a team is selected.</p>}
            </div>
          )}
        </div>

        <div>
          <label className="input-label">Agenda *</label>
          <textarea className="input-field" rows={2} placeholder="What was the plan?" value={form.agenda} onChange={(e) => set('agenda', e.target.value)} required />
        </div>

        <div>
          <label className="input-label">Points Discussed (Numbered points) *</label>
          <textarea className="input-field" rows={4} placeholder="Decisions made, topics covered..." value={form.pointsDiscussed} onChange={(e) => set('pointsDiscussed', e.target.value)} required />
        </div>

        <div>
          <label className="input-label">Deadlines Set</label>
          <textarea className="input-field" rows={2} placeholder="Action items and dates..." value={form.deadlinesSet} onChange={(e) => set('deadlinesSet', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--color-surface-low)', padding: '1rem', borderRadius: '0.75rem' }}>
           <div style={{ flex: 1 }}>
              <label className="input-label" style={{ marginBottom: '0.25rem' }}>Geotagged Pics *</label>
              <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>Attach up to 5 images (Max 100MB each)</p>
           </div>
           <button type="button" className={`btn-ghost ${form.geotag ? 'active' : ''}`} onClick={handleCaptureLocation} style={{ gap: '0.5rem', border: '1px solid var(--color-outline-variant)' }}>
              <MapPin size={16} /> {form.geotag ? 'Location Captured' : 'Tag Location'}
           </button>
           <button type="button" className="btn-secondary sm" onClick={() => fileInputRef.current.click()} style={{ gap: '0.5rem' }}>
              <ImagePlus size={16} /> Add Photos
           </button>
           <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => set('photos', [...form.photos, ...Array.from(e.target.files)])} />
        </div>

        {form.photos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
             {form.photos.map((p, i) => (
                <div key={i} className="chip" style={{ fontSize: '0.7rem' }}>
                   {p.name || `Photo ${i+1}`}
                   <X size={12} style={{ marginLeft: '0.5rem', cursor: 'pointer' }} onClick={() => set('photos', form.photos.filter((_, idx) => idx !== i))} />
                </div>
             ))}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 2 }}>
            <Send size={14} /> {submitting ? 'Submitting...' : 'Submit MOM'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const ViewModal = ({ mom, onClose, onStatusChange }) => {
  const { role, user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Permission Logic
  const isAdmin = ['Admin', 'Super Admin'].includes(role);
  const isTL = role === 'Team Lead';
  const isPending = mom.status === 'pending_approval';
  
  let canApprove = isAdmin;
  if (!canApprove && isTL) {
    const isVolunteerMom = mom.preparedByRole === 'Volunteer';
    const sameTeam = String(mom.teamId) === String(user.teamId);
    if (isVolunteerMom && sameTeam) canApprove = true;
  }

  const handleUpdateStatus = async (newStatus) => {
    setLoading(true);
    try {
      await api.patch(`/api/moms/${mom._id}/status`, { status: newStatus });
      onStatusChange();
      onClose();
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Minutes of Meeting Details" onClose={onClose}>
      <div style={{ display: 'grid', gap: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
               <span className="badge badge-primary">{mom.category}</span>
               <span className={`badge ${MOM_STATUS_META[mom.status]?.color || 'badge-neutral'}`}>
                  {MOM_STATUS_META[mom.status]?.label || mom.status}
               </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{mom.title}</h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
             <p style={{ margin: 0, fontWeight: 600 }}>{new Date(mom.meetingDate).toLocaleDateString()}</p>
             <p style={{ margin: 0, opacity: 0.6 }}>By {mom.preparedByName || 'Unknown'} ({mom.preparedByRole})</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <section>
             <label className="input-label" style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '0.25rem' }}>Agenda</label>
             <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{mom.agenda}</p>
          </section>
          <section>
             <label className="input-label" style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '0.25rem' }}>Attendees</label>
             <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{mom.attendees}</div>
          </section>
        </div>

        <section>
           <label className="input-label" style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '0.25rem' }}>Points Discussed</label>
           <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', lineHeight: 1.7, background: 'var(--color-surface-low)', padding: '1rem', borderRadius: '0.75rem' }}>
              {mom.pointsDiscussed}
           </div>
        </section>

        {mom.deadlinesSet && (
          <section>
             <label className="input-label" style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '0.25rem' }}>Deadlines & Actions</label>
             <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{mom.deadlinesSet}</div>
          </section>
        )}

        <div className="card-action-row" style={{ marginTop: '2rem', justifyContent: 'center', gap: '1rem' }}>
          {isPending && canApprove && (
            <>
              <button 
                className="btn-primary" 
                disabled={loading}
                onClick={() => handleUpdateStatus('approved')}
              >
                {loading ? 'Processing...' : 'Approve MOM'}
              </button>
              <button 
                className="btn-ghost" 
                style={{ color: 'var(--color-error)' }}
                disabled={loading}
                onClick={() => handleUpdateStatus('needs_revision')}
              >
                Request Revision
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={onClose} disabled={loading} style={{ padding: '0.625rem 2.5rem' }}>Close</button>
        </div>
      </div>
    </Modal>
  );
};

/* -------------------- MAIN PAGE -------------------- */

const Moms = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);
  const { role, user } = useAuthStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, tRes, cRes] = await Promise.all([
        api.get('/api/moms'),
        api.get('/api/organization/teams'),
        api.get('/api/moms/categories')
      ]);
      setItems(unwrap(mRes).items || []);
      setTeams(unwrap(tRes).rows || []);
      setCategories(unwrap(cRes).items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
     try {
       const res = await api.get('/api/moms/categories');
       setCategories(unwrap(res).items || []);
     } catch (e) {
       console.error(e);
     }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = () => {
    loadData();
  };

  return (
    <>
      <TopBar title="Minutes of Meeting" />
      <div className="page-body">
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
               <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>MOM Repository</h1>
               <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.6 }}>Track and manage meeting outcomes across units.</p>
            </div>
            <button className="btn-primary" onClick={() => setModal({ type: 'add' })}><PlusCircle size={16} /> New MOM</button>
         </div>

         {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
               <CardSkeleton count={6} />
            </div>
         ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', background: 'var(--color-surface)', borderRadius: '1rem', border: '1px dashed var(--color-outline-variant)' }}>
               <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--color-primary-fixed)', color: 'var(--color-primary)', borderRadius: '1rem', marginBottom: '1rem' }}>
                  <Edit2 size={32} />
               </div>
               <h3>No MOMs documented yet</h3>
               <p style={{ opacity: 0.6, maxWidth: '300px', margin: '0 auto' }}>Meetings are the heart of collaboration. Start by documenting your first meeting summary.</p>
            </div>
         ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
               {items.map(mom => (
                   <div key={mom._id} className="card" onClick={() => setModal({ type: 'view', mom })} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: mom.status === 'pending_approval' ? '4px solid var(--color-warning)' : '4px solid transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                         <div style={{ display: 'flex', gap: '0.375rem' }}>
                           <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>{mom.category}</span>
                           <span className={`badge ${MOM_STATUS_META[mom.status]?.color || 'badge-neutral'}`} style={{ fontSize: '0.6rem' }}>
                             {MOM_STATUS_META[mom.status]?.label || mom.status}
                           </span>
                         </div>
                         <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{new Date(mom.meetingDate).toLocaleDateString()}</span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{mom.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                         {mom.agenda}
                      </p>
                      <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                         <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>By {mom.preparedByName}</span>
                         <button className="btn-ghost sm" style={{ padding: '0.25rem 0.5rem' }}><Eye size={14} /> View</button>
                      </div>
                   </div>
               ))}
            </div>
         )}

         <button className="fab" onClick={() => setModal({ type: 'add' })}><PlusCircle size={24} /></button>

         {modal?.type === 'add' && (
            <MomFormModal 
              teams={teams} 
              categories={categories}
              user={user} 
              onCategoryAdded={loadCategories}
              onClose={() => setModal(null)} 
              onSave={handleSave} 
            />
         )}
         {modal?.type === 'view' && <ViewModal mom={modal.mom} onClose={() => setModal(null)} onStatusChange={loadData} />}
      </div>
    </>
  );
};

export default Moms;
