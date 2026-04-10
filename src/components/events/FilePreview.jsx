import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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

export default FilePreview;
