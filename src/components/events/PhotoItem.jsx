import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { api, API_BASE_URL } from '../../lib/api';

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
        // Use a timeout or signal if needed, but let's try direct fetch if api.get fails
        const response = await api.get(src, { 
          responseType: 'blob',
          timeout: 10000 
        }).catch(err => {
          console.warn('Primary fetch failed, attempting fallback...', err);
          // If the auth fetch fails, try a direct URL as a last ditch
          return { data: null }; 
        });

        if (!active) return;

        if (response.data) {
          const url = URL.createObjectURL(response.data);
          setThumbUrl(url);
          setLoading(false);
        } else {
          // Fallback to direct src if blob fails (might fail due to CORS, but worth a shot)
          setThumbUrl(src);
          setLoading(false);
          // We don't necessarily set error yet as src might work directly
        }
      } catch (err) {
        if (active) {
          console.error('Photo load failed completely', err);
          setError(true);
          setLoading(false);
        }
      }
    };
    loadThumb();
    return () => {
      active = false;
      if (thumbUrl && thumbUrl.startsWith('blob:')) URL.revokeObjectURL(thumbUrl);
    };
  }, [src, displayUrl]);

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

export default PhotoItem;
