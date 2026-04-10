import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PlusCircle, Edit2, Plus,
  Eye, X, Send, ImagePlus, MapPin, ChevronRight
} from 'lucide-react';
import TopBar from '../components/TopBar';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/auth';
import { ROLES } from '../rbac';
import { API_BASE_URL, getErrorMessage } from '../lib/api';

// UI Components
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Alert from '../components/ui/Alert';

// Hooks
import { 
  useMoms, 
  useMomCategories, 
  useUpdateMomStatus, 
  useCreateMom, 
  useCreateMomCategory 
} from '../hooks/useMoms';
import { useTeams, useMembers } from '../hooks/useOrganization';
import { momService } from '../services/momService';

const MOM_STATUS_META = {
  draft: { label: 'Draft', variant: 'neutral' },
  pending_approval: { label: 'Pending Review', variant: 'warning' },
  approved: { label: 'Authorized', variant: 'success' },
  needs_revision: { label: 'Revision Needed', variant: 'error' }
};

/* -------------------- MODALS -------------------- */

const MomFormModal = ({ initial, teams, categories, onClose, onSave, user }) => {
  const [form, setForm] = useState({
    title: initial?.title || '',
    meetingDate: initial?.meetingDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    category: initial?.category || '',
    meetingType: initial?.meetingType || 'Tactical Sync',
    selectedAttendees: initial?.selectedAttendees || [],
    agenda: initial?.agenda || '',
    pointsDiscussed: initial?.pointsDiscussed || '',
    deadlinesSet: initial?.deadlinesSet || '',
    teamId: initial?.teamId || user?.teamId || '',
    geotag: initial?.geotag || null,
    photos: []
  });

  const { data: members = [], isLoading: membersLoading } = useMembers(form.teamId);
  const createMomMutation = useCreateMom();
  const createCategoryMutation = useCreateMomCategory();
  
  const [submitting, setSubmitting] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const fileInputRef = useRef();

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);

  const handleAddCategory = async () => {
     if (!newCat.trim()) return;
     try {
       await createCategoryMutation.mutateAsync(newCat.trim());
       set('category', newCat.trim());
       setNewCat('');
       setAddingCat(false);
     } catch (err) {
       console.error(err);
     }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
        alert("Geospatial capture failed. Ensure GPS permission.");
      });
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (form.photos.length === 0 && !initial) {
      alert("Artifact verification requires at least one geotagged photo.");
      return;
    }
    setSubmitting(true);
    try {
      const attendeeNames = members
        .filter(m => form.selectedAttendees.includes(m._id || m.id))
        .map(m => m.name);
      
      const payload = {
        title: form.title,
        meetingDate: form.meetingDate,
        category: form.category,
        meetingType: form.meetingType,
        attendees: attendeeNames.join(', '),
        agenda: form.agenda,
        pointsDiscussed: form.pointsDiscussed,
        deadlinesSet: form.deadlinesSet,
        teamId: form.teamId,
        geotag: form.geotag
      };

      const mom = await createMomMutation.mutateAsync(payload);
      const momId = mom._id || mom.id;

      if (form.photos.length > 0) {
        const uploadIntent = await momService.getUploadUrl(momId, form.photos.map(f => ({
          fileName: f.name,
          mimeType: f.type,
          sizeBytes: f.size
        })));
        
        for (let i = 0; i < form.photos.length; i++) {
          const file = form.photos[i];
          const intent = uploadIntent.items[i];
          if (!intent) continue;

          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PATCH', `${API_BASE_URL}${intent.uploadUrl}`);
            xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('authToken')}`);
            xhr.setRequestHeader('x-offset', '0');
            xhr.setRequestHeader('x-total-size', file.size);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Signal Upload Failed'));
            xhr.onerror = () => reject(new Error('Network Interference'));
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
    <Modal title={initial ? 'Configure Protocol Signature' : 'Initialize Mission Protocol (MOM)'} onClose={onClose} maxWidth="820px">
      <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.5rem', background: 'var(--color-surface-lowest)', padding: '0.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Protocol Subject *</label>
            <input className="input-field" style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }} placeholder="e.g. Operation Alpha Strategy Sync" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Classification *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select className="input-field" style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }} value={form.category} onChange={(e) => set('category', e.target.value)} required>
                 <option value="">Select Level</option>
                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Session Date *</label>
            <input type="date" className="input-field" style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }} value={form.meetingDate} onChange={(e) => set('meetingDate', e.target.value)} required />
          </div>
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Deployment Type *</label>
            <input className="input-field" style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }} placeholder="In-Person / Remote" value={form.meetingType} onChange={(e) => set('meetingType', e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Attendee Roster *</label>
          <div style={{ 
             display: 'flex', flexWrap: 'wrap', gap: '6px', 
             maxHeight: '130px', overflowY: 'auto', 
             border: '1.5px solid var(--color-outline-variant)', 
             padding: '1rem', borderRadius: '16px', background: 'var(--color-surface-low)' 
          }}>
             {membersLoading ? <div style={{ width: '100%', padding: '1rem', textAlign: 'center', opacity: 0.5 }}>Syncing local roster...</div> : members.map(m => {
               const isActive = form.selectedAttendees.includes(m._id || m.id);
               return (
                 <button
                    key={m._id || m.id}
                    type="button"
                    onClick={() => toggleAttendee(m._id || m.id)}
                    className="btn-ghost sm"
                    style={{ 
                      fontSize: '0.75rem', borderRadius: '10px', fontWeight: 700,
                      background: isActive ? 'var(--color-primary-fixed)' : 'transparent',
                      color: isActive ? 'var(--color-primary)' : 'inherit',
                      border: isActive ? '1px solid var(--color-primary-fixed)' : '1px solid var(--color-outline-variant)'
                    }}
                 >
                    {m.name}
                 </button>
               );
             })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Operational Agenda *</label>
            <textarea className="input-field" rows={3} style={{ borderRadius: '12px', background: 'var(--color-surface-low)', resize: 'none' }} placeholder="Primary mission objectives..." value={form.agenda} onChange={(e) => set('agenda', e.target.value)} required />
          </div>
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Actionable Deadlines</label>
            <textarea className="input-field" rows={3} style={{ borderRadius: '12px', background: 'var(--color-surface-low)', resize: 'none' }} placeholder="Critical unit deliverables..." value={form.deadlinesSet} onChange={(e) => set('deadlinesSet', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Intelligence Synthesis (Points Discussed) *</label>
          <textarea className="input-field" rows={6} style={{ borderRadius: '14px', background: 'var(--color-surface-low)', resize: 'none', lineHeight: 1.6 }} placeholder="Synthesize the mission results, dialogue, and final decisions..." value={form.pointsDiscussed} onChange={(e) => set('pointsDiscussed', e.target.value)} required />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--color-surface-low)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--color-outline-variant)' }}>
           <div style={{ flex: 1 }}>
              <label className="input-label" style={{ marginBottom: '2px', fontWeight: 800, fontSize: '0.7rem' }}>Verification Artifacts *</label>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase' }}>Secure photo & location coordinates</p>
           </div>
           <div style={{ display: 'flex', gap: '8px' }}>
             <button type="button" className={`btn-ghost sm ${form.geotag ? 'active' : ''}`} style={{ borderRadius: '10px' }} onClick={handleCaptureLocation}>
                <MapPin size={16} /> {form.geotag ? 'Signal Fixed' : 'Geotag Signal'}
             </button>
             <button type="button" className="btn-primary sm" style={{ borderRadius: '10px' }} onClick={() => fileInputRef.current.click()}>
                <ImagePlus size={16} /> Add Media
             </button>
           </div>
           <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => set('photos', [...form.photos, ...Array.from(e.target.files)])} />
        </div>

        {form.photos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
             {form.photos.map((p, i) => (
                <Badge key={i} variant="neutral" style={{ padding: '8px 14px', borderRadius: '10px', fontWeight: 800 }}>
                   {p.name.length > 20 ? p.name.slice(0, 18) + '...' : p.name}
                   <X size={14} style={{ marginLeft: '10px', cursor: 'pointer', opacity: 0.5 }} onClick={() => set('photos', form.photos.filter((_, idx) => idx !== i))} />
                </Badge>
             ))}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '0.5rem', gap: '8px' }}>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, borderRadius: '12px' }}>Abort Mission</button>
          <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 2, padding: '14px', borderRadius: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
             {submitting ? 'Transmitting...' : 'Dispatch Protocol'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const ViewModal = ({ mom, onClose, onStatusChange }) => {
  const { role, user } = useAuthStore();
  const updateStatusMutation = useUpdateMomStatus();
  const [processing, setProcessing] = useState(false);

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);
  const isTL = role === ROLES.TEAM_LEAD;
  const isPending = mom.status === 'pending_approval';
  
  let canApprove = isAdmin;
  if (!canApprove && isTL) {
    const isVolunteerMom = mom.preparedByRole === 'Volunteer';
    const sameTeam = String(mom.teamId) === String(user.teamId);
    if (isVolunteerMom && sameTeam) canApprove = true;
  }

  const handleUpdateStatus = async (newStatus) => {
    setProcessing(true);
    try {
      await updateStatusMutation.mutateAsync({ id: mom._id || mom.id, status: newStatus });
      onStatusChange();
      onClose();
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal title="Secure Protocol Insight" onClose={onClose} maxWidth="850px">
      <div style={{ display: 'grid', gap: '2rem', background: 'var(--color-surface-lowest)', padding: '0.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
               <Badge variant="primary" style={{ fontWeight: 800 }}>{mom.category}</Badge>
               <Badge variant={MOM_STATUS_META[mom.status]?.variant || 'neutral'} style={{ fontWeight: 800 }}>
                  {(MOM_STATUS_META[mom.status]?.label || mom.status).toUpperCase()}
               </Badge>
            </div>
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--color-on-surface)' }}>{mom.title}</h2>
          </div>
          <div style={{ textAlign: 'right', background: 'var(--color-surface-low)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid var(--color-outline-variant)' }}>
             <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>{new Date(mom.meetingDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
             <p style={{ margin: '4px 0 0', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5 }}>AUTHOR: {mom.preparedByName || 'Command Center'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
          <div>
             <label className="input-label" style={{ fontWeight: 900, fontSize: '0.65rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--color-outline-variant)', pb: '8px', mb: '16px', display: 'block' }}>Operational Objectives</label>
             <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-on-surface)', fontWeight: 500 }}>{mom.agenda}</p>
          </div>
          <div>
             <label className="input-label" style={{ fontWeight: 900, fontSize: '0.65rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--color-outline-variant)', pb: '8px', mb: '16px', display: 'block' }}>Registry of Personnel</label>
             <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', lineHeight: 1.7, fontWeight: 600, opacity: 0.8 }}>{mom.attendees}</div>
          </div>
        </div>

        <div>
           <label className="input-label" style={{ fontWeight: 900, fontSize: '0.65rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--color-outline-variant)', pb: '8px', mb: '16px', display: 'block' }}>Meeting Intelligence Synthesis</label>
           <div style={{ fontSize: '1.05rem', whiteSpace: 'pre-line', lineHeight: 1.9, background: 'var(--color-surface-low)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', boxShadow: '0 8px 16px rgba(0,0,0,0.02)' }}>
              {mom.pointsDiscussed}
           </div>
        </div>

        {mom.deadlinesSet && (
          <div>
             <label className="input-label" style={{ fontWeight: 900, fontSize: '0.65rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--color-outline-variant)', pb: '8px', mb: '16px', display: 'block' }}>Critical Deliverables</label>
             <div style={{ fontSize: '1rem', whiteSpace: 'pre-line', lineHeight: 1.7, fontWeight: 600, color: 'var(--color-on-surface)' }}>{mom.deadlinesSet}</div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1rem', borderTop: '1.5px solid var(--color-outline-variant)', paddingTop: '2rem', gap: '12px' }}>
          {isPending && canApprove && (
            <>
              <button className="btn-primary" disabled={processing} onClick={() => handleUpdateStatus('approved')} style={{ flex: 1.5, borderRadius: '14px', fontWeight: 900 }}>
                {processing ? 'Processing...' : 'Authorize Protocol'}
              </button>
              <button className="btn-ghost" style={{ color: 'var(--color-error)', flex: 1, borderRadius: '14px', fontWeight: 700 }} disabled={processing} onClick={() => handleUpdateStatus('needs_revision')}>
                Issue Revision
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={onClose} disabled={processing} style={{ flex: 1, borderRadius: '14px', fontWeight: 700 }}>Exit Directive</button>
        </div>
      </div>
    </Modal>
  );
};

const Moms = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModal = searchParams.get('modal');
  const selectedParamId = searchParams.get('id');

  const { user } = useAuthStore();
  const { data: items = [], isLoading: momsLoading, refetch } = useMoms();
  const { data: teams = [] } = useTeams();
  const { data: categories = [] } = useMomCategories();

  const setModal = (m) => {
    if (!m) {
      searchParams.delete('modal');
      searchParams.delete('id');
    } else {
      searchParams.set('modal', m.type);
      if (m.id) searchParams.set('id', m.id);
    }
    setSearchParams(searchParams);
  };

  const currentMom = selectedParamId ? items.find(m => String(m._id || m.id) === String(selectedParamId)) : null;

  return (
    <>
      <TopBar title="Mission Protocols (MOM)" />
      <div className="page-body">
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
               <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Operation Archives</h1>
               <p style={{ margin: '0.75rem 0 0', fontSize: '1rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Archival and verification repository for strategic collaborative intelligence.</p>
            </div>
            <button className="btn-primary" onClick={() => setModal({ type: 'add' })} style={{ padding: '0.875rem 1.75rem', borderRadius: '14px', fontWeight: 900 }}>
               <PlusCircle size={22} /> Generate New Protocol
            </button>
         </div>

         {momsLoading ? (
            <div className="moms-grid-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '2rem' }}>
               {[...Array(6)].map((_, i) => (
                 <div key={i} className="skeleton" style={{ height: '240px', borderRadius: '24px' }} />
               ))}
            </div>
         ) : items.length === 0 ? (
            <EmptyState 
              title="Archive Empty" 
              message="No strategic protocols have been indexed. Collective intelligence begins with systematic documentation." 
            />
         ) : (
            <div className="moms-grid-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '2rem' }}>
               {items.map(mom => {
                 const mid = mom._id || mom.id;
                 return (
                    <div 
                      key={mid} 
                      className="card" 
                      onClick={() => setModal({ type: 'view', id: mid })} 
                      style={{ 
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1.25rem', 
                        padding: '1.75rem', borderRadius: '24px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid var(--color-outline-variant)',
                        background: 'var(--color-surface-low)',
                        borderLeft: mom.status === 'pending_approval' ? '8px solid var(--color-warning)' : '8px solid transparent',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.03)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-6px)';
                        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.03)';
                      }}
                    >
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                             <Badge variant="primary" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>{mom.category}</Badge>
                             <Badge variant={MOM_STATUS_META[mom.status]?.variant || 'neutral'} style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>
                               {MOM_STATUS_META[mom.status]?.label || mom.status}
                             </Badge>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-outline)', opacity: 0.6 }}>{new Date(mom.meetingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                       </div>
                       <div style={{ flex: 1 }}>
                         <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.3, color: 'var(--color-on-surface)' }}>{mom.title}</h3>
                         <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {mom.agenda}
                         </p>
                       </div>
                       <div style={{ marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1.5px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                             <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, color: '#fff' }}>
                                {(mom.preparedBy || mom.preparedByName || 'A').charAt(0)}
                             </div>
                             <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-on-surface)', opacity: 0.7 }}>{mom.preparedBy || mom.preparedByName}</span>
                          </div>
                          <ChevronRight size={18} style={{ color: 'var(--color-primary)', opacity: 0.4 }} />
                       </div>
                    </div>
                 );
               })}
            </div>
         )}

         <button className="fab" onClick={() => setModal({ type: 'add' })} style={{ borderRadius: '20px', width: 64, height: 64 }}><PlusCircle size={32} /></button>

         {/* MODAL DISPATCHER */}
         {activeModal === 'add' && <MomFormModal teams={teams} categories={categories} user={user} onClose={() => setModal(null)} onSave={refetch} />}
         {activeModal === 'view' && currentMom && <ViewModal mom={currentMom} onClose={() => setModal(null)} onStatusChange={refetch} />}
      </div>
    </>
  );
};

export default Moms;
