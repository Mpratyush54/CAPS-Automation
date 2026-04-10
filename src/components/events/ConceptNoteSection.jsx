import { useRef, useState } from 'react';
import { ClipboardList, Download, Upload } from 'lucide-react';
import { api, API_BASE_URL, getErrorMessage, unwrap } from '../../lib/api';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--color-surface-lowest)', borderRadius: '1rem', border: '1px solid var(--color-surface-high)', padding: '1rem' }}>
      <div className="stack-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
         <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Concept & Strategy</h3>
         <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
           <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.doc,.docx" />
           <button className="btn-primary sm" onClick={() => fileRef.current.click()} disabled={uploading} style={{ flex: 1, whiteSpace: 'nowrap' }}><Upload size={14} /> Upload</button>
           {docProxyUrl && <a href={docProxyUrl} target="_blank" className="btn-secondary sm" style={{ textDecoration: 'none', flex: 1, whiteSpace: 'nowrap' }}><Download size={14} /> View</a>}
         </div>
      </div>

      {docProxyUrl ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: '1.5rem', 
          background: 'var(--color-surface-low)', 
          padding: isMobile ? '1rem' : '1.5rem', 
          borderRadius: '16px', 
          border: '1px solid var(--color-outline-variant)',
          flex: 1,
          overflow: 'hidden'
        }}>
           <div style={{ 
             flex: 1, 
             minHeight: isMobile ? '350px' : '400px', 
             background: 'var(--color-surface-lowest)', 
             borderRadius: '12px', 
             overflow: 'hidden', 
             border: '1px solid var(--color-outline-variant)',
             display: 'flex',
             flexDirection: 'column'
           }}>
              <iframe 
                src={`${API_BASE_URL}/api/events/concept-note/${eventId}`} 
                style={{ width: '100%', height: '100%', border: 'none', flex: 1 }} 
                title="Concept Note Viewer" 
              />
           </div>
           
           <div style={{ width: isMobile ? '100%' : '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--color-primary-fixed-dim)', padding: '1.25rem', borderRadius: '12px', color: 'var(--color-on-primary-fixed-variant)' }}>
                 <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, lineHeight: '1.5' }}>
                    This document serves as the high-level blueprint for the event. Ensure all compliance fields align with the objectives stated here.
                 </p>
              </div>
              <button 
                className="btn-primary" 
                style={{ height: '48px', borderRadius: '12px', fontWeight: 800, width: '100%' }}
                onClick={() => window.open(`${API_BASE_URL}/api/events/concept-note/${eventId}`, '_blank')}
              >
                 <Upload size={18} /> Replace Document
              </button>
           </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, border: '2px dashed var(--color-outline)', borderRadius: '1rem', padding: '2rem' }}>
           <ClipboardList size={48} style={{ marginBottom: '1rem' }} />
           <p style={{ textAlign: 'center' }}>No concept note uploaded yet.</p>
        </div>
      )}
    </div>
  );
};

export default ConceptNoteSection;
