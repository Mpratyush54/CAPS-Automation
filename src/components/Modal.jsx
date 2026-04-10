import { X } from 'lucide-react';

const Modal = ({ title, onClose, children, maxWidth = '620px' }) => (
  <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') onClose(); }}>
    <div className="modal-box" style={{ maxWidth, display: 'flex', flexDirection: 'column' }}>
      <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-surface-high)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} className="btn-secondary sm" style={{ padding: '0.5rem' }}><X size={20} /></button>
      </div>
      <div className="modal-body" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  </div>
);

export default Modal;
