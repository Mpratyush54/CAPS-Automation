import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlusCircle, Building2, Edit2, Trash2, Shield, X, Save, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import TopBar from '../components/TopBar';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { SkeletonText, TableSkeleton } from '../components/Skeleton';

// UI Components
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';

// Hooks
import { useTeams, useUsers, useCreateTeam, useUpdateTeam, useDeleteTeam, useAddTeamMember, useRemoveTeamMember } from '../hooks/useOrganization';

const TeamModal = ({ onClose, onSave, initial = null }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    focus: initial?.focus || ''
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: initial?.id,
      ...form
    });
    onClose();
  };

  return (
    <Modal title={initial ? 'Configure Tactical Unit' : 'Establish New Directive Unit'} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--color-surface-lowest)', padding: '0.25rem' }}>
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Unit Designation *</label>
            <input 
              className="input-field" 
              style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }}
              value={form.name} 
              onChange={(e) => set('name', e.target.value)} 
              required 
              placeholder="e.g. Strategic Response Wing" 
            />
          </div>
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Operational Focus</label>
            <textarea 
              className="input-field" 
              rows={3} 
              style={{ borderRadius: '12px', background: 'var(--color-surface-low)', resize: 'none' }}
              value={form.focus} 
              onChange={(e) => set('focus', e.target.value)} 
              placeholder="Primary mission and deployment scope..." 
            />
          </div>
        </div>
        <div className="card-action-row" style={{ marginTop: '2rem', gap: '8px' }}>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, borderRadius: '12px' }}>Cancel</button>
          <button type="submit" className="btn-primary" style={{ flex: 1.5, borderRadius: '12px', fontWeight: 800 }}><Save size={14} /> {initial ? 'Update Unit' : 'Initialize Unit'}</button>
        </div>
      </form>
    </Modal>
  );
};

