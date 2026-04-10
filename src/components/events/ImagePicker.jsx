import { API_BASE_URL } from '../../lib/api';
import Modal from '../Modal';

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

export default ImagePicker;
