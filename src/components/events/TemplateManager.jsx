import { useEffect, useRef, useState } from 'react';
import { Bold, Edit2, Eye, FileText, GripVertical, Italic, Link, List, Palette, Plus, RotateCcw, RotateCw, Underline, AlignLeft, AlignCenter, AlignRight, Upload } from 'lucide-react';
import { api, API_BASE_URL, getErrorMessage, unwrap } from '../../lib/api';

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
  const [newField, setNewField] = useState({ key: '', label: '', type: 'text', spacing: '1.8', defaultWidth: '100' });
  const [editingKey, setEditingKey] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
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
    setNewField({ key: '', label: '', type: 'text', spacing: '1.8', defaultWidth: '100' });
    setEditingKey(null);
  };

  const handleEditTemplate = (t) => {
    setForm({ ...t, fields: t.fields || [], defaultContent: t.defaultContent || '' });
    setAdding(true);
  };

  const getPreviewHTML = () => {
    let html = form.defaultContent || '';
    
    // System Keys Mockup
    const samples = {
      'event.title': 'Community Health Drive 2024',
      'event.date': '10/24/2024',
      'event.location': 'Auditorium A, Block 4',
      'event.startTime': '10:00 AM',
      'event.photos': '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0;"><div style="background:#eee;height:100px;"></div><div style="background:#ddd;height:100px;"></div><div style="background:#ccc;height:100px;"></div></div>'
    };

    Object.entries(samples).forEach(([k, v]) => {
      html = html.replace(new RegExp(`{{${k}}}`, 'g'), `<span style="color:var(--color-primary);font-weight:600;">[${v}]</span>`);
    });

    // Custom Fields Mockup
    form.fields.forEach(f => {
      let mock = `[${f.label}]`;
      if (f.type === 'list') {
        const spacing = f.spacing || '1.8';
        mock = `<ul style="line-height:${spacing};padding-left:25px;margin:15px 0;"><li>Sample achievement point one</li><li>Detailed observation of the event</li><li>Final resolution and takeaway</li></ul>`;
      }
      if (f.type === 'image') {
        const w = f.defaultWidth || '100';
        mock = `<div style="width:${w}%;margin:15px auto;height:180px;background:#f0f0f0;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#999;border-radius:8px;">[Evidence Image Placeholder: ${w}% Width]</div>`;
      }
      
      html = html.replace(new RegExp(`{{field.${f.key}}}`, 'g'), mock);
    });

    return html;
  };

  const handleSave = async () => {
    const finalContent = isPreview ? form.defaultContent : editorRef.current.innerHTML;
    if (!form.name || !finalContent) return alert('Name and content required');
    
    if (form._id) {
       const confirmUpdate = window.confirm("Modify existing template and increment version?");
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
        <div className="studio-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.25rem', width: '100%', boxSizing: 'border-box', overflow: 'hidden', background: 'var(--color-surface-lowest)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-on-surface)' }}>Studio Templates</h3>
              <button className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.875rem' }} onClick={() => setAdding(true)}><Plus size={18} /> New Architect</button>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
              {templates.map(t => (
                <div key={t._id} className="card" style={{ padding: '1.5rem', background: 'var(--color-surface-low)', border: '1px solid var(--color-outline-variant)', position: 'relative', width: '100%', transition: 'all 0.2s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                     <h4 style={{ margin: 0, color: 'var(--color-on-surface)', fontSize: '1rem' }}>{t.name}</h4>
                     <span style={{ fontSize: '0.7rem', background: 'var(--color-primary-fixed)', color: 'var(--color-on-primary-fixed)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>v{t.version}</span>
                  </div>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', opacity: 0.8 }}>{t.fields?.length || 0} Dynamic Design Tags</p>
                  <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => handleEditTemplate(t)}><Edit2 size={15} /> Edit Designer</button>
                </div>
              ))}
           </div>
        </div>
    );
  }

  return (
    <div className="workspace-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 99999, 
      background: 'var(--color-surface-lowest)', display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box'
    }}>
      <div style={{ background: 'var(--color-surface-lowest)', borderBottom: '1px solid var(--color-outline-variant)', padding: '0.4rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <FileText size={20} color="var(--color-primary)" />
            <input 
              style={{ border: 'none', background: 'transparent', outline: 'none', margin: 0, fontWeight: 800, fontSize: '0.95rem', width: '100%', maxWidth: '300px', color: 'var(--color-on-surface)' }} 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              placeholder="Template Name..." 
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className="show-mobile-flex" style={{ display: 'none', gap: '4px' }}>
                <button onClick={() => setShowLeftSidebar(!showLeftSidebar)} className={`btn-ghost sm ${showLeftSidebar ? 'active' : ''}`}><List size={14} /></button>
                <button onClick={() => setShowRightSidebar(!showRightSidebar)} className={`btn-ghost sm ${showRightSidebar ? 'active' : ''}`}><Palette size={14} /></button>
            </div>
            <button 
                onClick={() => setIsPreview(!isPreview)}
                className={`btn-${isPreview ? 'primary' : 'secondary'} sm`}
                style={{ borderRadius: '24px', padding: '6px 16px', fontSize: '0.7rem', fontWeight: 700 }}
            >
                {isPreview ? <Edit2 size={12} /> : <Eye size={12} />}
                {isPreview ? 'Back to Editor' : 'Live Preview'}
            </button>
            <div className="toolbar-sep" />
            <button className="btn-ghost sm" style={{ fontWeight: 600 }} onClick={() => setAdding(false)}>Exit</button>
            <button className="btn-primary" style={{ borderRadius: '24px', padding: '8px 20px', fontSize: '0.75rem', fontWeight: 800 }} onClick={handleSave}>Finalize</button>
          </div>
        </div>

        {!isPreview && (
          <div className="scroll-x" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', overflowX: 'auto', paddingBottom: '4px' }}>
            <button onClick={() => formatDoc('undo')} className="toolbar-btn" title="Undo (Ctrl+Z)"><RotateCcw size={14} /></button>
            <button onClick={() => formatDoc('redo')} className="toolbar-btn" title="Redo (Ctrl+Y)"><RotateCw size={14} /></button>
            <div className="toolbar-sep" />
            <select style={{ border: 'none', fontSize: '11px', background: 'var(--color-surface-low)', color: 'var(--color-on-surface)', borderRadius: '4px', padding: '4px 8px', fontWeight: 600 }} onChange={(e) => formatDoc('fontSize', e.target.value)}>
              <option value="3">Normal Text</option>
              <option value="5">Sub-heading</option>
              <option value="7">Big Title</option>
            </select>
            <div className="toolbar-sep" />
            <button onClick={() => formatDoc('bold')} className="toolbar-btn"><Bold size={14} /></button>
            <button onClick={() => formatDoc('italic')} className="toolbar-btn"><Italic size={14} /></button>
            <button onClick={() => formatDoc('underline')} className="toolbar-btn"><Underline size={14} /></button>
            <button onClick={() => { const c = prompt('Hex Color'); if(c) formatDoc('foreColor', c); }} className="toolbar-btn"><Palette size={14} /></button>
            <div className="toolbar-sep" />
            <button onClick={() => formatDoc('justifyLeft')} className="toolbar-btn"><AlignLeft size={14} /></button>
            <button onClick={() => formatDoc('justifyCenter')} className="toolbar-btn"><AlignCenter size={14} /></button>
            <button onClick={() => formatDoc('justifyRight')} className="toolbar-btn"><AlignRight size={14} /></button>
            <button onClick={() => {
                const url = prompt('Enter URL (e.g. https://google.com)');
                if(url) formatDoc('createLink', url);
            }} className="toolbar-btn" title="Insert Link"><Link size={14} /></button>
            <div className="toolbar-sep" />
            <button onClick={() => formatDoc('insertUnorderedList')} className="toolbar-btn"><List size={14} /></button>
            <button onClick={() => formatDoc('removeFormat')} className="toolbar-btn" style={{ fontSize: '10px', fontWeight: 900 }}>Tx</button>
          </div>
        )}
      </div>

      <div className="studio-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 260px) 1fr minmax(0, 280px)', flex: 1, overflow: 'hidden' }}>
        <div className={`studio-sidebar ${showLeftSidebar ? 'mobile-show' : ''}`} style={{ background: 'var(--color-surface-lowest)', borderRight: '1px solid var(--color-outline-variant)', padding: '1.25rem', overflowY: 'auto' }}>
           <h6 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-on-surface-variant)', marginBottom: '1rem', letterSpacing: '0.5px' }}>EVENT METRICS</h6>
           {AVAILABLE_DATA_KEYS.map(group => (
              <div key={group.group} style={{ marginBottom: '1.25rem' }}>
                 <p style={{ fontSize: '0.725rem', color: 'var(--color-primary)', fontWeight: 800, margin: '0 0 0.5rem 0' }}>{group.group}</p>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {group.keys.map(k => (
                       <div key={k} draggable onDragStart={e => e.dataTransfer.setData('metric', k)} className="studio-chip">
                         {k.split('.').pop().replace(/_/g, ' ')}
                       </div>
                    ))}
                 </div>
              </div>
           ))}
        </div>

        <div style={{ overflowY: 'auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', scrollBehavior: 'smooth', background: 'var(--color-surface-low)' }}>
           <div className="paper-bundle">
              <div 
                ref={editorRef}
                className="report-canvas paper-page"
                contentEditable={!isPreview}
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                style={{ 
                    cursor: isPreview ? 'default' : 'text',
                    opacity: isPreview ? 0.95 : 1
                }}
                dangerouslySetInnerHTML={{ __html: isPreview ? getPreviewHTML() : (form.defaultContent || '<div style="text-align:center; padding-top:200px;"><h1>Architect Your Report</h1><p>Drag elements here...</p></div>') }}
              />
              <div className="page-break-line"><span style={{ background:'var(--color-surface-low)', color: 'var(--color-on-surface-variant)', padding:'0 1rem' }}>Page 2 Transition</span></div>
              <div className="paper-page" style={{ height: '297mm', pointerEvents: 'none', background: 'white !important', borderTop: 'none' }} />
           </div>
        </div>

        <div className={`studio-sidebar ${showRightSidebar ? 'mobile-show' : ''}`} style={{ background: 'var(--color-surface-lowest)', borderLeft: '1px solid var(--color-outline-variant)', padding: '1.25rem', overflowY: 'auto' }}>
           <h6 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>FIELD ARCHITECT</h6>
           <div style={{ background: 'var(--color-surface-low)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-outline-variant)', marginBottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.725rem', color: 'var(--color-on-surface)', fontWeight: 600 }}>{editingKey ? 'Modify Component' : 'Add New Component'}:</p>
              <input type="text" className="input-field sm" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} placeholder="Label (e.g. Outcomes)" style={{ marginBottom: '0.5rem', background: 'var(--color-surface-lowest)', color: 'var(--color-on-surface)', fontWeight: 600 }} />
              <select className="input-field sm" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value})} style={{ marginBottom: '0.75rem', background: 'var(--color-surface-lowest)', color: 'var(--color-on-surface)', fontSize: '0.75rem', fontWeight: 600 }}>
                 <option value="text">Short Text</option>
                 <option value="textarea">Large Paragraph</option>
                 <option value="list">Bullet List</option>
                 <option value="image">Evidence Media</option>
                 <option value="number">Numeric Stat</option>
              </select>

              {newField.type === 'list' && (
                <div style={{ marginBottom: '0.75rem', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.625rem', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>ITEM SPACING</label>
                  <select 
                    className="input-field sm" 
                    value={newField.spacing || '1.8'} 
                    onChange={e => setNewField({...newField, spacing: e.target.value})}
                    style={{ background: 'var(--color-surface-lowest)', color: 'var(--color-on-surface)', fontSize: '0.7rem' }}
                  >
                    <option value="1.2">Compact (1.2x)</option>
                    <option value="1.8">Standard (1.8x)</option>
                    <option value="2.5">Relaxed (2.5x)</option>
                  </select>
                </div>
              )}

              {newField.type === 'image' && (
                <div style={{ marginBottom: '0.75rem', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.625rem', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>INITIAL WIDTH</label>
                  <select 
                    className="input-field sm" 
                    value={newField.defaultWidth || '100'} 
                    onChange={e => setNewField({...newField, defaultWidth: e.target.value})}
                    style={{ background: 'var(--color-surface-lowest)', color: 'var(--color-on-surface)', fontSize: '0.7rem' }}
                  >
                    <option value="33">Square (33%)</option>
                    <option value="50">Half (50%)</option>
                    <option value="100">Full (100%)</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingKey && <button className="btn-ghost sm" onClick={() => { setEditingKey(null); setNewField({ key: '', label: '', type: 'text', spacing: '1.8', defaultWidth: '100' }); }} style={{ flex: 1 }}>Cancel</button>}
                <button className="btn-primary" style={{ flex: 2, fontSize: '0.75rem', padding: '12px', fontWeight: 800 }} onClick={addSchemaField}>
                  {editingKey ? 'Update' : 'Add to Blueprint'}
                </button>
              </div>
           </div>
           <p style={{ fontSize: '0.65rem', color: 'var(--color-on-surface-variant)', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>DRAG TO DOCUMENT:</p>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
             {form.fields.map((f, i) => (
                <div key={i} className="studio-chip custom" style={{ justifyContent: 'space-between', padding: '12px' }}>
                  <div draggable onDragStart={e => e.dataTransfer.setData('metric', `field.${f.key}`)} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                     <GripVertical size={14} style={{ opacity: 0.5, marginRight: '10px' }} />
                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{f.label}</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{f.type} {f.spacing ? `• ${f.spacing}x` : ''} {f.defaultWidth ? `• ${f.defaultWidth}%` : ''}</span>
                     </div>
                  </div>
                  <button onClick={() => { setNewField(f); setEditingKey(f.key); }} className="btn-primary sm" style={{ padding: '6px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} title="Edit Property"><Edit2 size={13} /></button>
                </div>
             ))}
           </div>
           <div style={{ marginTop: '2rem', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '1.5rem' }}>
              <h6 style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>TEMPLATE SOURCE</h6>
              <button className="btn-secondary" style={{ width: '100%', padding: '12px', fontSize: '0.75rem', fontWeight: 700 }} onClick={() => docRef.current.click()}>
                 <Upload size={14} /> {uploading ? 'Processing...' : 'Sync Base Document'}
              </button>
              <input type="file" ref={docRef} style={{ display: 'none' }} accept=".docx" onChange={handleDocUpload} />
           </div>
        </div>
      </div>

      <style>{`
        .toolbar-btn { min-width: 32px; padding: 0 8px; height: 32px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 4px; cursor: pointer; color: var(--color-on-surface-variant); }
        .toolbar-btn:hover { background: var(--color-surface-low); color: var(--color-primary); }
        .toolbar-sep { width: 1px; height: 18px; background: var(--color-outline-variant); margin: 0 4px; }
        .studio-chip { padding: 0.875rem; background: var(--color-surface-low); border: 1px solid var(--color-outline-variant); border-radius: 8px; font-size: 13px; cursor: grab; color: var(--color-on-surface); display: flex; align-items: center; transition: all 0.2s ease; }
        .studio-chip:hover { transform: translateX(4px); border-color: var(--color-primary); background: var(--color-surface-high); }
        .studio-chip.custom { background: var(--color-primary-fixed) !important; color: var(--color-on-primary-fixed) !important; border-color: transparent; }
        .scroll-x::-webkit-scrollbar { display: none; }
        
        .paper-bundle { 
          width: 210mm; 
          min-height: 297mm;
          background: white; 
          box-shadow: 0 30px 60px rgba(0,0,0,0.2); 
          display: flex; 
          flex-direction: column; 
          transform-origin: top center;
          margin-bottom: 50px;
        }

        @media (max-width: 1024px) {
           .show-mobile-flex { display: flex !important; }
           .studio-layout { grid-template-columns: 1fr !important; }
           .studio-sidebar { 
             position: fixed; top: 110px; bottom: 0; width: 280px; z-index: 1000;
             transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
             background: var(--color-surface-lowest) !important;
           }
           .studio-sidebar:first-child { left: -280px; border-right: 1px solid var(--color-outline-variant); }
           .studio-sidebar:last-child { right: -280px; border-left: 1px solid var(--color-outline-variant); }
           .studio-sidebar.mobile-show { transform: translateX(280px); }
           .studio-sidebar:last-child.mobile-show { transform: translateX(-280px); }

           .paper-bundle {
             width: 210mm;
             transform: scale(0.42); /* Approx for standard phones */
             margin-top: -150px; /* Offset scale shrink */
           }
           @media (max-width: 480px) {
             .paper-bundle { transform: scale(0.38); margin-top: -200px; }
           }
        }

        .paper-page { 
          width: 100%; 
          min-height: 297mm; 
          padding: 20mm !important; 
          background: white !important; 
          color: #202124 !important; 
          outline: none; 
          box-sizing: border-box; 
          text-align: left; 
          word-break: break-word; 
        }
        .paper-page table { width: 100% !important; border-collapse: collapse; margin: 15px 0; }
        .paper-page table td, .paper-page table th { border: 1px solid #ddd; padding: 10px; }
        .paper-page p { margin-bottom: 12px; line-height: 1.6; font-size: 11pt; }
        .page-break-line { width: 100%; border-top: 1px dashed #ccc; text-align: center; height: 1.5rem; margin: 4rem 0; font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; display: flex; align-items: center; justify-content: center; background: #eeeff1; }
      `}</style>
    </div>
  );
};

export default TemplateManager;