const MemberModal = ({ onClose, onSave, allUsers, existingMemberIds }) => {
  const [search, setSearch] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [role, setRole] = useState(ROLES.VOLUNTEER);

  const filtered = (allUsers || []).filter(u =>
    !existingMemberIds.has(String(u.id)) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 8);

  return (
    <Modal title="Operative Assignment" onClose={onClose}>
      <div style={{ background: 'var(--color-surface-lowest)', padding: '0.25rem' }}>
        {!pendingUser ? (
          <div className="stack-gap-1">
            <SearchBar 
              autoFocus 
              placeholder="Search operative by signal..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              containerStyle={{ background: 'var(--color-surface-low)', borderRadius: '12px' }}
            />
            <div className="stack-gap-05" style={{ maxHeight: '350px', overflowY: 'auto', padding: '4px', marginTop: '0.5rem' }}>
              {filtered.map(user => (
                <button
                  key={user.id}
                  className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '1rem', textAlign: 'left', border: '1.5px solid var(--color-outline-variant)', borderRadius: '12px', marginBottom: '8px', transition: 'all 0.2s ease' }}
                  onClick={() => setPendingUser(user)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="avatar" style={{ width: '2.5rem', height: '2.5rem', fontWeight: 800 }}>{user.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{user.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{user.email}</div>
                    </div>
                    <ChevronRight size={14} opacity={0.3} />
                  </div>
                </button>
              ))}
              {filtered.length === 0 && search && <EmptyState mini title="No match" message="Agent signal not found." />}
            </div>
          </div>
        ) : (
          <div className="stack-gap-1">
            <div style={{ padding: '1.25rem', background: 'var(--gradient-primary)', borderRadius: '16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#fff', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
              <div className="avatar" style={{ width: '3rem', height: '3rem', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '1.25rem', fontWeight: 900 }}>{pendingUser.name[0]}</div>
              <div>
                <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.8 }}>PREPARING ASSIGNMENT FOR</p>
                <p style={{ margin: '2px 0 0', fontWeight: 800, fontSize: '1.1rem' }}>{pendingUser.name}</p>
              </div>
            </div>

            <div className="stack-gap-05">
              <label className="input-label" style={{ fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Operational Role Permission</label>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {[ROLES.VOLUNTEER, ROLES.TEAM_LEAD, ROLES.ADMIN].map(r => {
                  const isActive = role === r;
                  return (
                    <button
                      key={r}
                      className="btn-ghost"
                      style={{
                        width: '100%', justifyContent: 'flex-start', padding: '1rem', borderRadius: '14px',
                        border: `2px solid ${isActive ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
                        background: isActive ? 'var(--color-primary-fixed-dim)' : 'var(--color-surface-low)',
                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '1rem'
                      }}
                      onClick={() => setRole(r)}
                    >
                      <div style={{
                        width: '2.25rem', height: '2.25rem', borderRadius: '10px',
                        background: isActive ? 'var(--color-primary)' : 'rgba(0,0,0,0.05)',
                        color: isActive ? '#fff' : 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Shield size={18} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>{r}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Operational {r.toLowerCase()} authorization</div>
                      </div>
                      {isActive && <div style={{ marginLeft: 'auto', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</div>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '8px' }}>
              <button className="btn-ghost" style={{ flex: 1, borderRadius: '12px' }} onClick={() => setPendingUser(null)}>Abort</button>
              <button className="btn-primary" style={{ flex: 1.5, borderRadius: '12px', fontWeight: 800, justifyContent: 'center' }} onClick={() => onSave(pendingUser, role)}>Deploy Operative</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

const Organization = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModal = searchParams.get('modal');
  const selectedParamId = searchParams.get('id');

  const { role } = useAuthStore();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  const { data: teams = [], isLoading: isLoadingTeams, error: teamsError, refetch: refetchTeams } = useTeams(search);
  const { data: allUsers = [] } = useUsers();

  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const addMemberMutation = useAddTeamMember();
  const removeMemberMutation = useRemoveTeamMember();

  // Sync state with URL
  useEffect(() => {
    if (selectedParamId && selectedId !== selectedParamId) {
      setSelectedId(selectedParamId);
    } else if (!selectedParamId && teams.length > 0 && !selectedId) {
       setSelectedId(teams[0].id);
    }
  }, [selectedParamId, teams]);

  const setModal = (m) => {
    if (!m) {
      searchParams.delete('modal');
    } else {
      searchParams.set('modal', m);
    }
    setSearchParams(searchParams);
  };

  const handleSelectTeam = (id) => {
    setSelectedId(id);
    searchParams.set('id', id);
    setSearchParams(searchParams);
  };

  const selectedTeam = teams.find(t => t.id === selectedId) || (teams.length > 0 ? teams[0] : null);
  const displayName = selectedTeam?.name || 'Tactical Unit';
  const canManageDirectory = can(role, 'manageWings');
  const error = teamsError?.message || createTeamMutation.error?.message || updateTeamMutation.error?.message || deleteTeamMutation.error?.message || addMemberMutation.error?.message || removeMemberMutation.error?.message;

  const saveTeam = async (data) => {
    if (data.id) {
      await updateTeamMutation.mutateAsync({ id: data.id, teamData: data });
    } else {
      const saved = await createTeamMutation.mutateAsync(data);
      handleSelectTeam(saved?._id || saved?.id);
    }
    setModal(null);
  };

  const addMember = async (user, userRole) => {
    if (!selectedId) return;
    await addMemberMutation.mutateAsync({ teamId: selectedId, memberData: { userId: user.id, role: userRole } });
    setModal(null);
  };

  const removeMember = async (memberId) => {
    if (!selectedId) return;
    await removeMemberMutation.mutateAsync({ teamId: selectedId, userId: memberId });
  };

  const deleteTeam = async () => {
    if (activeModal !== 'delete' || !selectedId) return;
    await deleteTeamMutation.mutateAsync(selectedId);
    setSelectedId(null);
    searchParams.delete('id');
    setModal(null);
  };

  const pageTitles = {
    [ROLES.TEAM_LEAD]: 'Unit Roster',
    [ROLES.ADMIN]: 'Operational Directory',
    [ROLES.SUPER_ADMIN]: 'Full Organizational Intelligence',
  };

  return (
    <>
      <TopBar title={pageTitles[role] || 'Organization'} />
      <div className="page-body">
        {error && <Alert variant="error">{error}</Alert>}

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {canManageDirectory && (
            <button className="btn-primary" onClick={() => setModal('add_unit')} style={{ borderRadius: '12px' }}><PlusCircle size={14} /> Establish New Unit</button>
          )}
        </div>

        <div className="mobile-safe-grid stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) minmax(0, 1fr)', alignItems: 'start', minHeight: 'calc(100vh - 12rem)', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-low)', border: '1px solid var(--color-outline-variant)' }}>
            <div className="card-flex-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-on-surface-variant)' }}>Units Directory</h3>
              <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={() => refetchTeams()} title="Sync Signals"><RefreshCw size={14} /></button>
            </div>

            <SearchBar 
              placeholder="Filter units..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              containerStyle={{ marginBottom: '1.5rem', borderRadius: '12px', background: 'var(--color-surface-lowest)' }}
            />

            <div className="stack-gap-1" style={{ flex: 1 }}> 
              {isLoadingTeams && teams.length === 0 ? (
                <TableSkeleton rows={8} cols={1} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {teams.map(team => {
                    const isActive = selectedId === team.id;
                    return (
                      <button key={team.id} onClick={() => handleSelectTeam(team.id)}
                        className={`btn-ghost ${isActive ? 'active' : ''}`}
                        style={{
                          width: '100%', justifyContent: 'flex-start',
                          padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.85rem', 
                          background: isActive ? 'var(--color-primary-fixed-dim)' : 'transparent', 
                          color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface)',
                          borderRadius: '12px',
                          border: isActive ? '1px solid var(--color-primary-fixed)' : '1px solid transparent'
                        }} >
                        <Building2 size={16} style={{ marginRight: '0.75rem', opacity: isActive ? 1 : 0.4 }} /> {team.name} </button>);
                  })}
                </div>
              )}
            </div>

            {!isLoadingTeams && teams.length === 0 && (
              <EmptyState mini title="Quiet Signals" message="No units found." />
            )}
          </div>

          <div className="card-column org-content-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {selectedTeam ? (
              <>
                <div className="card org-hero-card" style={{ background: 'var(--gradient-primary)', color: '#fff', position: 'relative', overflow: 'hidden', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                  <div style={{ position: 'absolute', top: '-10%', right: '-5%', opacity: 0.1, pointerEvents: 'none', transform: 'rotate(15deg)' }}><Building2 size={200} /></div>
                  <div className="card-flex-between" style={{ alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div className="org-hero-copy" style={{ maxWidth: '70%' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem', opacity: 0.8 }}>TACTICAL UNIT DESIGNATION</div>
                      <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{displayName}</h2>
                      <p style={{ margin: '1.5rem 0 0', fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.6, fontWeight: 500 }}>{selectedTeam.focus || selectedTeam.description || 'Focus description pending in HQ records.'}</p>
                    </div>
                    <div className="org-hero-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
                      {canManageDirectory && <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '12px', backdropFilter: 'blur(10px)' }} onClick={() => setModal('edit_unit')}><Edit2 size={14} /> Configure</button>}
                      {canManageDirectory && <button className="btn-secondary" style={{ background: 'rgba(255,0,0,0.2)', border: 'none', borderRadius: '12px', color: '#fff', backdropFilter: 'blur(10px)' }} onClick={() => setModal('delete')}><Trash2 size={14} /> Purge</button>}
                    </div>
                  </div>
                </div>

                <div className="card table-card" style={{ height: 'fit-content', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--color-outline-variant)' }}>
                  <div className="card-flex-between org-roster-header" style={{ padding: '1.5rem 2rem', background: 'var(--color-surface-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>UNIT ROSTER <span style={{ opacity: 0.4, marginLeft: '8px', fontWeight: 400 }}>| {(selectedTeam?.members || []).length} Operatives</span></h3>
                    {canManageDirectory && (
                      <button className="btn-primary sm" style={{ borderRadius: '12px' }} onClick={() => setModal('add_member')}>
                        <PlusCircle size={14} /> Deploy Operative
                      </button>
                    )}
                  </div>

                  <table className="data-table">
                    <thead><tr><th>Designation</th><th>Signal Address</th><th>Authorization Role</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                    <tbody style={{ background: 'var(--color-surface-lowest)' }}>
                      {(selectedTeam?.members || []).map((member) => (
                        <tr key={member.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                               <div className="avatar" style={{ width: '2rem', height: '2rem', fontSize: '0.75rem', fontWeight: 800 }}>{member.name[0]}</div>
                               <span style={{ fontWeight: 600 }}>{member.name} {member.isLead && <Badge variant="primary" mini style={{ marginLeft: '4px' }}>LEAD</Badge>}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8rem', fontWeight: 600 }}>{member.email}</td>
                          <td>
                            <Badge variant={member.isLead ? 'primary' : 'neutral'} style={{ borderRadius: '6px', fontSize: '0.65rem' }}>{member.role}</Badge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {canManageDirectory && <button className="btn-icon sm" onClick={() => removeMember(member.id)} style={{ color: 'var(--color-error)' }}><Trash2 size={14} /></button>}
                          </td>
                        </tr>
                      ))}
                      {(!selectedTeam?.members || selectedTeam.members.length === 0) && (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-outline)' }}><EmptyState mini title="Zero Roster" message="No operatives currently assigned to this mission unit." /></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : !isLoadingTeams && (
              <EmptyState 
                title="Select Tactical Unit" 
                message="Choose a mission unit from the directory to view roster and directives." 
              />
            )}
          </div>
        </div>

        {/* MODALS */}
        {(activeModal === 'add_unit' || activeModal === 'edit_unit') && <TeamModal initial={activeModal === 'edit_unit' ? selectedTeam : null} onClose={() => setModal(null)} onSave={saveTeam} />}
        {activeModal === 'add_member' && (
          <MemberModal
            allUsers={allUsers}
            existingMemberIds={new Set(selectedTeam?.members?.map(m => String(m.id)))}
            onClose={() => setModal(null)}
            onSave={addMember}
          />
        )}

        {activeModal === 'delete' && selectedTeam && (
          <Modal title="Confirm Purge" onClose={() => setModal(null)} maxWidth="420px">
            <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-error-container)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Trash2 size={32} />
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>PURGE TACTICAL UNIT?</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '2rem' }}>
                    This will permanently dissolve <strong style={{ color: 'var(--color-on-surface)' }}>{selectedTeam.name}</strong> and all associated rosters. This action is final.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" style={{ flex: 1, borderRadius: '12px' }} onClick={() => setModal(null)}>Abort</button>
                    <button className="btn-primary" style={{ flex: 1.5, background: 'var(--color-error)', borderColor: 'var(--color-error)', borderRadius: '12px', fontWeight: 800 }} onClick={deleteTeam}>Dissolve Unit</button>
                </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
};

export default Organization;
