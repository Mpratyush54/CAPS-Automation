import { useState } from 'react';
import { Save, X } from 'lucide-react';
import Modal from '../Modal';

const EventFormModal = ({ initial, role, teams, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: initial?.title || '',
    date: initial?.date || '',
    time: initial?.time || '',
    location: initial?.location || '',
    teamIds: initial?.teamIds || (initial?.teamId ? [initial.teamId] : []),
    attendees: initial?.attendees || '',
    description: initial?.description || '',
    status: (initial?.status || 'upcoming').toLowerCase()
  });
  const [searchTerm, setSearchTerm] = useState('');
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      id: initial?.id,
      attendees: Number(form.attendees) || 0
    });
    onClose();
  };

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTeam = (teamId) => {
    setForm(prev => {
      const exists = prev.teamIds.includes(teamId);
      return {
        ...prev,
        teamIds: exists
          ? prev.teamIds.filter(id => id !== teamId)
          : [...prev.teamIds, teamId]
      };
    });
  };

  return (
    <Modal title={initial ? `Edit: ${initial.title}` : 'Create New Event'} onClose={onClose} maxWidth="620px">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.875rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
        <div><label className="input-label">Event Title *</label><input className="input-field" value={form.title} onChange={(e) => set('title', e.target.value)} required /></div>
        <div className="mobile-safe-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <div><label className="input-label">Date *</label><input className="input-field" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
          <div><label className="input-label">Time</label><input className="input-field" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></div>
          <div><label className="input-label">Status</label><select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>{['upcoming', 'ongoing', 'completed'].map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></div>
        </div>
        <div><label className="input-label">Location</label><input className="input-field" value={form.location} onChange={(e) => set('location', e.target.value)} /></div>

        <div style={{ background: 'var(--color-surface-low)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="input-label" style={{ marginBottom: 0 }}>Assigned Teams / Units</label>
          <input
            className="input-field"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--color-surface-high)', borderRadius: '0.5rem', padding: '0.25rem' }}>
            {filteredTeams.map(t => {
              const id = t._id?.$oid || t._id;
              const isSelected = form.teamIds.includes(id);
              return (
                <div
                  key={id}
                  onClick={() => toggleTeam(id)}
                  style={{
                    padding: '0.375rem 0.625rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    background: isSelected ? 'var(--color-primary-fixed)' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-on-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderRadius: '0.25rem',
                    marginBottom: '2px'
                  }}
                >
                  <div style={{ width: '12px', height: '12px', border: '1px solid var(--color-outline)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--color-primary)' : 'transparent' }}>
                    {isSelected && <X size={10} color="white" />}
                  </div>
                  {t.name}
                </div>
              );
            })}
          </div>
          {form.teamIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
              {form.teamIds.map(id => {
                const team = teams.find(t => t._id === id);
                return (
                  <span key={id} className="chip" style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem' }}>
                    {team?.name || 'Unknown Unit'}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div><label className="input-label">Expected Attendees</label><input className="input-field" type="number" min="0" value={form.attendees} onChange={(e) => set('attendees', e.target.value)} /></div>
        <div><label className="input-label">Description</label><textarea className="input-field" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} style={{ resize: 'vertical' }} /></div>
        <div className="card-action-row" style={{ marginTop: '0.5rem' }}><button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button><button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={form.teamIds.length === 0}><Save size={14} /> {initial ? 'Save Changes' : 'Create Event'}</button></div>
      </form>
    </Modal>
  );
};

export default EventFormModal;
