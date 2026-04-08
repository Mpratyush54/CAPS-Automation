import { useEffect, useRef, useState } from 'react';
import { 
  Calendar, Camera, Edit2, Eye, FileText, ImagePlus, Info, Lock, MapPin, 
  PlusCircle, Save, Trash2, Users, X, AlertCircle, ChevronLeft, ChevronRight, 
  ClipboardList, Settings, Upload, UserPlus, Plus, Download, FilePlus, GripVertical, CheckCircle, Loader2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Image, Link, RotateCcw, RotateCw, Palette
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { api, API_BASE_URL, formatDateTime, getErrorMessage, unwrap } from '../lib/api';
import { normalizeEvent } from '../lib/adapters';
import { CardSkeleton } from '../components/Skeleton';

const statusColors = { upcoming: 'badge-primary', ongoing: 'badge-warning', completed: 'badge-success' };

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
              const id = t._id?.$oid || t._id;
              const isSelected = form.teamIds.includes(id);
              return (
                <div
                  key={id}
                  onClick={() => toggleTeam(id)}
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

const FilePreview = ({ file, progress, onRemove, disabled }) => {
  const [url, setUrl] = useState(null);
  const isDone = progress === 100;

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;

  return (
    <div className="card" style={{ padding: '0.25rem', position: 'relative', overflow: 'hidden', height: '110px', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
      <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.375rem', opacity: isDone ? 0.4 : 1 }} />
      {disabled && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
          {progress || 0}%
        </div>
      )}
      {!disabled && (
        <button onClick={onRemove} style={{ position: 'absolute', top: 2, right: 2, background: 'var(--color-error)', border: 'none', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}>
          <X size={12} />
        </button>
      )}
    </div>
  );
};
const PhotoItem = ({ photo, onClick }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [thumbUrl, setThumbUrl] = useState(null);
  const displayUrl = photo?.displayUrl || '';
  const src = displayUrl.startsWith('http') ? displayUrl : `${API_BASE_URL}${displayUrl}`;
  const isSyncing = !displayUrl;

  useEffect(() => {
    if (!displayUrl) return;
    let active = true;
    const loadThumb = async () => {
      try {
        const response = await api.get(src, { responseType: 'blob' });
        if (!active) return;
        const url = URL.createObjectURL(response.data);
        setThumbUrl(url);
        setLoading(false);
      } catch (err) {
        if (active) {
          console.error('Thumb load failed', err);
          setError(true);
          setLoading(false);
        }
      }
    };
    loadThumb();
    return () => {
      active = false;
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    };
  }, [src]);

  return (
    <div 
      className="card" 
      onClick={() => !loading && !error && !isSyncing && onClick(photo)} 
      style={{ 
        padding: '0.25rem', 
        position: 'relative', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column', 
        cursor: (loading || error || isSyncing) ? 'default' : 'zoom-in',
        transform: 'translateZ(0)', 
        backfaceVisibility: 'hidden',
        contain: 'strict',
        height: '220px',
        willChange: 'transform'
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1', width: '100%', overflow: 'hidden', borderRadius: '0.375rem', background: 'var(--color-surface-low)' }}>
        {(loading || isSyncing) && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            gap: '0.5rem',
            background: 'var(--color-surface-low)'
          }}>
            <Loader2 className="animate-spin" size={20} style={{ color: 'var(--color-primary)', opacity: 0.6 }} />
            {isSyncing && <span style={{ fontSize: '0.625rem', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Syncing</span>}
          </div>
        )}
        {!isSyncing && thumbUrl && (
          <img
            src={error ? 'https://via.placeholder.com/180?text=Error' : thumbUrl}
            alt={photo.fileName}
            decoding="async"
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'opacity 0.25s ease-in-out',
              transform: 'translateZ(0)', 
              backfaceVisibility: 'hidden'
            }}
          />
        )}
      </div>
      <div style={{ padding: '0.4rem 0.25rem 0.25rem', fontSize: '0.7rem' }}>
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-on-surface)' }}>{photo.fileName}</div>
        <div style={{ opacity: 0.7, color: 'var(--color-on-surface-variant)' }}>{isSyncing ? 'Processing asset...' : `By ${photo.uploadedByName || 'User'}`}</div>
      </div>
    </div>
  );
};

const Lightbox = ({ photo, onNext, onPrev, hasNext, hasPrev, onClose }) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const displayUrl = photo?.displayUrl || '';
  const src = displayUrl.startsWith('http') ? displayUrl : `${API_BASE_URL}${displayUrl}`;

  useEffect(() => {
    if (!displayUrl) return;
    let active = true;
    const loadLargeImage = async () => {
      setLoading(true);
      setProgress(0);
      try {
        const response = await api.get(src, {
          responseType: 'blob',
          onDownloadProgress: (e) => {
            if (e.total && active) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          }
        });
        
        if (!active) return;
        const url = URL.createObjectURL(response.data);
        setBlobUrl(url);
      } catch (err) {
        console.error('Failed to load high-res image', err);
        // Fallback or error state
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLargeImage();
    return () => { 
      active = false; 
      if (blobUrl) URL.revokeObjectURL(blobUrl); 
    };
  }, [src]);

  const handleImageLoad = (e) => {
    setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
  };

  const handleZoom = (e) => {
    e.stopPropagation();
    if (scale === 1) {
      setScale(2.5);
      const { left, top, width: containerW, height: containerH } = e.currentTarget.parentElement.getBoundingClientRect();
      const xPct = (e.clientX - left) / containerW;
      const yPct = (e.clientY - top) / containerH;
      setTranslate({ x: (0.5 - xPct) * (containerW * 1.5), y: (0.5 - yPct) * (containerH * 1.5) });
    } else {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  };

  const handleMouseMove = (e) => {
    if (scale === 1 || !naturalSize.w) return;
    const { width: containerW, height: containerH, left, top } = e.currentTarget.parentElement.getBoundingClientRect();
    const containerRatio = containerW / containerH;
    const imageRatio = naturalSize.w / naturalSize.h;
    let dispW, dispH;
    if (imageRatio > containerRatio) { dispW = containerW; dispH = containerW / imageRatio; }
    else { dispW = containerH * imageRatio; dispH = containerH; }

    const maxTX = (dispW * (scale - 1)) / 2;
    const maxTY = (dispH * (scale - 1)) / 2;
    const targetX = (0.5 - (e.clientX - left) / containerW) * (dispW * (scale - 1));
    const targetY = (0.5 - (e.clientY - top) / containerH) * (dispH * (scale - 1));

    setTranslate({
      x: Math.max(-maxTX, Math.min(maxTX, targetX)),
      y: Math.max(-maxTY, Math.min(maxTY, targetY))
    });
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' && hasNext) { onNext(); setScale(1); setTranslate({ x: 0, y: 0 }); }
      if (e.key === 'ArrowLeft' && hasPrev) { onPrev(); setScale(1); setTranslate({ x: 0, y: 0 }); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hasNext, hasPrev, onNext, onPrev, onClose]);

  return (
    <div className="modal-overlay full" onClick={onClose} style={{ zIndex: 110, background: 'rgba(0,0,0,0.98)', backdropFilter: 'blur(20px)', padding: 0 }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '1rem', flexDirection: 'column', zIndex: 120 }}>
          <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={48} style={{ opacity: 0.2 }} />
            <div style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 700 }}>{progress}%</div>
            <svg style={{ position: 'absolute', transform: 'rotate(-90deg)', width: '64px', height: '64px' }}>
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * progress) / 100} style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Downloading High Resolution</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>Large file support enabled (up to 100MB)</div>
          </div>
        </div>
      )}

      {/* Navigation Layer */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', pointerEvents: 'none', zIndex: 125 }}>
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev(); setScale(1); setTranslate({ x: 0, y: 0 }); }} 
          disabled={!hasPrev}
          style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: hasPrev ? 'pointer' : 'default', opacity: hasPrev ? 1 : 0, borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}
        >
          <ChevronLeft size={32} />
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); onNext(); setScale(1); setTranslate({ x: 0, y: 0 }); }} 
          disabled={!hasNext}
          style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: hasNext ? 'pointer' : 'default', opacity: hasNext ? 1 : 0, borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}
        >
          <ChevronRight size={32} />
        </button>
      </div>

      <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 135, pointerEvents: 'auto' }}>
        <X size={20} />
      </button>
      
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {blobUrl && (
          <img 
            src={blobUrl} 
            key={photo._id}
            alt={photo.fileName} 
            crossOrigin="anonymous"
            onLoad={handleImageLoad}
            onClick={handleZoom}
            onMouseMove={handleMouseMove}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain', 
              transition: scale === 1 ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s' : 'transform 0.15s ease-out', 
              transform: `scale(${scale}) translate3d(${translate.x / scale}px, ${translate.y / scale}px, 0)`,
              cursor: scale === 1 ? 'zoom-in' : 'zoom-out',
              opacity: loading ? 0 : 1,
              pointerEvents: 'auto',
              willChange: 'transform'
            }} 
          />
        )}
      </div>
      
      {!loading && (
        <div style={{ position: 'absolute', bottom: '2rem', left: '0', right: '0', textAlign: 'center', color: '#fff', pointerEvents: 'none', zIndex: 120 }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.8)', marginBottom: '0.375rem' }}>{photo.fileName}</div>
          <div style={{ fontSize: '0.8125rem', opacity: 0.8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-block', padding: '0.375rem 1rem', borderRadius: '9999px', backdropFilter: 'blur(10px)' }}>
            Uploaded by {photo.uploadedByName} • Click to zoom • Move to pan
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------- REPORT & DOC COMPONENTS -------------------- */

const AVAILABLE_DATA_KEYS = [
  { group: 'Event Core', keys: ['event.title', 'event.date', 'event.location', 'event.startTime', 'event.description'] },
  { group: 'Participants', keys: ['event.attendeeCount', 'event.teamNames'] },
  { group: 'Media & Evidence', keys: ['event.photos'] },
  { group: 'Organizer', keys: ['event.createdBy_name'] }
];

const TemplateManager = ({ onUpdate, templates }) => {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', fields: [], defaultContent: '', version: 1, docxFileId: '' });
  const [uploading, setUploading] = useState(false);
  const [newField, setNewField] = useState({ key: '', label: '', type: 'text' });
  const [editingKey, setEditingKey] = useState(null);
  const docRef = useRef();
  const editorRef = useRef();

  useEffect(() => {
    if (!window.mammoth) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.21/mammoth.browser.min.js";
      document.head.appendChild(script);
    }
  }, []);

  const formatDoc = (cmd, val = null) => {
    editorRef.current.focus();
    document.execCommand(cmd, false, val);
    setForm(prev => ({ ...prev, defaultContent: editorRef.current.innerHTML }));
  };

  const onDrop = (e) => {
    e.preventDefault();
    const metric = e.dataTransfer.getData('metric');
    if (!metric) return;
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (range) {
       const selection = window.getSelection();
       selection.removeAllRanges();
       selection.addRange(range);
       document.execCommand('insertText', false, ` {{${metric}}} `);
       setForm(prev => ({ ...prev, defaultContent: editorRef.current.innerHTML }));
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        const result = await window.mammoth.convertToHtml({ arrayBuffer });
        if (editorRef.current) {
          editorRef.current.innerHTML = result.value;
          setForm(prev => ({ ...prev, defaultContent: result.value }));
        }
      };
      reader.readAsArrayBuffer(file);
      const payload = { fileName: file.name, mimeType: file.type, sizeBytes: file.size };
      const { uploadUrl, fileId } = unwrap(await api.post('/api/events/template-docx/upload-url', payload));
      const realUrl = uploadUrl.startsWith('http') ? uploadUrl : `${API_BASE_URL}${uploadUrl}`;
      await new Promise((resolve, reject) => {
         const xhr = new XMLHttpRequest();
         xhr.open('PATCH', realUrl);
         xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('authToken')}`);
         xhr.onload = () => xhr.status < 300 ? resolve() : reject();
         xhr.onerror = reject;
         xhr.send(file);
      });
      setForm(prev => ({ ...prev, docxFileId: fileId }));
    } catch (e) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const addSchemaField = () => {
    if (!newField.label) return;
    const key = newField.label.toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    setForm(prev => {
      const existingIdx = editingKey ? prev.fields.findIndex(f => f.key === editingKey) : -1;
      const newFields = [...prev.fields];
      if (existingIdx > -1) {
        newFields[existingIdx] = { ...newField, key };
      } else {
        newFields.push({ ...newField, key });
      }
      return { ...prev, fields: newFields };
    });
    setNewField({ key: '', label: '', type: 'text' });
    setEditingKey(null);
  };

  const handleEditTemplate = (t) => {
    setForm({ ...t, fields: t.fields || [], defaultContent: t.defaultContent || '' });
    setAdding(true);
  };

  const handleSave = async () => {
    const finalContent = editorRef.current.innerHTML;
    if (!form.name || !finalContent) return alert('Name and content required');
    
    if (form._id) {
       const confirmUpdate = window.confirm("You are about to modify a PRE-EXISTING template. This will update the layout for all UNFINISHED reports using this template. Would you like to proceed and increment the version?");
       if (!confirmUpdate) return;
       form.version = (form.version || 1) + 1;
    }

    try {
      await api.post('/api/events/templates', { ...form, defaultContent: finalContent });
      setAdding(false);
      setForm({ name: '', description: '', fields: [], defaultContent: '', version: 1, docxFileId: '' });
      setEditingKey(null);
      onUpdate();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  if (!adding) {
    return (
       <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ margin: 0, fontWeight: 700 }}>Studio Templates</h3>
             <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> New Architect</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
             {templates.map(t => (
               <div key={t._id} className="card" style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e8eaed', position: 'relative' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0, color: '#1a1a1a' }}>{t.name}</h4>
                    <span style={{ fontSize: '0.65rem', background: '#e1e0ff', padding: '2px 8px', borderRadius: '4px' }}>v{t.version}</span>
                 </div>
                 <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', opacity: 0.5 }}>{t.fields?.length || 0} Dynamic Tags</p>
                 <button className="btn-secondary sm" style={{ width: '100%' }} onClick={() => handleEditTemplate(t)}>Edit Design</button>
               </div>
             ))}
          </div>
       </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: '#f1f3f4', display: 'flex', flexDirection: 'column', color: '#3c4043' }}>
      {/* TOOLBAR SYSTEM */}
      <div style={{ background: 'white', borderBottom: '1px solid #ddd', padding: '0.4rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.3rem' }}>
          <FileText size={24} color="#4285f4" />
          <input 
            className="h3"
            style={{ border: 'none', background: 'transparent', outline: 'none', margin: 0, fontWeight: 500, width: '400px' }} 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            placeholder="Untitled Project" 
          />
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={() => setAdding(false)}>Exit Designer</button>
          <button className="btn-primary" style={{ borderRadius: '24px', background: '#4285f4' }} onClick={handleSave}>Finalize Report</button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
           <button onClick={() => formatDoc('undo')} className="toolbar-btn" title="Undo (Ctrl+Z)"><RotateCcw size={14} /><span style={{ fontSize: '11px', marginLeft: '4px' }}>Undo</span></button>
           <button onClick={() => formatDoc('redo')} className="toolbar-btn" title="Redo (Ctrl+Y)"><RotateCw size={14} /><span style={{ fontSize: '11px', marginLeft: '4px' }}>Redo</span></button>
           <div className="toolbar-sep" />
           <select style={{ border: 'none', fontSize: '12px', background: '#f1f3f4', borderRadius: '4px', padding: '2px 4px' }} onChange={(e) => formatDoc('fontSize', e.target.value)}>
             <option value="3">Normal</option>
             <option value="5">Sub-heading</option>
             <option value="7">Giant</option>
           </select>
           <div className="toolbar-sep" />
           <button onClick={() => formatDoc('bold')} className="toolbar-btn"><Bold size={15} /></button>
           <button onClick={() => formatDoc('italic')} className="toolbar-btn"><Italic size={15} /></button>
           <button onClick={() => formatDoc('underline')} className="toolbar-btn"><Underline size={15} /></button>
           <button onClick={() => { const c = prompt('Hex Color'); if(c) formatDoc('foreColor', c); }} className="toolbar-btn"><Palette size={15} /></button>
           <div className="toolbar-sep" />
           <button onClick={() => formatDoc('justifyLeft')} className="toolbar-btn"><AlignLeft size={15} /></button>
           <button onClick={() => formatDoc('justifyCenter')} className="toolbar-btn"><AlignCenter size={15} /></button>
           <button onClick={() => formatDoc('justifyRight')} className="toolbar-btn"><AlignRight size={15} /></button>
           <button onClick={() => {
              const url = prompt('Enter URL (e.g. https://google.com)');
              if(url) formatDoc('createLink', url);
           }} className="toolbar-btn" title="Insert Link"><Link size={15} /></button>
           <div className="toolbar-sep" />
           <button onClick={() => formatDoc('insertUnorderedList')} className="toolbar-btn"><List size={15} /></button>
           <button onClick={() => formatDoc('removeFormat')} className="toolbar-btn" style={{ fontSize: '10px', fontWeight: 900 }}>Tx</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', flex: 1, overflow: 'hidden' }}>
        <div style={{ background: 'white', borderRight: '1px solid #ddd', padding: '1.25rem', overflowY: 'auto' }}>
           <h6 style={{ fontSize: '0.65rem', fontWeight: 900, color: '#70757a', marginBottom: '1rem', letterSpacing: '0.5px' }}>EVENT METRICS</h6>
           {AVAILABLE_DATA_KEYS.map(group => (
              <div key={group.group} style={{ marginBottom: '1.25rem' }}>
                 <p style={{ fontSize: '0.7rem', color: '#4285f4', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{group.group}</p>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {group.keys.map(k => (
                      <div key={k} draggable onDragStart={e => e.dataTransfer.setData('metric', k)} className="studio-chip">
                        {k.split('.').pop().replace(/_/g, ' ')}
                      </div>
                    ))}
                 </div>
              </div>
           ))}
        </div>

        <div style={{ overflowY: 'auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', scrollBehavior: 'smooth' }}>
           <div className="paper-bundle">
              <div 
                ref={editorRef}
                className="report-canvas paper-page"
                contentEditable
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                dangerouslySetInnerHTML={{ __html: form.defaultContent || '<div style="text-align:center; padding-top:200px;"><h1>Architect Your Report</h1><p>Drag elements here...</p></div>' }}
              />
              <div className="page-break-line"><span style={{ background:'#f1f3f4', padding:'0 1rem' }}>Page 2 Transition</span></div>
              <div className="paper-page" style={{ height: '297mm', pointerEvents: 'none', background: 'white', borderTop: 'none' }} />
           </div>
        </div>

        <div style={{ background: 'white', borderLeft: '1px solid #ddd', padding: '1.25rem', overflowY: 'auto' }}>
           <h6 style={{ fontSize: '0.65rem', fontWeight: 900, color: '#70757a', marginBottom: '1rem' }}>FIELD ARCHITECT</h6>
           <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e8eaed', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', opacity: 0.6 }}>Add a field that users must fill out:</p>
              <input type="text" className="input-field sm" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} placeholder="Question Phrase (e.g. Key Outcomes)" style={{ marginBottom: '0.5rem', background: 'white' }} />
              <select className="input-field sm" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value})} style={{ marginBottom: '0.5rem', background: 'white', fontSize: '0.75rem' }}>
                 <option value="text">Short Answer</option>
                 <option value="textarea">Paragraph</option>
                 <option value="list">Bullet Points (List)</option>
                 <option value="image">Evidence Image</option>
                 <option value="number">Metric (Numeric)</option>
              </select>
              <button className="btn-primary" style={{ width: '100%', fontSize: '0.7rem', background: '#4285f4' }} onClick={addSchemaField}>
                {editingKey ? 'Update Question' : 'Add Question to Repository'}
              </button>
           </div>
           <p style={{ fontSize: '0.6rem', color: '#999', marginBottom: '1rem' }}>DRAG OR CLICK TO EDIT:</p>
           {form.fields.map((f, i) => (
              <div key={i} className="studio-chip custom" style={{ justifyContent: 'space-between' }}>
                <div draggable onDragStart={e => e.dataTransfer.setData('metric', `field.${f.key}`)} style={{ display: 'flex', alignItems: 'center' }}>
                   <GripVertical size={12} style={{ opacity: 0.3, marginRight: '8px' }} />
                   <span>{f.label}</span>
                </div>
                <button onClick={() => { setNewField(f); setEditingKey(f.key); }} className="btn-ghost sm" style={{ padding: '0 4px', opacity: 0.5 }}><Edit2 size={10} /></button>
              </div>
           ))}
           <div style={{ marginTop: '2rem' }}>
              <h6 style={{ fontSize: '0.65rem', fontWeight: 900, color: '#70757a', marginBottom: '1rem' }}>DOCUMENT BASE</h6>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => docRef.current.click()}>
                 <Upload size={14} /> {uploading ? 'Processing...' : 'Upload Word Doc'}
              </button>
              <input type="file" ref={docRef} style={{ display: 'none' }} accept=".docx" onChange={handleDocUpload} />
           </div>
        </div>
      </div>

      <style>{`
        .toolbar-btn { min-width: 32px; padding: 0 8px; height: 32px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 4px; cursor: pointer; color: #5f6368; }
        .toolbar-btn:hover { background: #f1f3f4; }
        .toolbar-sep { width: 1px; height: 18px; background: #ddd; margin: 0 4px; }
        .studio-chip { padding: 0.6rem 0.75rem; background: #f8f9fa; border: 1px solid #dadce0; border-radius: 4px; font-size: 13px; cursor: grab; color: #202124; display: flex; align-items: center; margin-bottom: 4px; }
        .studio-chip:hover { background: #f1f3f4; border-color: #4285f4; }
        .studio-chip.custom { background: #e6f4ea; border-color: #34a853; }
        .paper-bundle { width: 210mm; background: #eeeff1; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; }
        .paper-page { width: 100%; min-height: 297mm; padding: 25mm !important; background: white !important; color: #202124 !important; outline: none; box-sizing: border-box; text-align: left; }
        .page-break-line { width: 100%; border-top: 2px dashed #ccc; text-align: center; height: 1.5rem; margin: 4rem 0; font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; display: flex; align-items: center; justify-content: center; background: #eeeff1; }
      `}</style>
    </div>
  );
};

/* -------------------- BLOCK EDITOR COMPONENTS -------------------- */

const TableBlock = ({ data, onChange, isAdmin }) => {
  const rows = data.rows || [['Header 1', 'Header 2']];
  const updateCell = (ri, ci, val) => {
    const newRows = rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r);
    onChange({ ...data, rows: newRows });
  };
  const addRow = () => onChange({ ...data, rows: [...rows, new Array(rows[0].length).fill('')] });
  const addCol = () => onChange({ ...data, rows: rows.map(r => [...r, '']) });

  return (
    <div style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
      <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--color-surface-high)' }}>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ border: '1px solid var(--color-surface-high)', padding: '0.5rem' }}>
                   <input 
                     disabled={!isAdmin}
                     style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '0.875rem' }} 
                     value={cell} 
                     onChange={e => updateCell(ri, ci, e.target.value)} 
                   />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className="btn-ghost sm" style={{ fontSize: '0.7rem' }} onClick={addRow}><Plus size={10} /> Row</button>
          <button className="btn-ghost sm" style={{ fontSize: '0.7rem' }} onClick={addCol}><Plus size={10} /> Column</button>
        </div>
      )}
    </div>
  );
};

const ImagePicker = ({ photos, onSelect, onClose }) => (
  <Modal title="Select Photos" onClose={onClose} maxWidth="600px">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
      {photos.map(p => {
        const id = p._id?.$oid || p._id;
        const eventId = p.eventId?.$oid || p.eventId;
        return (
          <img 
            key={id} 
            src={`${API_BASE_URL}/api/events/${eventId}/photos/${id}/view`} 
            crossOrigin="anonymous"
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer', borderRadius: '0.5rem' }}
            onClick={() => { onSelect(p); onClose(); }}
          />
        );
      })}
    </div>
  </Modal>
);

const BlockEditor = ({ blocks, photos, onUpdate, isAdmin }) => {
  const [pickingImage, setPickingImage] = useState(false);

  const updateBlock = (id, updates) => {
    onUpdate(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const addBlock = (type) => {
    const newBlock = { id: crypto.randomUUID(), type, content: type === 'table' ? { rows: [['','']] } : '' };
    onUpdate([...blocks, newBlock]);
  };

  const removeBlock = (id) => onUpdate(blocks.filter(b => b.id !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {blocks.map(block => (
        <div key={block.id} style={{ position: 'relative', group: 'true' }}>
          {block.type === 'heading' && (
            <input 
              disabled={!isAdmin}
              className="h3" 
              style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontWeight: 700 }} 
              value={block.content} 
              onChange={e => updateBlock(block.id, { content: e.target.value })} 
              placeholder="Heading..."
            />
          )}
          {block.type === 'text' && (
            <textarea 
              disabled={!isAdmin}
              style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', resize: 'none', lineHeight: 1.8 }} 
              rows={3}
              value={block.content} 
              onChange={e => updateBlock(block.id, { content: e.target.value })} 
              placeholder="Start writing..."
            />
          )}
          {block.type === 'table' && <TableBlock isAdmin={isAdmin} data={block.content} onChange={val => updateBlock(block.id, { content: val })} />}
          {block.type === 'image' && (
            <div style={{ position: 'relative' }}>
               <img src={`${API_BASE_URL}/api/events/${block.content.eventId}/photos/${block.content._id}/view`} style={{ width: '100%', borderRadius: '1rem', marginBottom: '1rem' }} />
               {isAdmin && <button className="btn-ghost" style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'white', background: 'rgba(0,0,0,0.4)' }} onClick={() => removeBlock(block.id)}><X size={14} /></button>}
            </div>
          )}
          {isAdmin && block.type !== 'image' && (
            <button className="btn-ghost sm" onClick={() => removeBlock(block.id)} style={{ position: 'absolute', right: '-2.5rem', top: 0, opacity: 0.2 }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--color-surface-high)', paddingTop: '1.5rem' }}>
          <button className="btn-secondary sm" onClick={() => addBlock('heading')}><Plus size={14} /> Heading</button>
          <button className="btn-secondary sm" onClick={() => addBlock('text')}><Plus size={14} /> Text</button>
          <button className="btn-secondary sm" onClick={() => addBlock('table')}><Plus size={14} /> Table</button>
          <button className="btn-secondary sm" onClick={() => setPickingImage(true)}><ImagePlus size={14} /> Photo</button>
        </div>
      )}

      {pickingImage && <ImagePicker photos={photos} onClose={() => setPickingImage(false)} onSelect={p => {
        const newBlock = { id: crypto.randomUUID(), type: 'image', content: p };
        onUpdate([...blocks, newBlock]);
      }} />}
    </div>
  );
};

const ReportSection = ({ event, report, templates, activeTemplate, onUpdate, isAdmin, photos }) => {
  const [formData, setFormData] = useState(report?.formData || {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (report?.formData) setFormData(report.formData);
  }, [report]);

  const handleSaveData = async () => {
    setLoading(true);
    try {
      await api.patch(`/api/events/${event.id}/report`, { formData, status: 'Ready' });
      onUpdate();
      alert('Report Data Synchronized');
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const getInjectedContent = () => {
    let html = activeTemplate.defaultContent || '';
    const evIdString = String(event.id?.$oid || event.id || '');
    // System Keys
    const mapping = {
      'event.title': event.title || 'Untitled Event',
      'event.date': event.date ? new Date(event.date).toLocaleDateString() : 'TBD',
      'event.location': event.location || 'TBD',
      'event.startTime': event.startTime || 'TBD',
      'event.attendeeCount': event.attendeeCount || 0,
      'event.teamNames': event.teamNames?.join(', ') || 'General',
      'event.photos': `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0;">${(photos || []).slice(0,3).map(p => {
        const id = p._id?.$oid || p._id;
        return `<img src="${API_BASE_URL}/api/events/${evIdString}/photos/${id}/view?cb=${Date.now()}" crossorigin="anonymous" style="width:100%; height:150px; object-fit:cover; border-radius:4px;"/>`;
      }).join('')}</div>`
    };

    Object.entries(mapping).forEach(([k, v]) => {
      html = html.replace(new RegExp(`{{${k}}}`, 'g'), v);
    });

    // Custom Fields
    activeTemplate.fields.forEach(f => {
      let rawVal = formData[f.key];
      let val = rawVal || `<span style="color:#ccc">[Pending ${f.label}]</span>`;
      
      if (f.type === 'list' && rawVal) {
         const lines = String(rawVal).split('\n').filter(l => l.trim());
         const listItems = lines.map(l => `<li style="margin-bottom: 6px; text-align: left;">${l.trim()}</li>`).join('');
         val = `
           <div style="text-align: center; margin: 20px 0;">
             <ul style="display: inline-block; text-align: left; margin: 0; padding: 0 20px; list-style-position: inside; line-height: 1.6; min-width: 60%;">
               ${listItems}
             </ul>
           </div>
         `;
      }
      
      if (f.type === 'image' && rawVal) {
         const photoId = rawVal?.$oid || rawVal;
         const isUrl = String(photoId).startsWith('http');
         const src = isUrl ? photoId : `${API_BASE_URL}/api/events/${evIdString}/photos/${photoId}/view?cb=${Date.now()}`;
         
         const w = formData[`${f.key}_width`] || '100';
         const h = formData[`${f.key}_height`] || 'auto';
         
         const imgStyle = `max-width:100%; width:${w}%; height:${h === 'auto' ? 'auto' : h + 'px'}; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); object-fit: cover; display: block; margin: 0 auto;`;
         val = `<div style="text-align:center; margin: 20px 0; background: #f8f9fa; border-radius: 8px; padding: 10px; border: 1px solid #eee;"><img src="${src}" crossorigin="anonymous" alt="Evidence" style="${imgStyle}" onerror="this.parentElement.style.display='none'"/></div>`;
      }
      
      html = html.replace(new RegExp(`{{field.${f.key}}}`, 'g'), val);
    });

    return html;
  };

  const [pickingFor, setPickingFor] = useState(null);

  if (!activeTemplate) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
        <h3>Initialize Event Report</h3>
        <p style={{ opacity: 0.6, marginBottom: '2rem' }}>Select a format to start documentations</p>
        <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '400px', margin: '0 auto' }}>
          {templates.map(t => (
            <button key={t._id} className="btn-secondary" onClick={() => onUpdate({ ...report, templateId: t._id })} style={{ justifyContent: 'space-between' }}>
              {t.name} <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '0', height: '100%', overflow: 'hidden', background: '#f8f9fa' }}>
      <div style={{ background: 'white', borderRight: '1px solid #ddd', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h4 style={{ margin: 0, fontSize: '1rem' }}>Data Entry</h4>
           <button className="btn-primary" style={{ background: '#4285f4', borderRadius: '24px' }} onClick={handleSaveData} disabled={loading}><Save size={14} /> Submit Report</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {activeTemplate.fields.map(f => (
            <div key={f.key}>
              <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f6368', marginBottom: '8px', display: 'block' }}>{f.label}</label>
              
              {f.type === 'list' && (
                <textarea 
                  className="input-field" 
                  placeholder="Enter one point per line..."
                  style={{ minHeight: '120px', fontSize: '13px', border: '1px solid #ddd', lineHeight: '1.5' }} 
                  value={formData[f.key] || ''} 
                  onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
                />
              )}

              {f.type === 'textarea' && (
                <textarea 
                  className="input-field" 
                  style={{ minHeight: '100px', fontSize: '13px', border: '1px solid #ddd' }} 
                  value={formData[f.key] || ''} 
                  onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
                />
              )}

              {f.type === 'image' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8f9fa', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #eee' }}>
                   {formData[f.key] ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ position: 'relative' }}>
                           {(() => {
                             const photoVal = formData[f.key];
                             const photoId = photoVal?.$oid || photoVal;
                             const isUrl = String(photoId).startsWith('http');
                             const src = isUrl ? photoId : `${API_BASE_URL}/api/events/${event.id}/photos/${photoId}/view`;
                             return <img src={src} style={{ width: '100%', borderRadius: '6px', height: '120px', objectFit: 'cover' }} />;
                           })()}
                           <button className="btn-ghost sm" style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px' }} onClick={() => setFormData({...formData, [f.key]: ''})}><X size={12} /></button>
                        </div>
                        
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>IMAGE WIDTH: {formData[`${f.key}_width`] || 100}%</span>
                              <button className="btn-ghost sm" style={{ fontSize: '0.6rem' }} onClick={() => setFormData({...formData, [`${f.key}_width`]: 100})}>Reset</button>
                           </div>
                           <input 
                             type="range" min="20" max="100" step="5"
                             value={formData[`${f.key}_width`] || 100} 
                             onChange={e => setFormData({...formData, [`${f.key}_width`]: e.target.value})}
                             style={{ width: '100%', height: '4px', accentColor: '#4285f4' }}
                           />
                        </div>

                        <div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>AUTO-HEIGHT LIMIT: {formData[`${f.key}_height`] || 'Auto'}</span>
                              <button className="btn-ghost sm" style={{ fontSize: '0.6rem' }} onClick={() => setFormData({...formData, [`${f.key}_height`]: 'auto'})}>Default</button>
                           </div>
                           <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {['auto', '150', '300', '450'].map(h => (
                                <button 
                                  key={h}
                                  className={`btn-ghost sm ${ (formData[`${f.key}_height`] || 'auto') === h ? 'active' : '' }`} 
                                  style={{ flex: 1, fontSize: '0.65rem', padding: '2px', background: (formData[`${f.key}_height`] || 'auto') === h ? '#e8f0fe' : 'transparent', color: (formData[`${f.key}_height`] || 'auto') === h ? '#1967d2' : 'inherit' }}
                                  onClick={() => setFormData({...formData, [`${f.key}_height`]: h})}
                                >
                                  {h === 'auto' ? 'Auto' : h + 'px'}
                                </button>
                              ))}
                           </div>
                        </div>
                     </div>
                   ) : (
                     <button className="btn-secondary" onClick={() => setPickingFor(f.key)} style={{ width: '100%', fontSize: '0.75rem', padding: '1rem', borderStyle: 'dashed', borderRadius: '8px' }}><ImagePlus size={18} /> Choose Evidence Photo</button>
                   )}
                </div>
              )}

              {['text', 'number', 'date'].includes(f.type) && (
                <input 
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} 
                  className="input-field" 
                  style={{ fontSize: '13px', border: '1px solid #ddd' }} 
                  value={formData[f.key] || ''} 
                  onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowY: 'auto', padding: '3rem 1rem', background: '#eeeff1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         <div style={{ marginBottom: '1.5rem', color: '#5f6368', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1rem', background: 'white', borderRadius: '24px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Eye size={16} color="#4285f4" /> COMPLIANCE PREVIEW MODE
         </div>
         <div className="paper-bundle" style={{ transform: 'scale(1)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
            <div 
              className="report-canvas paper-page"
              style={{ pointerEvents: 'none' }}
              dangerouslySetInnerHTML={{ __html: getInjectedContent() }}
            />
            <div className="page-break-line" style={{ margin: '2rem 0' }}>End of Official Document</div>
         </div>
      </div>

      {pickingFor && (
        <ImagePicker 
          photos={photos} 
          onClose={() => setPickingFor(null)} 
          onSelect={p => {
            const id = p._id?.$oid || p._id;
            setFormData({...formData, [pickingFor]: id});
            setPickingFor(null);
          }} 
        />
      )}
    </div>
  );
};


const ConceptNoteSection = ({ event, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const docProxyUrl = event.conceptNoteFileId ? `${API_BASE_URL}/api/events/${event.id}/photos/${event.conceptNoteFileId}/view` : null;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const payload = { fileName: file.name, mimeType: file.type, sizeBytes: file.size };
      const { uploadUrl } = unwrap(await api.post(`/api/events/${event.id}/concept-note/upload-url`, payload));
      
      const realUrl = uploadUrl.startsWith('http') ? uploadUrl : `${API_BASE_URL}${uploadUrl}`;
      
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PATCH', realUrl);
        xhr.setRequestHeader('x-offset', '0');
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('authToken')}`);
        xhr.onload = () => xhr.status < 300 ? resolve() : reject();
        xhr.onerror = reject;
        xhr.send(file);
      });

      onUpdate();
      alert('Concept note uploaded');
    } catch (e) {
      alert('Upload failed: ' + getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Concept & Strategy</h3>
         <div style={{ display: 'flex', gap: '0.75rem' }}>
           <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.doc,.docx" />
           <button className="btn-primary" onClick={() => fileRef.current.click()} disabled={uploading}><Upload size={16} /> Upload Document</button>
           {docProxyUrl && <a href={docProxyUrl} target="_blank" className="btn-secondary" style={{ textDecoration: 'none' }}><Download size={16} /> Download</a>}
         </div>
      </div>

      {docProxyUrl ? (
        <div style={{ flex: 1, border: '1px solid var(--color-surface-high)', borderRadius: '1rem', background: 'var(--color-surface-low)', overflow: 'hidden', minHeight: '500px' }}>
           <iframe 
             src={`https://docs.google.com/viewer?url=${encodeURIComponent(docProxyUrl)}&embedded=true`} 
             style={{ width: '100%', height: '100%', border: 'none' }} 
             title="Concept Note Viewer"
           />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, border: '2px dashed var(--color-outline)', borderRadius: '1rem' }}>
           <ClipboardList size={48} style={{ marginBottom: '1rem' }} />
           <p>No concept note uploaded yet.</p>
        </div>
      )}
    </div>
  );
};

const EventWorkspace = ({ event, role, user, onClose }) => {
  const [photos, setPhotos] = useState([]);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [summary, setSummary] = useState({ people: [], teams: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gallery');
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]); // [File objects]
  const [uploadProgress, setUploadProgress] = useState({}); // { fileName: percentage }
  const [report, setReport] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const fileInputRef = useRef();

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);

  const loadReport = async () => {
    try {
      const res = await api.get(`/api/events/${event.id}/report`);
      setReport(unwrap(res));
    } catch (e) {
      console.error('Failed to load report:', e);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await api.get('/api/events/templates');
      setTemplates(unwrap(res).items || []);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get(`/api/events/${event.id}/photos`),
        (role !== 'Volunteer') ? api.get(`/api/events/${event.id}/photos/summary`) : Promise.resolve({ data: { people: [], teams: [] } })
      ]);
      setPhotos(unwrap(pRes).rows || []);
      setSummary(unwrap(sRes) || { people: [], teams: [] });
      await loadReport();
      if (isAdmin) await loadTemplates();
    } catch (e) {
      console.error('Failed to load workspace data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [event.id]);

  useEffect(() => {
    if (report?.templateId && templates.length > 0) {
      const t = templates.find(t => String(t._id) === String(report.templateId));
      setActiveTemplate(t);
    }
  }, [report, templates]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setSelectedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setUploadProgress({});
    
    const files = [...selectedFiles];
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

      // Step 2: Stream each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const item = items[i];
        const rawUrl = item?.uploadUrl || '';
        if (!rawUrl) continue;
        const uploadUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}${rawUrl}`;
        
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PATCH', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          xhr.setRequestHeader('x-offset', '0');
          xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('authToken')}`);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(prev => ({ ...prev, [file.name]: pct }));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: ${xhr.statusText}`));
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(file);
        });
      }

      loadData();
      setSelectedFiles([]);
      setUploadProgress({});
      setActiveTab('gallery');
    } catch (err) {
      alert('Upload failed: ' + getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title={`Workspace: ${event.title}`} onClose={onClose} maxWidth="900px">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-surface-high)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button className={`chip ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}><ImagePlus size={14} /> Gallery</button>
        <button className={`chip ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}><FileText size={14} /> Report</button>
        <button className={`chip ${activeTab === 'concept_note' ? 'active' : ''}`} onClick={() => setActiveTab('concept_note')}><ClipboardList size={14} /> Concept Note</button>
        <button className={`chip ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}><Upload size={14} /> Photo Upload</button>
        {isAdmin && <button className={`chip ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}><UserPlus size={14} /> Submissions</button>}
        {isAdmin && <button className={`chip ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}><Settings size={14} /> Template Setup</button>}
      </div>

      <div style={{ minHeight: '400px', maxHeight: '60vh', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>Loading...</div>
        ) : activeTab === 'gallery' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {photos.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No photos yet. Be the first to upload!</div>
            ) : photos.map(p => {
              const id = p._id?.$oid || p._id;
              return <PhotoItem key={id} photo={p} onClick={setViewingPhoto} />;
            })}
          </div>
        ) : activeTab === 'report' ? (
          <ReportSection 
            event={event} 
            report={report} 
            templates={templates} 
            activeTemplate={activeTemplate} 
            onUpdate={loadReport} 
            isAdmin={isAdmin}
            photos={photos}
          />
        ) : activeTab === 'concept_note' ? (
           <ConceptNoteSection 
             event={event} 
             onUpdate={loadData}
           />
        ) : activeTab === 'templates' ? (
           <TemplateManager onUpdate={loadTemplates} templates={templates} />
        ) : activeTab === 'upload' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', border: '2px dashed var(--color-outline)', borderRadius: '1rem', gap: '1rem', background: 'var(--color-surface-low)', cursor: 'pointer' }} onClick={() => !uploading && fileInputRef.current.click()}>
              <ImagePlus size={40} style={{ opacity: 0.3, color: 'var(--color-primary)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Click or drag to add photos</p>
                <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>Up to 100MB per file</p>
              </div>
              <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} disabled={uploading} />
            </div>

            {selectedFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
                  {selectedFiles.map((file, idx) => (
                    <FilePreview 
                      key={`${file.name}-${idx}`} 
                      file={file} 
                      progress={uploadProgress[file.name]} 
                      disabled={uploading} 
                      onRemove={() => removeSelectedFile(idx)} 
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-high)', padding: '1rem', borderRadius: '0.75rem' }}>
                  <div style={{ fontSize: '0.8125rem' }}>
                    <span style={{ fontWeight: 700 }}>{selectedFiles.length}</span> photos selected
                  </div>
                  <button className="btn-primary" onClick={startUpload} disabled={uploading || selectedFiles.length === 0}>
                    {uploading ? 'Uploading...' : 'Start Upload'}
                  </button>
                </div>
              </div>
            )}
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
      {viewingPhoto && (
        <Lightbox 
          photo={viewingPhoto} 
          onClose={() => setViewingPhoto(null)} 
          onNext={() => {
            const idx = photos.findIndex(p => p._id === viewingPhoto._id);
            if (idx < photos.length - 1) setViewingPhoto(photos[idx + 1]);
          }}
          onPrev={() => {
            const idx = photos.findIndex(p => p._id === viewingPhoto._id);
            if (idx > 0) setViewingPhoto(photos[idx - 1]);
          }}
          hasNext={photos.findIndex(p => p._id === viewingPhoto._id) < photos.length - 1}
          hasPrev={photos.findIndex(p => p._id === viewingPhoto._id) > 0}
        />
      )}
    </Modal>
  );
};

const EventCard = ({ event, role, teams, onWorkspace, onEdit, onDelete }) => {
  const canManage = can(role, 'manageCommitteeEvents');
  const canDelete = can(role, 'createWingEvent');
  const status = (event.status || 'upcoming').toLowerCase();

  // Resolve team names from normalized event data or fallback to global teams list
  const teamNames = event.teams?.length > 0 
    ? event.teams.map(t => t.name)
    : (event.teamIds || []).map(id => {
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
          <div className="events-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
             <CardSkeleton count={6} />
          </div>
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
