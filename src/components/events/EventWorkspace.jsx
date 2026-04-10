import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ROLES } from '../../rbac';
import { api, unwrap, API_BASE_URL } from '../../lib/api';

// Components
import TemplateManager from './TemplateManager';
import ReportSection from './ReportSection';
import PhotoItem from './PhotoItem';
import ConceptNoteSection from './ConceptNoteSection';
import PhotoUploadSection from './PhotoUploadSection';
import SubmissionsSection from './SubmissionsSection';
import {
  X, FileText, Layout, Settings,
  ChevronRight, ArrowLeft, ImagePlus, Upload,
  UserPlus, ClipboardList, Box, Home
} from 'lucide-react';

const EventWorkspace = ({ event, role, user, onClose }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const setActiveTab = (tabId) => {
    searchParams.set('tab', tabId);
    setSearchParams(searchParams);
  };

  const [templates, setTemplates] = useState([]);
  const [report, setReport] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [summary, setSummary] = useState({ people: [], teams: [] });
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);
  const evId = event?.id?.$oid || event?.id;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const bodyRef = useRef();
  const navRef = useRef();
  
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTo(0, 0);
    const activeBtn = navRef.current?.querySelector('.active-mobile-tab');
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  useEffect(() => {
    const loadWorkspaceData = async () => {
      if (!evId) return;
      setLoading(true);
      try {
        const [tplRes, rptRes, photoRes, sumRes] = await Promise.all([
          api.get('/api/events/templates'),
          api.get(`/api/events/${evId}/report`),
          api.get(`/api/events/${evId}/photos`),
          (role !== ROLES.VOLUNTEER)
            ? api.get(`/api/events/${evId}/photos/summary`)
            : Promise.resolve({ data: { people: [], teams: [] } })
        ]);

        const tplData = unwrap(tplRes);
        setTemplates(Array.isArray(tplData?.items) ? tplData.items : Array.isArray(tplData) ? tplData : []);
        setReport(unwrap(rptRes));
        const photoData = unwrap(photoRes);
        setPhotos(Array.isArray(photoData?.rows) ? photoData.rows : Array.isArray(photoData) ? photoData : []);
        setSummary(unwrap(sumRes) || { people: [], teams: [] });
      } catch (err) {
        console.error('Workspace load failed', err);
      } finally {
        setLoading(false);
      }
    };
    loadWorkspaceData();
  }, [evId, role]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const TABS = isMobile ? [
    { id: 'overview', label: 'Brief', icon: Home },
    { id: 'report', label: 'Compliance', icon: FileText },
    { id: 'photos', label: 'Artifacts', icon: ImagePlus },
    ...(role !== ROLES.VOLUNTEER ? [{ id: 'admin', label: 'Archives', icon: Settings }] : [])
  ] : [
    { id: 'overview', label: 'Mission Overview', icon: Layout },
    { id: 'report', label: 'Compliance Hub', icon: FileText },
    { id: 'photos', label: 'Evidence Vault', icon: ImagePlus },
    { id: 'upload', label: 'Signal Upload', icon: Upload },
    { id: 'concept', label: 'Strategy Brief', icon: ClipboardList },
    ...(role !== ROLES.VOLUNTEER ? [{ id: 'summary', label: 'Field Stats', icon: UserPlus }] : []),
    ...(isAdmin ? [{ id: 'settings', label: 'Design Ops', icon: Settings }] : [])
  ];

  const activeTemplate = Array.isArray(templates) ? templates.find(t => t._id === report?.templateId) : null;
  const isFullBleedTab = ['report', 'settings', 'studio'].includes(activeTab);

  return (
    <div className="workspace-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 99999, 
      background: 'var(--color-surface-lowest)', display: 'flex', flexDirection: 'column'
    }}>
      {/* Workspace Header */}
      <div className="workspace-header" style={{
        padding: '0 1.25rem', borderBottom: '1px solid var(--color-outline-variant)',
        display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface-lowest)',
        height: '64px', flexShrink: 0, zIndex: 100,
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <button onClick={onClose} className="btn-ghost" style={{ padding: '8px', borderRadius: '12px' }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
           <div style={{ fontSize: '0.625rem', fontWeight: 950, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '-2px' }}>MISSION ARCHIVE</div>
           <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-on-surface)', letterSpacing: '-0.3px' }}>
            {event?.title}
          </h2>
        </div>
        <div className="hide-mobile" style={{ padding: '6px 14px', background: 'var(--color-primary-fixed-dim)', borderRadius: '24px', fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-primary-fixed)' }}>
           <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }}></div>
           SYNCHRONIZED
        </div>
        <button onClick={onClose} className="btn-secondary sm" style={{ borderRadius: '12px', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
      </div>

      {/* DESKTOP TABS */}
      <div className="workspace-tabs-desktop hide-mobile" style={{
        padding: '0 1.5rem', borderBottom: '1px solid var(--color-outline-variant)',
        background: 'var(--color-surface-lowest)', overflowX: 'auto', zIndex: 90
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`btn-ghost sm ${active ? 'active' : ''}`} 
                style={{ 
                  height: '52px', gap: '10px', padding: '0 24px', 
                  color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)', 
                  borderBottom: active ? '3.5px solid var(--color-primary)' : '3.5px solid transparent', 
                  borderRadius: 0, fontWeight: 900,
                  fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <Icon size={16} strokeWidth={2.5} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: 'var(--color-surface-low)' }}>
         <div ref={bodyRef} style={{ height: '100%', overflowY: isFullBleedTab ? 'hidden' : 'auto', paddingBottom: isMobile ? '82px' : '0' }}>
           <div style={{ 
             padding: isFullBleedTab ? '0' : (isMobile ? '1.25rem' : '3rem'), 
             maxWidth: isFullBleedTab ? 'none' : '1440px', 
             margin: '0 auto', 
             width: '100%', 
             height: isFullBleedTab ? '100%' : 'auto',
             boxSizing: 'border-box' 
           }}>
              
              {activeTab === 'overview' && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.75rem' }}>
                       <section className="card" style={{ padding: isMobile ? '1.5rem' : '3rem', background: 'var(--color-surface-lowest)', border: '1.5px solid var(--color-outline-variant)', borderRadius: '24px' }}>
                          <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', letterSpacing: '-0.4px' }}>
                            <Box size={22} color="var(--color-primary)" /> Mission Intelligence
                          </h3>
                          <p style={{ lineHeight: 1.8, opacity: 0.9, fontSize: '1.05rem', color: 'var(--color-on-surface)', fontWeight: 500 }}>{event?.description || 'Strategic documentation for this deployment is pending archival.'}</p>
                          <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2.5rem', paddingTop: '2.5rem', borderTop: '1.5px solid var(--color-outline-variant)' }}>
                            <div><label className="input-label" style={{ fontWeight: 950, opacity: 0.5, fontSize: '0.65rem', letterSpacing: '1px' }}>DEPLOYMENT DATE</label><p style={{ margin: '6px 0 0 0', fontWeight: 900, fontSize: '1.1rem' }}>{event?.date}</p></div>
                            <div><label className="input-label" style={{ fontWeight: 950, opacity: 0.5, fontSize: '0.65rem', letterSpacing: '1px' }}>OPERATIONAL ZONE</label><p style={{ margin: '6px 0 0 0', fontWeight: 900, fontSize: '1.1rem' }}>{event?.location || 'Unspecified'}</p></div>
                          </div>
                       </section>
                       <section className="card highlight" style={{ padding: '2.5rem', background: 'var(--gradient-primary)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: '0 24px 48px rgba(67, 67, 213, 0.2)', borderRadius: '28px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 950, letterSpacing: '2px', opacity: 0.9, textTransform: 'uppercase' }}>MISSION PHASE</span>
                          <div style={{ fontSize: '3.2rem', fontWeight: 950, margin: '1.25rem 0', letterSpacing: '-2px', textTransform: 'uppercase' }}>{event?.status}</div>
                          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 24px', borderRadius: '32px', fontSize: '0.85rem', fontWeight: 900, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            COMPLIANCE: {report?.status || 'PENDING'}
                          </div>
                       </section>
                    </div>
                    <ConceptNoteSection event={event} onUpdate={() => window.location.reload()} />
                 </div>
              )}

              {activeTab === 'report' && (
                <ReportSection 
                   activeTemplate={activeTemplate} 
                   templates={templates}
                   event={event} 
                   report={report} 
                   onUpdate={() => window.location.reload()}
                   photos={photos}
                   isAdmin={isAdmin}
                />
              )}

              {activeTab === 'photos' && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>Artifact Repository</h3>
                          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Secure archival of field evidence and mission documentation.</p>
                       </div>
                       <button className="btn-primary" style={{ borderRadius: '16px', padding: '12px 24px', fontWeight: 900 }} onClick={() => setShowUpload(!showUpload)}>
                         {showUpload ? <X size={20} /> : <Upload size={20} />} {showUpload ? 'CLOSE' : 'UPLOAD'}
                       </button>
                    </div>
                    {showUpload && (
                       <div className="card shadow-xl" style={{ padding: '2rem', border: '1.5px solid var(--color-primary)', background: 'var(--color-surface-lowest)', borderRadius: '24px' }}>
                        <PhotoUploadSection event={event} onUpdate={async () => {
                            const res = await api.get(`/api/events/${evId}/photos`);
                            setPhotos(unwrap(res) || []);
                            setShowUpload(false);
                        }} />
                       </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '2rem' }}>
                      {photos.map(p => <PhotoItem key={p._id?.$oid || p._id} photo={p} eventId={evId} />)}
                      {photos.length === 0 && !showUpload && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '120px 20px', opacity: 0.5, border: '2px dashed var(--color-outline-variant)', borderRadius: '32px', background: 'var(--color-surface-lowest)' }}>
                        <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '8px' }}>ARCHIVE EMPTY</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No field evidence artifacts have been secured.</div>
                      </div>}
                    </div>
                 </div>
              )}

              {activeTab === 'concept' && !isMobile && <ConceptNoteSection event={event} onUpdate={() => window.location.reload()} />}
              {activeTab === 'upload' && !isMobile && <div style={{ padding: '2rem' }}><PhotoUploadSection event={event} onUpdate={() => setActiveTab('photos')} /></div>}
              {activeTab === 'summary' && !isMobile && <SubmissionsSection summary={summary} />}
              {activeTab === 'settings' && !isMobile && isAdmin && <TemplateManager templates={templates} onUpdate={() => window.location.reload()} />}
              
              {activeTab === 'admin' && isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                   <SubmissionsSection summary={summary} />
                   <div style={{ borderTop: '1.5px solid var(--color-outline-variant)', paddingTop: '2rem' }}>
                      <TemplateManager templates={templates} onUpdate={() => window.location.reload()} />
                   </div>
                </div>
              )}

           </div>
         </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="show-mobile" style={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'var(--color-surface-lowest)',
        borderTop: '1px solid var(--color-outline-variant)',
        height: '82px', display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -15px 40px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(16px)'
      }} ref={navRef}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`mobile-tab-btn ${active ? 'active-mobile-tab' : ''}`}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                border: 'none', background: 'none',
                color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)', padding: '10px 0'
              }}
            >
              <div style={{
                background: active ? 'var(--color-primary-fixed)' : 'transparent',
                width: '56px', height: '32px', borderRadius: '16px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease',
                transform: active ? 'scale(1.1)' : 'scale(1)',
                marginBottom: '2px'
              }}>
                <Icon size={20} strokeWidth={active ? 2.8 : 2} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: active ? 1 : 0.6 }}>{tabMapping[t.id] || t.label}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        .workspace-overlay { animation: wsEnter 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
        @keyframes wsEnter { from { transform: translateY(100vh); } to { transform: translateY(0); } }
        @media (min-width: 769px) { .show-mobile { display: none !important; } }
        @media (max-width: 768px) { 
           .hide-mobile { display: none !important; } 
           .stack-mobile { grid-template-columns: 1fr !important; } 
        }
        .btn-ghost.active { border-bottom-color: var(--color-primary); color: var(--color-primary); }
      `}</style>
    </div>
  );
};

const tabMapping = {
  overview: 'BRIEF',
  report: 'REPLICA',
  photos: 'SIGNS',
  admin: 'ADMIN'
};

export default EventWorkspace;
