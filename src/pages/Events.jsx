import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar, PlusCircle, Trash2, AlertCircle
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { CardSkeleton } from '../components/Skeleton';

// UI Components
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/Modal';

// Extracted Components
import EventFormModal from '../components/events/EventFormModal';
import EventWorkspace from '../components/events/EventWorkspace';
import EventCard from '../components/events/EventCard';

// Hooks
import { useEvents, useEventTeams, useSaveEvent, useDeleteEvent } from '../hooks/useEvents';

const Events = () => {
  const { role, user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState('all');

  const activeModal = searchParams.get('modal');
  const selectedEventId = searchParams.get('id');
  const workspaceId = searchParams.get('ev');

  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useEvents();
  const { data: teams = [] } = useEventTeams();

  const setModal = (m) => {
    if (!m) {
      searchParams.delete('modal');
      searchParams.delete('id');
    } else {
      searchParams.set('modal', m.type);
      if (m.id) searchParams.set('id', m.id);
    }
    setSearchParams(searchParams);
  };

  const workplaceEvent = events.find(e => String(e.id || e._id) === workspaceId);
  const currentEvent = selectedEventId ? events.find(e => String(e.id || e._id) === selectedEventId) : null;

  const setWorkspaceEvent = (ev) => {
    if (ev) {
      searchParams.set('ev', ev.id || ev._id);
    } else {
      searchParams.delete('ev');
      searchParams.delete('tab');
    }
    setSearchParams(searchParams);
  };

  const saveEventMutation = useSaveEvent();
  const deleteEventMutation = useDeleteEvent();

  const filtered = events.filter((e) => filter === 'all' || (e.status || '').toLowerCase() === filter);

  const handleSaveEvent = async (next) => {
    try {
      await saveEventMutation.mutateAsync(next);
      setModal(null);
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const handleDeleteEvent = async () => {
    if (!currentEvent) return;
    try {
      await deleteEventMutation.mutateAsync(currentEvent.id);
      setModal(null);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const pageTitle = role === ROLES.VOLUNTEER ? 'Mission Manifest' : 'Strategic Command Center';
  const error = eventsError?.message || saveEventMutation.error?.message || deleteEventMutation.error?.message;

  return (
    <>
      <TopBar title={pageTitle} />
      <div className="page-body">
        {error && <Alert variant="error" style={{ borderRadius: '12px', marginBottom: '1.5rem' }}>{error}</Alert>}

        <div className="page-controls" style={{ marginBottom: '2rem', gap: '1rem' }}>
          <div className="chip-group" style={{ flex: 1, display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['all', 'upcoming', 'ongoing', 'completed'].map((v) => (
              <button key={v} className={`chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)} style={{ borderRadius: '10px', fontWeight: 600 }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {can(role, 'manageCommitteeEvents') && (
            <button className="btn-primary" onClick={() => setModal({ type: 'create' })} style={{ borderRadius: '12px', padding: '0.75rem 1.5rem', fontWeight: 800 }}>
               <PlusCircle size={18} /> Initialize Operation
            </button>
          )}
        </div>

        {eventsLoading && events.length === 0 ? (
          <div className="event-grid-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
             <CardSkeleton count={6} />
          </div>
        ) : (
          <div className="event-grid-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {filtered.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                role={role} 
                teams={teams} 
                onWorkspace={(ev) => setWorkspaceEvent(ev)} 
                onEdit={() => setModal({ type: 'edit', id: event.id })} 
                onDelete={() => setModal({ type: 'delete', id: event.id })} 
              />
            ))}
          </div>
        )}

        {!eventsLoading && filtered.length === 0 && (
          <EmptyState 
            icon={Calendar} 
            title="Zero Signals Detected" 
            message="No active operations match the current strategic filters." 
          />
        )}

        {/* MODAL DISPATCHER */}
        {activeModal === 'create' && <EventFormModal teams={teams} role={role} onClose={() => setModal(null)} onSave={handleSaveEvent} />}
        {activeModal === 'edit' && currentEvent && <EventFormModal initial={currentEvent} teams={teams} role={role} onClose={() => setModal(null)} onSave={handleSaveEvent} />}
        {workplaceEvent && <EventWorkspace event={workplaceEvent} role={role} user={user} onClose={() => setWorkspaceEvent(null)} />}

        {activeModal === 'delete' && currentEvent && (
          <Modal title="Decommission Event" onClose={() => setModal(null)} maxWidth="420px">
             <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-surface-lowest)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '20px', background: 'var(--color-error-container)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Trash2 size={32} />
                </div>
                <h3 style={{ margin: '0 0 0.75rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>PURGE OPERATION?</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '2rem' }}>
                    You are about to decommission <strong style={{ color: 'var(--color-on-surface)' }}>{currentEvent.title}</strong>. This will erase all mission records and artifacts.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-ghost" style={{ flex: 1, borderRadius: '12px', fontWeight: 700 }} onClick={() => setModal(null)}>Abort</button>
                    <button className="btn-primary" style={{ flex: 1.5, background: 'var(--color-error)', borderColor: 'var(--color-error)', borderRadius: '12px', fontWeight: 800 }} onClick={handleDeleteEvent}>
                       {deleteEventMutation.isPending ? 'Purging...' : 'Confirm Purge'}
                    </button>
                </div>
             </div>
          </Modal>
        )}
      </div>
    </>
  );
};

export default Events;
