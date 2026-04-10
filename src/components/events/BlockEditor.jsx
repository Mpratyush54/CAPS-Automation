import { useState } from 'react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api';
import TableBlock from './TableBlock';
import ImagePicker from './ImagePicker';

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

export default BlockEditor;
