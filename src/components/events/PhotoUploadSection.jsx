import React, { useState, useRef } from 'react';
import { Upload, X, FileCheck, AlertCircle } from 'lucide-react';
import { api, API_BASE_URL, unwrap, getErrorMessage } from '../../lib/api';

const PhotoUploadSection = ({ event, onUpdate }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({}); // { fileName: percentage }
  const fileInputRef = useRef();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    try {
      const evId = event.id?.$oid || event.id;
      
      for (const file of selectedFiles) {
        const payload = { fileName: file.name, mimeType: file.type, sizeBytes: file.size };
        const { uploadUrl } = unwrap(await api.post(`/api/events/${evId}/photos/upload-url`, payload));
        
        const realUrl = uploadUrl.startsWith('http') ? uploadUrl : `${API_BASE_URL}${uploadUrl}`;

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PATCH', realUrl);
          xhr.setRequestHeader('x-offset', '0');
          xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('authToken')}`);
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setProgress(prev => ({ ...prev, [file.name]: percent }));
            }
          };

          xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error('Upload failed'));
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(file);
        });
      }

      setSelectedFiles([]);
      setProgress({});
      onUpdate();
      alert('All photos uploaded successfully');
    } catch (err) {
      alert('Upload failed: ' + getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      <div 
        onClick={() => !uploading && fileInputRef.current.click()}
        style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          minHeight: '200px', border: '2px dashed var(--color-outline)', borderRadius: '1rem', 
          gap: '1rem', background: 'var(--color-surface-low)', cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ padding: '1.5rem', borderRadius: '50%', background: 'var(--color-primary-container)', color: 'var(--color-primary)' }}>
          <Upload size={32} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, margin: 0 }}>Click to select images</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>Support for bulk uploads (PNG, JPG, HEIC)</p>
        </div>
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileSelect} 
          accept="image/*"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Queue ({selectedFiles.length} files)</h4>
            <button className="btn-ghost sm" onClick={() => setSelectedFiles([])} disabled={uploading}>Clear All</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {selectedFiles.map((file, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--color-surface-low)', borderRadius: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                  {progress[file.name] !== undefined && (
                    <div style={{ height: '4px', background: 'var(--color-surface-high)', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress[file.name]}%`, background: 'var(--color-primary)', transition: 'width 0.2s' }} />
                    </div>
                  )}
                </div>
                {!uploading && (
                  <button className="btn-icon sm" onClick={() => removeFile(i)}><X size={14} /></button>
                )}
                {progress[file.name] === 100 && <FileCheck size={16} color="var(--color-success)" />}
              </div>
            ))}
          </div>

          <button 
            className="btn-primary" 
            style={{ marginTop: '0.5rem', height: '3rem', fontSize: '1rem' }} 
            onClick={startUpload} 
            disabled={uploading}
          >
            {uploading ? `Uploading ${Object.keys(progress).length} of ${selectedFiles.length}...` : `Upload ${selectedFiles.length} Photos`}
          </button>
        </div>
      )}
    </div>
  );
};

export default PhotoUploadSection;
