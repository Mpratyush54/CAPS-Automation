import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { api, API_BASE_URL } from '../../lib/api';

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
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLargeImage();
    return () => { 
      active = false; 
      if (blobUrl) URL.revokeObjectURL(blobUrl); 
    };
  }, [src, displayUrl]);

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

export default Lightbox;
