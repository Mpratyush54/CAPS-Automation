import { useState, useEffect, useRef } from 'react';
import { ChevronRight, FileText, Eye, ImagePlus, Save, X, Info, Layout, Edit2, Maximize2 } from 'lucide-react';
import { api, API_BASE_URL, getErrorMessage } from '../../lib/api';
import ImagePicker from './ImagePicker';

const ReportSection = ({ event, report, templates, activeTemplate, onUpdate, isAdmin, photos }) => {
  const [formData, setFormData] = useState(report?.formData || {});
  const [loading, setLoading] = useState(false);
  const [pickingFor, setPickingFor] = useState(null);
  const [mobileView, setMobileView] = useState('edit'); // 'edit' or 'preview'
  const [scale, setScale] = useState(1);
  const previewRef = useRef(null);

  useEffect(() => {
    if (report?.formData) setFormData(report.formData);
  }, [report]);

  // Dynamic A4 Scaling for different viewports
  useEffect(() => {
    const updateScale = () => {
      if (!previewRef.current) return;
      const containerWidth = previewRef.current.offsetWidth;
      const a4WidthPx = 210 * 3.7795275591; // 210mm in pixels at 96dpi
      const padding = window.innerWidth <= 768 ? 10 : 80;
      const newScale = Math.min(1, (containerWidth - padding) / a4WidthPx);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [mobileView]);

  const handleSaveData = async () => {
    setLoading(true);
    try {
      await api.patch(`/api/events/${event.id}/report`, { formData, status: 'Ready' });
      onUpdate();
      alert('Report Data Synchronized Successfully');
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const getInjectedContent = () => {
    let html = activeTemplate.defaultContent || '';
    const evIdString = String(event.id?.$oid || event.id || '');
    
    const mapping = {
      'event.title': event.title || 'Untitled Event',
      'event.date': event.date ? new Date(event.date).toLocaleDateString() : 'TBD',
      'event.location': event.location || 'TBD',
      'event.startTime': event.startTime || 'TBD',
      'event.attendeeCount': event.attendeeCount || 0,
      'event.teamNames': event.teamNames?.join(', ') || 'General',
      'event.photos': `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0;">${(photos || []).slice(0,3).map(p => {
        const id = p._id?.$oid || p._id;
        return `<img src="${API_BASE_URL}/api/events/${evIdString}/photos/${id}/view?cb=${Date.now()}" crossorigin="anonymous" style="width:100%; height:160px; object-fit:cover; border-radius:8px; border:1px solid #eee;"/>`;
      }).join('')}</div>`
    };

    Object.entries(mapping).forEach(([k, v]) => {
      html = html.replace(new RegExp(`{{${k}}}`, 'g'), v);
    });

    activeTemplate.fields.forEach(f => {
      let rawVal = formData[f.key];
      let val = rawVal || `<span style="color:#bbb">[Mission Field: ${f.label} Pending]</span>`;
      
      if (f.type === 'list' && rawVal) {
          const lines = String(rawVal).split('\n').filter(l => l.trim());
          const listItems = lines.map(l => `<li style="margin-bottom: 8px; text-align: left;">${l.trim()}</li>`).join('');
          const lineSpacing = formData[`${f.key}_spacing`] || f.spacing || '1.8';
          val = `<div style="margin: 20px 0;"><ul style="text-align: left; margin: 0; padding-left: 35px; line-height: ${lineSpacing}; color: #333;">${listItems}</ul></div>`;
      }
      
      if (f.type === 'image' && rawVal) {
          const photoId = rawVal?.$oid || rawVal;
          const src = String(photoId).startsWith('http') ? photoId : `${API_BASE_URL}/api/events/${evIdString}/photos/${photoId}/view?cb=${Date.now()}`;
          const w = formData[`${f.key}_width`] || f.defaultWidth || '100';
          const h = formData[`${f.key}_height`] || 'auto';
          const imgStyle = `max-width:100%; width:${w}%; height:${h === 'auto' ? 'auto' : h + 'px'}; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); object-fit: cover; display: block; margin: 0 auto; border: 1px solid #eee;`;
          val = `<div style="text-align:center; margin: 25px 0;"><img src="${src}" crossorigin="anonymous" alt="Evidence" style="${imgStyle}" onerror="this.parentElement.style.display='none'"/></div>`;
      }
      
      html = html.replace(new RegExp(`{{field.${f.key}}}`, 'g'), val);
    });

    return html;
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  if (!activeTemplate) {
    return (
      <div style={{ padding: isMobile ? '2rem 1rem' : '4rem 2rem', textAlign: 'center', background: 'var(--color-surface-lowest)', height: '100%', boxSizing: 'border-box' }}>
        <Layout size={64} style={{ color: 'var(--color-primary)', opacity: 0.3, marginBottom: '1.5rem' }} />
        <h3 style={{ fontWeight: 800 }}>Initialize Compliance Protocol</h3>
        <p style={{ opacity: 0.6, marginBottom: '2.5rem', maxWidth: '400px', margin: '0 auto 2.5rem', fontSize: '14px' }}>The mission report requires a standardized format. Select the operational template used for this event.</p>
        <div style={{ display: 'grid', gap: '1rem', maxWidth: '450px', margin: '0 auto' }}>
          {Array.isArray(templates) && templates.map(t => (
            <button key={t._id} className="btn-secondary" onClick={() => onUpdate({ ...report, templateId: t._id })} style={{ padding: '16px', justifyContent: 'space-between', borderRadius: '16px', background: 'var(--color-surface-low)' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Version {t.version}</div>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="compliance-hub" style={{ 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : '440px 1fr', 
      height: '100%', 
      overflow: 'hidden',
      background: 'var(--color-surface-low)',
      position: 'relative'
    }}>
      {/* MOBILE TOGGLE HEADER */}
      {isMobile && (
        <div style={{ 
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', gap: '8px', padding: '0.75rem', 
          background: 'var(--color-surface-lowest)', 
          borderBottom: '1px solid var(--color-outline-variant)' 
        }}>
          <button 
            onClick={() => setMobileView('edit')}
            className={`btn-${mobileView === 'edit' ? 'primary' : 'ghost'} sm`}
            style={{ flex: 1, borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', height: '44px' }}
          >
            <Edit2 size={14} /> EDITOR
          </button>
          <button 
            onClick={() => setMobileView('preview')}
            className={`btn-${mobileView === 'preview' ? 'primary' : 'ghost'} sm`}
            style={{ flex: 1, borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', height: '44px' }}
          >
            <Eye size={14} /> REPLICA
          </button>
        </div>
      )}

      {/* DATA INPUT PANEL */}
      <div className={`input-panel ${isMobile && mobileView !== 'edit' ? 'mobile-hide' : ''}`} style={{ 
        background: 'var(--color-surface-lowest)', 
        borderRight: '1px solid var(--color-outline-variant)', 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Panel Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-lowest)', zIndex: 10 }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>Directive Console</h4>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{activeTemplate.name}</div>
              </div>
              <button 
                className="btn-primary" 
                style={{ borderRadius: '14px', padding: '10px 24px', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase' }} 
                onClick={handleSaveData} 
                disabled={loading}
              >
                {loading ? 'SYNCING...' : 'DISPATCH'}
              </button>
           </div>
        </div>

        {/* Fields Scroll Area */}
        <div className="scroll-y" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-primary-fixed)', borderRadius: '14px', border: '1.5px solid var(--color-primary-fixed-dim)' }}>
              <Info size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-primary-fixed)', lineHeight: '1.5' }}>
                Complete all mission parameters for compliance validation.
              </p>
           </div>

           {activeTemplate.fields.map(f => (
             <div key={f.key} className="input-group">
               <label className="input-label" style={{ 
                 fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', 
                 color: 'var(--color-on-surface)', marginBottom: '10px', 
                 display: 'block', letterSpacing: '0.8px', opacity: 0.7
               }}>
                 {f.label}
               </label>
               
               {f.type === 'list' && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   <textarea 
                     className="input-field" 
                     placeholder="Mission achievements (Enter per line)..."
                     style={{ 
                       minHeight: '130px', fontSize: '14px', borderRadius: '14px',
                       border: '1.5px solid var(--color-outline-variant)', 
                       lineHeight: '1.6', background: 'var(--color-surface-low)', 
                       color: 'var(--color-on-surface)', padding: '1rem',
                       fontWeight: 500
                     }} 
                     value={formData[f.key] || ''} 
                     onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
                   />
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--color-surface-low)', padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--color-outline-variant)' }}>
                     <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--color-on-surface-variant)', letterSpacing: '0.5px' }}>DENSITY</span>
                     <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                       {[
                         { label: 'COM', val: '1.2' },
                         { label: 'STD', val: '1.8' },
                         { label: 'RLX', val: '2.5' }
                       ].map(opt => (
                         <button 
                           key={opt.val}
                           className="btn-ghost sm"
                           style={{ 
                             flex: 1, fontSize: '0.65rem', padding: '4px', borderRadius: '6px',
                             background: (formData[`${f.key}_spacing`] || f.spacing || '1.8') === opt.val ? 'var(--color-primary)' : 'transparent',
                             color: (formData[`${f.key}_spacing`] || f.spacing || '1.8') === opt.val ? 'var(--color-on-primary)' : 'inherit',
                             fontWeight: 900
                           }}
                           onClick={() => setFormData({...formData, [`${f.key}_spacing`]: opt.val})}
                         >
                           {opt.label}
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>
               )}

               {f.type === 'textarea' && (
                 <textarea 
                   className="input-field" 
                   style={{ minHeight: '110px', fontSize: '14px', borderRadius: '14px', border: '1.5px solid var(--color-outline-variant)', background: 'var(--color-surface-low)', color: 'var(--color-on-surface)', padding: '1rem', fontWeight: 500 }} 
                   value={formData[f.key] || ''} 
                   onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
                 />
               )}

               {f.type === 'image' && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'var(--color-surface-low)', padding: '0.8rem', borderRadius: '16px', border: '1px solid var(--color-outline-variant)' }}>
                    {formData[f.key] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                         <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-outline-variant)' }}>
                            {(() => {
                              const photoId = formData[f.key]?.$oid || formData[f.key];
                              const src = String(photoId).startsWith('http') ? photoId : `${API_BASE_URL}/api/events/${event.id}/photos/${photoId}/view`;
                              return <img src={src} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />;
                            })()}
                            <button className="btn-icon sm" style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.8)', color: 'white', border: 'none' }} onClick={() => setFormData({...formData, [f.key]: ''})}><X size={14} /></button>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--color-on-surface-variant)' }}>WIDTH</span>
                            <input 
                              type="range" min="25" max="100" step="5"
                              value={formData[`${f.key}_width`] || 100} 
                              onChange={e => setFormData({...formData, [`${f.key}_width`]: e.target.value})}
                              style={{ flex: 1, height: '6px', accentColor: 'var(--color-primary)' }}
                            />
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, minWidth: '35px' }}>{formData[`${f.key}_width`] || 100}%</span>
                         </div>
                      </div>
                    ) : (
                      <button className="btn-secondary" onClick={() => setPickingFor(f.key)} style={{ width: '100%', fontSize: '0.8rem', padding: '1.5rem', border: '2px dashed var(--color-outline-variant)', borderRadius: '12px', background: 'var(--color-surface-lowest)', color: 'var(--color-primary)' }}>
                        <ImagePlus size={20} style={{ marginBottom: '6px' }} />
                        <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Evidence Artifact</div>
                      </button>
                    )}
                 </div>
               )}

               {['text', 'number', 'date'].includes(f.type) && (
                 <input 
                   type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} 
                   className="input-field" 
                   style={{ height: '48px', fontSize: '14px', borderRadius: '14px', border: '1.5px solid var(--color-outline-variant)', background: 'var(--color-surface-low)', color: 'var(--color-on-surface)', padding: '0 1rem', fontWeight: 600 }} 
                   value={formData[f.key] || ''} 
                   onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
                 />
               )}
             </div>
           ))}
           <div style={{ height: '140px' }} />
        </div>
      </div>

      {/* COMPLIANCE PREVIEW PANEL */}
      <div className={`preview-panel ${isMobile && mobileView !== 'preview' ? 'mobile-hide' : ''}`} ref={previewRef} style={{ 
        overflowY: 'auto', 
        padding: isMobile ? '1.5rem' : '3.5rem 2rem', 
        background: '#dadbdc', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        flex: 1, 
        minWidth: 0,
        position: 'relative'
      }}>
         <div style={{ 
            position: 'sticky', top: '0', zIndex: 10,
            marginBottom: '2.5rem', 
            color: '#444', fontSize: '0.75rem', fontWeight: 900, 
            display: 'flex', alignItems: 'center', gap: '0.8rem', 
            padding: '10px 24px', background: 'rgba(255,255,255,0.95)', 
            borderRadius: '40px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(12px)',
            border: '1.5px solid #fff',
            textTransform: 'uppercase', letterSpacing: '1px'
         }}>
             <ShieldCheck size={18} color="var(--color-primary)" /> <Eye size={16} style={{ marginRight: '-2px' }} /> <span style={{ opacity: 0.6 }}>Compliance Replica</span>
         </div>

         <div className="paper-bundle" style={{ 
            boxShadow: '0 50px 120px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)', 
            transformOrigin: 'top center',
            transform: `scale(${scale})`,
            marginBottom: `calc(297mm * ${scale - 1} + 40px)`,
            borderRadius: '2px', overflow: 'hidden'
         }}>
            <div 
              className="report-canvas paper-page"
              style={{ pointerEvents: 'none' }}
              dangerouslySetInnerHTML={{ __html: getInjectedContent() }}
            />
            <div className="page-break-line" style={{ borderTop: '2.5px solid #eee', background: '#fff', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 900, opacity: 0.3, letterSpacing: '4px' }}>OPERATIONAL ARCHIVE MARK</span>
            </div>
            <div className="paper-page" style={{ height: '297mm', pointerEvents: 'none', background: 'white !important', borderTop: 'none' }} />
         </div>

         <div style={{ marginTop: '2rem', opacity: 0.5, textAlign: 'center', paddingBottom: '120px' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#444', letterSpacing: '2px' }}>VIRTUAL COMPLIANCE ENGINE • SYSTEM ARCHITECT V4.0</p>
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

      <style>{`
        .compliance-hub * { box-sizing: border-box; }
        .paper-bundle { width: 210mm; background: white; display: flex; flex-direction: column; transition: transform 0.2s ease-out; }
        .paper-page { width: 100%; min-height: 297mm; padding: 25mm !important; background: white !important; color: #111 !important; outline: none; box-sizing: border-box; text-align: left; word-break: break-word; font-family: 'Times New Roman', serif; }
        .paper-page table { width: 100% !important; border-collapse: collapse; margin: 15px 0; font-family: sans-serif; }
        .paper-page table td, .paper-page table th { border: 1px solid #999; padding: 10px; font-size: 10pt; }
        .paper-page p { margin-bottom: 0; line-height: 1.6; font-size: 11pt; }
        .page-break-line { width: 100%; text-align: center; }
        
        @media (max-width: 768px) {
          .mobile-hide { display: none !important; }
          .compliance-hub { grid-template-columns: 1fr !important; }
          .input-panel { border-right: none !important; }
          .preview-panel { padding: 1.5rem 1rem !important; }
        }
      `}</style>
    </div>
  );
};

const ShieldCheck = ({ size, color, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path></svg>;

export default ReportSection;
