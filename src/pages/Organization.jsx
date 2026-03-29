import { useEffect, useState, useCallback } from 'react';
import { PlusCircle, ChevronRight, Users, Building2, Edit2, Trash2, Search, Shield, Info, X, Save, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { api, getErrorMessage, unwrap } from '../lib/api';

const Modal = ({ title, onClose, children, maxWidth = '480px' }) => (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal-box" style={{ maxWidth }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex', padding: '0.25rem', borderRadius: '0.375rem' }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

const TeamModal = ({ onClose, onSave, initial = null }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    type: initial?.type || 'wing',
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
    <Modal title={initial ? 'Edit Unit' : 'Create New Unit'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          <div>
            <label className="input-label">Unit Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="e.g. General Wing or Finance Committee" />
          </div>
          <div>
            <label className="input-label">Organization Type *</label>
            <select className="input-field" value={form.type} onChange={(e) => set('type', e.target.value)} required>
              <option value="wing">Wing</option>
              <option value="committee">Committee</option>
            </select>
          </div>
          <div><label className="input-label">Focus / Description</label><textarea className="input-field" rows={3} value={form.focus} onChange={(e) => set('focus', e.target.value)} style={{ resize: 'vertical' }} placeholder="Mission or area of responsibility..." /></div>
        </div>
        <div className="card-action-row" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> {initial ? 'Save Changes' : 'Create Unit'}</button>
        </div>
      </form>
    </Modal>
  );
};

const WingModal = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  return (
    <Modal title="Create New Wing" onClose={onClose}>
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        <div><label className="input-label">Wing Name *</label><input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><label className="input-label">Description</label><textarea className="input-field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="card-action-row" style={{ marginTop: '1.25rem' }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave({ name, description })} style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> Create Wing</button>
        </div>
      </div>
    </Modal>
  );
};

const CommitteeModal = ({ onClose, onSave, wings }) => {
  const [name, setName] = useState('');
  const [wingId, setWingId] = useState('');
  const [description, setDescription] = useState('');
  return (
    <Modal title="Create New Committee" onClose={onClose}>
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        <div><label className="input-label">Committee Name *</label><input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div>
          <label className="input-label">Parent Wing *</label>
          <select className="input-field" value={wingId} onChange={(e) => setWingId(e.target.value)} required>
            <option value="">Select Wing</option>
            {wings.map(w => <option key={w._id || w.id} value={w._id || w.id}>{w.name}</option>)}
          </select>
        </div>
        <div><label className="input-label">Description</label><textarea className="input-field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="card-action-row" style={{ marginTop: '1.25rem' }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave({ name, wingId, description })} style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> Create Committee</button>
        </div>
      </div>
    </Modal>
  );
};

const MemberModal = ({ onClose, onSave, allUsers, existingMemberIds }) => {
  const [search, setSearch] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [role, setRole] = useState(ROLES.VOLUNTEER);

  const filtered = allUsers.filter(u =>
    !existingMemberIds.has(String(u.id)) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 8);

  return (
    <Modal title="Add Member to Roster" onClose={onClose} maxWidth="400px">
      {!pendingUser ? (
        <div className="stack-gap-1">
          <div className="search-bar" style={{ background: 'var(--color-surface-low)' }}>
            <Search size={14} style={{ color: 'var(--color-outline)', marginLeft: '0.75rem' }} />
            <input
              autoFocus
              className="search-input"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent' }}
            />
          </div>
          <div className="stack-gap-05" style={{ maxHeight: '300px', overflowY: 'auto', padding: '2px' }}>
            {filtered.map(user => (
              <button
                key={user.id}
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem', textAlign: 'left', border: '1px solid var(--color-surface-high)', borderRadius: '0.75rem' }}
                onClick={() => setPendingUser(user)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="avatar" style={{ width: '2.25rem', height: '2.25rem' }}>{user.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{user.email}</div>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && search && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-outline)' }}>No matching users found.</p>}
          </div>
        </div>
      ) : (
        <div className="stack-gap-1">
          <div style={{ padding: '1rem', background: 'var(--color-primary-fixed)', borderRadius: '0.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="avatar" style={{ width: '2.5rem', height: '2.5rem', background: 'var(--color-on-primary-fixed)', color: 'var(--color-primary-fixed)' }}>{pendingUser.name[0]}</div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-primary-fixed-variant)', fontWeight: 500 }}>Assigning role to</p>
              <p style={{ margin: '0.125rem 0 0', fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-primary-fixed)' }}>{pendingUser.name}</p>
            </div>
          </div>

          <div className="stack-gap-05">
            <p style={{ margin: '0.5rem 0 0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Select Organizational Role</p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {[ROLES.VOLUNTEER, ROLES.TEAM_LEAD, ROLES.ADMIN].map(r => {
                const isActive = role === r;
                return (
                  <button
                    key={r}
                    className={`btn-ghost`}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      padding: '1rem',
                      borderRadius: '0.875rem',
                      border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-surface-high)'}`,
                      background: isActive ? 'var(--color-secondary-fixed-dim)' : 'transparent',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                    onClick={() => setRole(r)}
                  >
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '0.5rem',
                      background: isActive ? 'var(--color-primary)' : 'var(--color-surface-container)',
                      color: isActive ? '#fff' : 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Shield size={16} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>{r}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', opacity: 0.8 }}>Assign as a {r.toLowerCase()} member</div>
                    </div>
                    {isActive && <div style={{ marginLeft: 'auto', width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>✓</div>}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" style={{ flex: 1, padding: '0.875rem' }} onClick={() => setPendingUser(null)}>Back to search</button>
            <button className="btn-primary" style={{ flex: 1, padding: '0.875rem', justifyContent: 'center' }} onClick={() => onSave(pendingUser, role)}>Confirm & Add</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

const Organization = () => {
  const { role } = useAuthStore();
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [teamModal, setTeamModal] = useState(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    loadTeams();
    const uLoad = async () => {
      try {
        const uRes = await api.get('/api/organization/users/all');
        const uData = unwrap(uRes);
        setAllUsers((uData?.rows || []).map(u => ({ id: String(u._id || u.id), name: u.name, email: u.email })));
      } catch (e) {
        console.error('Failed to load user list', e);
      }
    };
    uLoad();
  }, [debouncedSearch]);

  const loadTeams = async (isMounted = true) => {
    setLoading(true);
    try {
      const response = await api.get('/api/organization/teams', { params: { search: debouncedSearch || undefined } });
      const payload = unwrap(response);
      const rows = payload?.rows || [];
      const nextTeams = rows.map(t => ({ ...t, id: t._id || t.id, name: t.name || 'Unnamed Team', type: t.type || 'wing' }));
      if (isMounted) {
        setTeams(nextTeams);
        if (!selectedId && nextTeams.length) {
          setSelectedId(nextTeams[0].id);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };








  const selectedTeam = teams.find(t => t.id === selectedId);
  const displayName = selectedTeam?.name || 'Organization Unit';
  const activeFocus = selectedTeam;
  const canManageDirectory = can(role, 'manageWings');

  const saveTeam = async (data) => {
    setError(null);
    try {
      const isEdit = !!data.id;
      const endpoint = isEdit ? `/api/organization/teams/${data.id}` : '/api/organization/teams';
      const method = isEdit ? 'patch' : 'post';
      const response = await api[method](endpoint, data);
      const raw = unwrap(response);
      const saved = { ...raw, id: raw._id || raw.id };

      setTeams(prev => isEdit
        ? prev.map(t => t.id === saved.id ? saved : t)
        : [saved, ...prev]
      );
      setSelectedId(saved.id);
      setTeamModal(null);

      setTimeout(() => loadTeams(), 500);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save unit entry.'));
    }
  };


  const addMember = async (user, userRole) => {
    if (!selectedId) return;
    try {
      // 1. Add to the team member list and update user's researchRole
      await api.post(`/api/organization/teams/${selectedId}/members`, { userId: user.id, role: userRole });

      setMemberModalOpen(false);
      loadTeams();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add member.'));
    }
  };

  const removeMember = async (memberId) => {
    const teamId = selectedTeam?.id;
    if (!teamId) return;
    try {
      await api.delete(`/api/organization/teams/${teamId}/members/${memberId}`);
      loadTeams();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove member.'));
    }
  };

  const deleteTeam = async () => {
    if (!deleteModal?.id) return;
    try {
      await api.delete(`/api/organization/teams/${deleteModal.id}`);
      setTeams(prev => prev.filter(t => t.id !== deleteModal.id));
      if (selectedId === deleteModal.id) setSelectedId(null);
      setDeleteModal(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete entry.'));
    }
  };

  const pageTitles = {
    [ROLES.TEAM_LEAD]: 'My Team Directory',
    [ROLES.ADMIN]: 'Organization Directory',
    [ROLES.SUPER_ADMIN]: 'Full Organization Directory',
  };

  return (
    <>
      <TopBar title={pageTitles[role] || 'Organization'} />
      <div className="page-body">
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.625rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {canManageDirectory && (
            <button className="btn-primary" onClick={() => setTeamModal({ team: null })}><PlusCircle size={14} /> Add New Unit</button>
          )}
        </div>

        <div className="mobile-safe-grid" style={{ gridTemplateColumns: 'minmax(280px, 300px) minmax(0, 1fr)', alignItems: 'start', height: 'calc(100vh - 12rem)' }}>
          <div className="card" style={{ padding: '0.875rem', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div className="card-flex-between" style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Unit Directory</h3>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={() => loadTeams()} title="Refresh Directory"><RefreshCw size={14} /></button>
              </div>
            </div>

            <div className="search-bar" style={{ marginBottom: '1rem' }}>
              <Search size={14} style={{ color: 'var(--color-outline)' }} />
              <input placeholder="Search directory..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="stack-gap-1"> {/* WINGS */}
              {
                teams.filter(t => t.type === 'wing').filter(t => (t?.name || '').toLowerCase().includes(
                  (search || '').toLowerCase())).map(team => {
                    const isActive = selectedId === team.id;
                    return (
                      <button key={team.id} onClick={() => setSelectedId(team.id)}
                        className={`btn-ghost ${isActive ? 'active' : ''}`}
                        style={{
                          width: '100%', justifyContent: 'flex-start',
                          padding: '0.5rem', fontWeight: 700, fontSize: '0.8125rem', background: isActive ? 'rgba(67, 67, 213, 0.1)' : 'transparent', borderRadius: '0.5rem'
                        }} >
                        <Building2 size={13} style={{ marginRight: '0.5rem' }} /> {team.name} </button>);
                  })}
              {/* COMMITTEES */}
              {
                teams.filter(t => t.type === 'committee').filter(t => (t?.name || '').toLowerCase().includes((search || '').toLowerCase())).map(team => {
                  const isActive = selectedId === team.id; return (<button key={team.id} onClick={() => setSelectedId(team.id)} className={`btn-ghost ${isActive ? 'active' : ''}`} style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', justifyContent: 'flex-start', marginLeft: '1rem' }} > <Shield size={11} style={{ marginRight: '0.4rem' }} /> {team.name} </button>);
                })} </div>

            {!loading && teams.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-outline)', padding: '1rem' }}>No organizational units found.</p>
            )}
          </div>

          <div className="card-column">
            {activeFocus ? (
              <div className="stack-gap-1">
                <div className="card" style={{ background: 'var(--gradient-primary)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-10%', right: '-5%', opacity: 0.1, pointerEvents: 'none' }}><Building2 size={120} /></div>
                  <div className="card-flex-between" style={{ alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div>
                      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{displayName}</h2>
                      <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>Type: {activeFocus.type === 'wing' ? 'Wing' : 'Committee'}</p>

                      <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', opacity: 0.84, fontStyle: activeFocus.focus ? 'normal' : 'italic' }}>{activeFocus.focus || activeFocus.description || 'No focus description available.'}</p>
                    </div>
                    <div className="card-action-row" style={{ flexShrink: 0 }}>
                      {canManageDirectory && <button className="btn-ghost" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }} onClick={() => setTeamModal({ team: selectedTeam })}><Edit2 size={13} /> Edit</button>}
                      {canManageDirectory && <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '0.375rem', padding: '0.375rem 0.75rem', color: '#fff', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }} onClick={() => setDeleteModal(selectedTeam)}><Trash2 size={13} /> Delete</button>}
                    </div>
                  </div>
                </div>

                <div className="card table-card" style={{ height: 'fit-content' }}>
                  <div className="card-flex-between" style={{ padding: '1rem 1.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{displayName} Members</h3>
                    {canManageDirectory && (
                      <button className="btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setMemberModalOpen(true)}>
                        <PlusCircle size={12} /> Add Member
                      </button>
                    )}
                  </div>

                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                    <tbody>
                      {(selectedTeam?.members || []).map((member) => (
                        <tr key={member.id}>
                          <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {member.name}
                            {member.isLead && <span title="Team Lead / Admin" style={{ color: 'var(--color-primary)', display: 'flex' }}><Shield size={12} fill="currentColor" fillOpacity={0.2} /></span>}
                          </td>
                          <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{member.email}</td>
                          <td><span className={`badge ${member.isLead ? 'badge-primary' : 'badge-neutral'}`} style={{ fontWeight: member.isLead ? 700 : 400 }}>{member.role}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            {canManageDirectory && <button className="btn-ghost" onClick={() => removeMember(member.id)} style={{ color: 'var(--color-error)', border: 'none', cursor: 'pointer', background: 'transparent' }}><Trash2 size={13} /></button>}
                          </td>
                        </tr>
                      ))}
                      {(!selectedTeam?.members || selectedTeam.members.length === 0) && (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-outline)' }}>No members listed in this unit. Click "Add Member" to populate the roster.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : !loading && (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Info size={32} style={{ color: 'var(--color-outline)', marginBottom: '1rem' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Select an Organizational Unit</p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>Browse the directory on the left to see members and focus areas.</p>
              </div>
            )}
          </div>
        </div>

        {teamModal && <TeamModal initial={teamModal.team} onClose={() => setTeamModal(null)} onSave={saveTeam} />}
        {memberModalOpen && (
          <MemberModal
            allUsers={allUsers}
            existingMemberIds={new Set(selectedTeam?.members?.map(m => String(m.id)))}
            onClose={() => setMemberModalOpen(false)}
            onSave={addMember}
          />
        )}

        {deleteModal && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteModal(null)}>
            <div className="modal-box" style={{ maxWidth: '400px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Confirm Delete</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
                Are you sure you want to delete <strong style={{ color: 'var(--color-on-surface)' }}>{deleteModal.name}</strong>? This action cannot be undone.
              </p>
              <div className="card-action-row">
                <button className="btn-secondary" onClick={() => setDeleteModal(null)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn-primary" onClick={deleteTeam} style={{ flex: 1, justifyContent: 'center', background: 'var(--color-error)' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Organization;
