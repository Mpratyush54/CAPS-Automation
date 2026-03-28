import { useEffect, useState } from 'react';
import { PlusCircle, ChevronRight, Users, Building2, Edit2, Trash2, Search, Shield, Info, X, Save } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { api, getErrorMessage, unwrap } from '../lib/api';
import { normalizeTeam } from '../lib/adapters';

const TEAM_DIRECTORY = [
  {
    id: 1,
    labelOne: 'Tech Wing',
    labelTwo: 'Dev Board',
    lead: 'Alex Rivera',
    focus: 'Development and delivery',
    members: [
      { id: 101, name: 'Jamie Park', email: 'jamie@worklog.io', role: 'Volunteer', joined: '2025-10-01' },
      { id: 102, name: 'Riya Gupta', email: 'riya@worklog.io', role: 'Volunteer', joined: '2025-10-15' },
      { id: 103, name: 'Nathan Clarke', email: 'nathan@worklog.io', role: 'Volunteer', joined: '2025-11-01' },
    ],
  },
  {
    id: 2,
    labelOne: 'Community Wing',
    labelTwo: 'Events Comm.',
    lead: 'Morgan Chen',
    focus: 'Event delivery and outreach',
    members: [
      { id: 201, name: 'Divya S.', email: 'divya@worklog.io', role: 'Team Lead', joined: '2025-09-01' },
      { id: 202, name: 'Farhan Ali', email: 'farhan@worklog.io', role: 'Volunteer', joined: '2025-09-15' },
    ],
  },
  {
    id: 3,
    labelOne: 'Health Wing',
    labelTwo: 'Health Comm.',
    lead: 'Dana Kim',
    focus: 'Health programs and field coordination',
    members: [
      { id: 301, name: 'Asha Menon', email: 'asha@worklog.io', role: 'Volunteer', joined: '2025-08-18' },
      { id: 302, name: 'Arjun P.', email: 'arjunp@worklog.io', role: 'Team Lead', joined: '2025-07-01' },
    ],
  },
  {
    id: 4,
    labelOne: 'HR Wing',
    labelTwo: 'Vol. Affairs',
    lead: 'Jordan Smith',
    focus: 'Volunteer onboarding and training',
    members: [
      { id: 401, name: 'Nina R.', email: 'nina@worklog.io', role: 'Team Lead', joined: '2025-06-21' },
    ],
  },
];

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
  const [form, setForm] = useState({ labelOne: initial?.labelOne || '', labelTwo: initial?.labelTwo || '', lead: initial?.lead || '', focus: initial?.focus || '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: initial?.id || Date.now(), ...form, members: initial?.members || [] });
    onClose();
  };
  return (
    <Modal title={initial ? `Edit: ${initial.labelOne} / ${initial.labelTwo}` : 'Add Team Labels'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          <div><label className="input-label">Label 1 *</label><input className="input-field" placeholder="e.g. Tech Wing" value={form.labelOne} onChange={(e) => set('labelOne', e.target.value)} required /></div>
          <div><label className="input-label">Label 2 *</label><input className="input-field" placeholder="e.g. Dev Board" value={form.labelTwo} onChange={(e) => set('labelTwo', e.target.value)} required /></div>
          <div><label className="input-label">Team Lead *</label><input className="input-field" value={form.lead} onChange={(e) => set('lead', e.target.value)} required /></div>
          <div><label className="input-label">Focus</label><textarea className="input-field" rows={3} value={form.focus} onChange={(e) => set('focus', e.target.value)} style={{ resize: 'vertical' }} /></div>
        </div>
        <div className="card-action-row" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> {initial ? 'Save Changes' : 'Create Team'}</button>
        </div>
      </form>
    </Modal>
  );
};

const MemberModal = ({ onClose, onSave, initial = null, teamName }) => {
  const [form, setForm] = useState({ name: initial?.name || '', email: initial?.email || '', role: initial?.role || 'Volunteer', joined: initial?.joined || new Date().toISOString().split('T')[0] });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: initial?.id || Date.now(), ...form });
    onClose();
  };
  return (
    <Modal title={initial ? `Edit Member: ${initial.name}` : `Add Member to ${teamName}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          <div><label className="input-label">Full Name *</label><input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
          <div><label className="input-label">Email *</label><input className="input-field" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required /></div>
          <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div><label className="input-label">Role</label><select className="input-field" value={form.role} onChange={(e) => set('role', e.target.value)}>{['Volunteer', 'Team Lead', 'Admin'].map((r) => <option key={r}>{r}</option>)}</select></div>
            <div><label className="input-label">Date Joined</label><input className="input-field" type="date" value={form.joined} onChange={(e) => set('joined', e.target.value)} /></div>
          </div>
        </div>
        <div className="card-action-row" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> {initial ? 'Save Changes' : 'Add Member'}</button>
        </div>
      </form>
    </Modal>
  );
};

const ConfirmDelete = ({ title, message, onConfirm, onClose }) => (
  <Modal title="Confirm Delete" onClose={onClose} maxWidth="400px">
    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '0 0 1.5rem' }}><strong style={{ color: 'var(--color-on-surface)' }}>{title}</strong><br />{message}</p>
    <div className="card-action-row">
      <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
      <button className="btn-primary" onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, justifyContent: 'center', background: 'var(--color-error)', boxShadow: 'none' }}>Delete</button>
    </div>
  </Modal>
);

const Organization = () => {
  const { role } = useAuthStore();
  const [teams, setTeams] = useState(TEAM_DIRECTORY);
  const [selectedId, setSelectedId] = useState(TEAM_DIRECTORY[0].id);
  const [search, setSearch] = useState('');
  const [teamModal, setTeamModal] = useState(null);
  const [memberModal, setMemberModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [error, setError] = useState(null);

  const selectedTeam = teams.find((team) => team.id === selectedId) || teams[0];
  const filteredTeams = teams.filter((team) => `${team.labelOne} ${team.labelTwo}`.toLowerCase().includes(search.toLowerCase()));
  const canManageTeams = can(role, 'manageCommittees');
  const canManageDirectory = can(role, 'manageWings');

  useEffect(() => {
    let mounted = true;
    const loadTeams = async () => {
      try {
        const response = await api.get('/api/organization/teams', {
          params: { search: search || undefined, page: 1, pageSize: 50 },
        });
        const payload = unwrap(response);
        const rows = payload?.rows || payload?.items || [];
        if (mounted && rows.length) {
          const nextTeams = rows.map(normalizeTeam);
          setTeams(nextTeams);
          if (!nextTeams.some((team) => team.id === selectedId)) setSelectedId(nextTeams[0]?.id);
        }
      } catch {
        // Keep seed data as fallback.
      }
    };
    loadTeams();
    return () => {
      mounted = false;
    };
  }, [search, selectedId]);

  const saveTeam = async ({ id, ...data }) => {
    setError(null);
    try {
      const endpoint = teamModal?.team ? `/api/organization/teams/${id}` : '/api/organization/teams';
      const method = teamModal?.team ? 'patch' : 'post';
      const response = await api[method](endpoint, {
        labelOne: data.labelOne,
        labelTwo: data.labelTwo,
        focus: data.focus,
        leadUserId: null,
      });
      const saved = normalizeTeam(unwrap(response) || { id, ...data, members: data.members || [] });
      setTeams((current) => current.some((team) => team.id === saved.id) ? current.map((team) => team.id === saved.id ? { ...team, ...saved } : team) : [...current, saved]);
      setSelectedId(saved.id);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save team.'));
    }
  };

  const saveMember = async ({ id, ...data }) => {
    setError(null);
    try {
      const endpoint = memberModal.member
        ? `/api/organization/teams/${memberModal.team.id}/members/${id}`
        : `/api/organization/teams/${memberModal.team.id}/members`;
      const method = memberModal.member ? 'patch' : 'post';
      await api[method](endpoint, data);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save member.'));
    }
    setTeams((current) => current.map((team) => team.id === memberModal.team.id ? { ...team, members: memberModal.member ? team.members.map((member) => member.id === id ? { id, ...data } : member) : [...team.members, { id, ...data }] } : team));
  };

  const deleteMember = async () => {
    setError(null);
    try {
      await api.delete(`/api/organization/teams/${deleteModal.team.id}/members/${deleteModal.member.id}`);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete member.'));
    }
    setTeams((current) => current.map((team) => team.id === deleteModal.team.id ? { ...team, members: team.members.filter((member) => member.id !== deleteModal.member.id) } : team));
  };

  const deleteTeam = async () => {
    setError(null);
    try {
      await api.delete(`/api/organization/teams/${deleteModal.team.id}`);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete team.'));
    }
    setTeams((current) => current.filter((team) => team.id !== deleteModal.team.id));
  };

  const pageTitles = {
    [ROLES.TEAM_LEAD]: 'My Team Labels',
    [ROLES.ADMIN]: 'Team Directory',
    [ROLES.SUPER_ADMIN]: 'Team Directory',
  };

  return (
    <>
      <TopBar title={pageTitles[role] || 'Organization'} />
      <div className="page-body">
        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.625rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', fontSize: '0.8125rem' }}>{error}</div>}
        <div className="card" style={{ marginBottom: '1rem', background: 'var(--color-surface-low)' }}>
          <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            Wing and committee are treated here as two parallel labels for the same team. This page no longer assumes one contains the other.
          </div>
        </div>

        <div className="mobile-safe-grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)', alignItems: 'start' }}>
          <div className="card" style={{ padding: '0.875rem' }}>
            <div className="card-flex-between" style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Teams</h3>
              {canManageDirectory && <button className="btn-primary" style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }} onClick={() => setTeamModal({ team: null })}><PlusCircle size={12} /> Add</button>}
            </div>
            <div className="search-bar" style={{ marginBottom: '0.75rem' }}>
              <Search size={13} style={{ color: 'var(--color-outline)' }} />
              <input placeholder="Search team labels..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filteredTeams.map((team) => (
              <button key={team.id} onClick={() => setSelectedId(team.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '0.25rem', background: selectedTeam?.id === team.id ? 'var(--color-primary-fixed)' : 'transparent' }}>
                <div style={{ width: '1.875rem', height: '1.875rem', borderRadius: '0.4rem', background: 'rgba(67,67,213,.12)', border: '1.5px solid #4343d5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Building2 size={12} style={{ color: '#4343d5' }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{team.labelOne}</p>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>{team.labelTwo}</p>
                </div>
                <ChevronRight size={13} style={{ color: 'var(--color-outline)', flexShrink: 0 }} />
              </button>
            ))}
          </div>

          {selectedTeam ? (
            <div className="stack-gap-1">
              <div className="card" style={{ background: 'var(--gradient-primary)', color: '#fff' }}>
                <div className="card-flex-between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.78, fontWeight: 700 }}>Team Labels</p>
                    <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{selectedTeam.labelOne}</h2>
                    <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>{selectedTeam.labelTwo}</p>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.8125rem', opacity: 0.84 }}>{selectedTeam.focus}</p>
                  </div>
                  <div className="card-action-row" style={{ flexShrink: 0 }}>
                    {canManageDirectory && <button className="btn-ghost" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }} onClick={() => setTeamModal({ team: selectedTeam })}><Edit2 size={13} /> Edit</button>}
                    {canManageDirectory && <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '0.375rem', padding: '0.375rem 0.75rem', color: '#fff', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }} onClick={() => setDeleteModal({ type: 'team', team: selectedTeam })}><Trash2 size={13} /> Delete</button>}
                  </div>
                </div>
                <div className="card-action-row" style={{ gap: '1.5rem', marginTop: '0.875rem' }}>
                  <div><p style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700 }}>{selectedTeam.members.length + 1}</p><p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>People</p></div>
                  <div><p style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700 }}>2</p><p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Active Labels</p></div>
                </div>
              </div>

              <div className="card table-card">
                <div className="card-flex-between" style={{ padding: '1rem 1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>People in {selectedTeam.labelOne} / {selectedTeam.labelTwo}</h3>
                  {canManageTeams && <button className="btn-primary" style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }} onClick={() => setMemberModal({ team: selectedTeam, member: null })}><PlusCircle size={13} /> Add Member</button>}
                </div>
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th>{canManageTeams && <th>Actions</th>}</tr></thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>{selectedTeam.lead}</td>
                      <td>-</td>
                      <td><span className="badge badge-neutral">Team Lead</span></td>
                      <td>-</td>
                      {canManageTeams && <td><span style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>Lead</span></td>}
                    </tr>
                    {selectedTeam.members.map((member) => (
                      <tr key={member.id}>
                        <td style={{ fontWeight: 500 }}>{member.name}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{member.email}</td>
                        <td><span className="badge badge-neutral">{member.role}</span></td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{member.joined}</td>
                        {canManageTeams && <td><div className="card-action-row" style={{ gap: '0.375rem' }}><button className="btn-ghost" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setMemberModal({ team: selectedTeam, member })}><Edit2 size={12} /></button><button onClick={() => setDeleteModal({ type: 'member', team: selectedTeam, member })} style={{ padding: '0.2rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}><Trash2 size={12} /></button></div></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {canManageDirectory && (
                <div className="card card-flex-between" style={{ alignItems: 'center', background: '#fef3c7' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', background: '#fcd34d', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Shield size={16} color="#92400e" /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#92400e' }}>Role Management</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#b45309' }}>Promote volunteers, assign leads, or adjust access without assuming any wing-to-committee dependency.</p>
                  </div>
                  <button className="btn-primary" style={{ flexShrink: 0 }}>Manage Roles</button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {teamModal && <TeamModal initial={teamModal.team} onClose={() => setTeamModal(null)} onSave={saveTeam} />}
        {memberModal && <MemberModal teamName={`${memberModal.team.labelOne} / ${memberModal.team.labelTwo}`} initial={memberModal.member} onClose={() => setMemberModal(null)} onSave={saveMember} />}
        {deleteModal?.type === 'team' && <ConfirmDelete title={`${deleteModal.team.labelOne} / ${deleteModal.team.labelTwo}`} message="This team entry and its members will be removed. This cannot be undone." onConfirm={deleteTeam} onClose={() => setDeleteModal(null)} />}
        {deleteModal?.type === 'member' && <ConfirmDelete title={deleteModal.member.name} message="This member will be removed from the selected team entry. This action cannot be undone." onConfirm={deleteMember} onClose={() => setDeleteModal(null)} />}
      </div>
    </>
  );
};

export default Organization;
