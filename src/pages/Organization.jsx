import { useState } from 'react';
import { PlusCircle, ChevronRight, Users, Building2, Edit2, Trash2, Search, Shield, Info, X, Save } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';

const initialOrg = [
  {
    id: 1, name: 'Tech Wing', lead: 'Alex Rivera', members: 24,
    committees: [
      { id: 11, name: 'Dev Board', lead: 'Sam Lee', members: 10, role: 'Development',
        memberList: [
          { id: 101, name: 'Jamie Park', email: 'jamie@worklog.io', role: 'Volunteer', joined: '2025-10-01' },
          { id: 102, name: 'Riya Gupta', email: 'riya@worklog.io', role: 'Volunteer', joined: '2025-10-15' },
          { id: 103, name: 'Nathan Clarke', email: 'nathan@worklog.io', role: 'Volunteer', joined: '2025-11-01' },
        ],
      },
      { id: 12, name: 'QA Committee', lead: 'Priya N.', members: 8, role: 'Quality Assurance', memberList: [
          { id: 201, name: 'Arjun Mehta', email: 'arjun@worklog.io', role: 'Volunteer', joined: '2025-09-01' },
          { id: 202, name: 'Sena Williams', email: 'sena@worklog.io', role: 'Volunteer', joined: '2025-09-15' },
        ],
      },
      { id: 13, name: 'Infra Team', lead: 'Carlos V.', members: 6, role: 'Infrastructure', memberList: [] },
    ],
  },
  {
    id: 2, name: 'Community Wing', lead: 'Morgan Chen', members: 42,
    committees: [
      { id: 21, name: 'Events Committee', lead: 'Divya S.', members: 15, role: 'Event Management', memberList: [] },
      { id: 22, name: 'Outreach Team', lead: 'James T.', members: 20, role: 'Community Outreach', memberList: [] },
      { id: 23, name: 'Media Cell', lead: 'Lisa M.', members: 7, role: 'Marketing', memberList: [] },
    ],
  },
  {
    id: 3, name: 'Health Wing', lead: 'Dana Kim', members: 30,
    committees: [
      { id: 31, name: 'Health Comm.', lead: 'Arjun P.', members: 18, role: 'Health Programs', memberList: [] },
      { id: 32, name: 'Wellness Team', lead: 'Sara B.', members: 12, role: 'Wellness Initiatives', memberList: [] },
    ],
  },
  {
    id: 4, name: 'HR Wing', lead: 'Jordan Smith', members: 18,
    committees: [
      { id: 41, name: 'Vol. Affairs', lead: 'Nina R.', members: 10, role: 'Volunteer Management', memberList: [] },
      { id: 42, name: 'Training Cell', lead: 'Omar H.', members: 8, role: 'Capacity Building', memberList: [] },
    ],
  },
];

const TL_WING_NAME = 'Tech Wing';
const TL_COMMITTEE = initialOrg[0].committees[0];
const wingColors = ['#4343d5', '#674db0', '#059669', '#d97706'];

const getDirectoryItems = (org) => [
  ...org.map((wing, index) => ({
    id: `wing-${wing.id}`,
    entityType: 'wing',
    color: wingColors[index % wingColors.length],
    wingId: wing.id,
    name: wing.name,
    lead: wing.lead,
    members: wing.members,
    committees: wing.committees,
  })),
  ...org.flatMap((wing, index) =>
    wing.committees.map((committee) => ({
      id: `committee-${committee.id}`,
      entityType: 'committee',
      color: wingColors[index % wingColors.length],
      wingId: wing.id,
      wingName: wing.name,
      name: committee.name,
      lead: committee.lead,
      role: committee.role,
      members: committee.members,
      memberList: committee.memberList || [],
      committeeId: committee.id,
    }))
  ),
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

const AddWingModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ name: '', lead: '', description: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({ id: Date.now(), name: form.name, lead: form.lead, members: 0, committees: [] });
    onClose();
  };
  return (
    <Modal title="Add New Wing" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          <div><label className="input-label">Wing Name *</label><input className="input-field" placeholder="e.g. Tech Wing" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
          <div><label className="input-label">Wing Team Lead *</label><input className="input-field" placeholder="Full name of the wing team lead" value={form.lead} onChange={(e) => set('lead', e.target.value)} required /></div>
          <div><label className="input-label">Description</label><textarea className="input-field" placeholder="Brief description of this wing's purpose..." rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} style={{ resize: 'vertical' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><PlusCircle size={14} /> Create Wing</button>
        </div>
      </form>
    </Modal>
  );
};

const CommitteeModal = ({ onClose, onSave, initial = null, wingName }) => {
  const [form, setForm] = useState({ name: initial?.name || '', lead: initial?.lead || '', role: initial?.role || '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: initial?.id || Date.now(), ...form, members: initial?.members || 0, memberList: initial?.memberList || [] });
    onClose();
  };
  return (
    <Modal title={initial ? `Edit: ${initial.name}` : `Add Committee to ${wingName}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          <div><label className="input-label">Committee Name *</label><input className="input-field" placeholder="e.g. Dev Board" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
          <div><label className="input-label">Committee Team Lead *</label><input className="input-field" placeholder="Committee team lead name" value={form.lead} onChange={(e) => set('lead', e.target.value)} required /></div>
          <div><label className="input-label">Role / Focus</label><input className="input-field" placeholder="e.g. Software Development" value={form.role} onChange={(e) => set('role', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> {initial ? 'Save Changes' : 'Add Committee'}</button>
        </div>
      </form>
    </Modal>
  );
};

const MemberModal = ({ onClose, onSave, initial = null, committeeName }) => {
  const [form, setForm] = useState({ name: initial?.name || '', email: initial?.email || '', role: initial?.role || 'Volunteer', joined: initial?.joined || new Date().toISOString().split('T')[0] });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: initial?.id || Date.now(), ...form });
    onClose();
  };
  return (
    <Modal title={initial ? `Edit Member: ${initial.name}` : `Add Member to ${committeeName}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          <div><label className="input-label">Full Name *</label><input className="input-field" placeholder="Member's full name" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
          <div><label className="input-label">Email *</label><input className="input-field" type="email" placeholder="member@worklog.io" value={form.email} onChange={(e) => set('email', e.target.value)} required /></div>
          <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Role</label>
              <select className="input-field" value={form.role} onChange={(e) => set('role', e.target.value)} style={{ cursor: 'pointer' }}>
                {['Volunteer', 'Team Lead', 'Admin'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
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
    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '0 0 1.5rem' }}>
      <strong style={{ color: 'var(--color-on-surface)' }}>{title}</strong><br />{message}
    </p>
    <div className="card-action-row">
      <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
      <button className="btn-primary" onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, justifyContent: 'center', background: 'var(--color-error)', boxShadow: 'none' }}>Delete</button>
    </div>
  </Modal>
);

const MemberTable = ({ committee, canEdit, onAddMember, onEditMember, onDeleteMember }) => (
  <div className="card table-card">
    <div className="card-flex-between" style={{ padding: '1rem 1.25rem' }}>
      <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
        Members of <span style={{ color: 'var(--color-primary)' }}>{committee.name}</span>
        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>({committee.memberList?.length || 0})</span>
      </h3>
      {canEdit && (
        <button className="btn-primary" style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }} onClick={() => onAddMember(committee)}>
          <PlusCircle size={13} /> Add Member
        </button>
      )}
    </div>
    {(!committee.memberList || committee.memberList.length === 0) ? (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
        <Users size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><br />No members yet.
      </div>
    ) : (
      <table className="data-table">
        <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Joined</th>{canEdit && <th>Actions</th>}</tr></thead>
        <tbody>
          {committee.memberList.map((m) => (
            <tr key={m.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="avatar" style={{ width: '1.625rem', height: '1.625rem', fontSize: '0.6rem', flexShrink: 0 }}>{m.name[0]}</div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.name}</span>
                </div>
              </td>
              <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{m.email}</td>
              <td><span className="badge badge-neutral">{m.role}</span></td>
              <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{m.joined}</td>
              {canEdit && (
                <td>
                  <div className="card-action-row" style={{ gap: '0.375rem' }}>
                    <button className="btn-ghost" style={{ padding: '0.2rem 0.5rem' }} onClick={() => onEditMember(committee, m)}><Edit2 size={12} /></button>
                    <button onClick={() => onDeleteMember(committee, m)} style={{ padding: '0.2rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}><Trash2 size={12} /></button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const PeopleTable = ({ title, people, canEdit = false, onAddMember, onEditMember, onDeleteMember, committeeContext }) => (
  <div className="card table-card">
    <div className="card-flex-between" style={{ padding: '1rem 1.25rem' }}>
      <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
        {title}
        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>({people.length})</span>
      </h3>
      {canEdit && committeeContext && (
        <button className="btn-primary" style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }} onClick={() => onAddMember(committeeContext)}>
          <PlusCircle size={13} /> Add Volunteer
        </button>
      )}
    </div>
    {people.length === 0 ? (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
        <Users size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><br />No people available.
      </div>
    ) : (
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Scope</th>{canEdit && committeeContext && <th>Actions</th>}</tr></thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <td>
                <div className="card-meta-row">
                  <div className="avatar" style={{ width: '1.625rem', height: '1.625rem', fontSize: '0.6rem', flexShrink: 0 }}>{person.name[0]}</div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{person.name}</span>
                </div>
              </td>
              <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{person.email || '-'}</td>
              <td><span className="badge badge-neutral">{person.role}</span></td>
              <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{person.scope}</td>
              {canEdit && committeeContext && (
                <td>
                  {person.isCommitteeLead ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>Lead</span>
                  ) : (
                    <div className="card-action-row" style={{ gap: '0.375rem' }}>
                      <button className="btn-ghost" style={{ padding: '0.2rem 0.5rem' }} onClick={() => onEditMember(committeeContext, person)}><Edit2 size={12} /></button>
                      <button onClick={() => onDeleteMember(committeeContext, person)} style={{ padding: '0.2rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}><Trash2 size={12} /></button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const TeamLeadView = () => {
  const [memberModal, setMemberModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [committees, setCommittees] = useState(() => [TL_COMMITTEE]);

  const handleAddMember = (committee) => setMemberModal({ committee, member: null });
  const handleEditMember = (committee, member) => setMemberModal({ committee, member });
  const handleDeleteMember = (committee, member) => setDeleteModal({ type: 'member', committee, member });

  const saveMember = ({ id, ...data }) => {
    setCommittees((cs) => cs.map((c) =>
      c.id === memberModal.committee.id
        ? {
            ...c,
            memberList: memberModal.member
              ? c.memberList.map((m) => m.id === id ? { id, ...data } : m)
              : [...(c.memberList || []), { id, ...data }],
            members: memberModal.member ? c.members : (c.members || 0) + 1,
          }
        : c
    ));
  };

  const deleteMember = () => {
    const { committee, member } = deleteModal;
    setCommittees((cs) => cs.map((c) => c.id === committee.id
      ? { ...c, memberList: c.memberList.filter((m) => m.id !== member.id), members: c.members - 1 }
      : c
    ));
  };

  return (
    <div className="stack-gap-1">
      <div className="card-meta-row" style={{ padding: '0.75rem 1rem', background: 'var(--color-secondary-fixed)', borderRadius: '0.625rem', fontSize: '0.8125rem', color: '#4e3397' }}>
        <Info size={14} style={{ flexShrink: 0 }} />
        You manage the <strong>{committees[0]?.name}</strong> committee under <strong>{TL_WING_NAME}</strong>. Contact your Wing Admin to access other committees.
      </div>

      <div className="card" style={{ background: 'var(--gradient-primary)', color: '#fff' }}>
        <div className="card-flex-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.8 }}>{TL_WING_NAME} · Your Committee</p>
            <h2 style={{ margin: '0.25rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{committees[0]?.name}</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.85 }}>{committees[0]?.role} · {committees[0]?.members || 0} members</p>
          </div>
        </div>
      </div>

      <MemberTable
        committee={committees[0] || {}}
        canEdit={true}
        onAddMember={handleAddMember}
        onEditMember={handleEditMember}
        onDeleteMember={handleDeleteMember}
      />

      {memberModal && (
        <MemberModal
          committeeName={memberModal.committee.name}
          initial={memberModal.member}
          onClose={() => setMemberModal(null)}
          onSave={saveMember}
        />
      )}
      {deleteModal?.type === 'member' && (
        <ConfirmDelete
          title={deleteModal.member.name}
          message="This member will be removed from the committee. This action cannot be undone."
          onConfirm={deleteMember}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
};

const AdminView = ({ role }) => {
  const [org, setOrg] = useState(initialOrg);
  const [selectedItemId, setSelectedItemId] = useState(`wing-${initialOrg[0].id}`);
  const [search, setSearch] = useState('');
  const [wingModal, setWingModal] = useState(false);
  const [committeeModal, setCommitteeModal] = useState(null);
  const [memberModal, setMemberModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  const canManageWings = can(role, 'manageWings');
  const directoryItems = getDirectoryItems(org);
  const selectedItem = directoryItems.find((item) => item.id === selectedItemId) || directoryItems[0] || null;
  const filteredItems = directoryItems.filter((item) => !search || item.name.toLowerCase().includes(search.toLowerCase()));
  const selectedCommittee = selectedItem?.entityType === 'committee'
    ? org.flatMap((wing) => wing.committees).find((committee) => committee.id === selectedItem.committeeId) || null
    : null;

  const addWing = (wing) => {
    setOrg((current) => [...current, wing]);
  };

  const deleteWing = (wingId) => {
    const nextOrg = org.filter((wing) => wing.id !== wingId);
    setOrg(nextOrg);
    if (selectedItem?.entityType === 'wing' && selectedItem.wingId === wingId) {
      setSelectedItemId(nextOrg.length ? `wing-${nextOrg[0].id}` : null);
    }
    setDeleteModal(null);
  };

  const saveCommittee = ({ id, ...data }) => {
    setOrg((current) => current.map((wing) =>
      wing.id === committeeModal.wing.id
        ? {
            ...wing,
            committees: committeeModal.committee
              ? wing.committees.map((committee) => committee.id === committeeModal.committee.id ? { ...committee, ...data } : committee)
              : [...wing.committees, { id, ...data }],
          }
        : wing
    ));
    setSelectedItemId(committeeModal.committee ? `committee-${committeeModal.committee.id}` : `committee-${id}`);
  };

  const deleteCommittee = () => {
    const { wingId, committeeId } = deleteModal;
    setOrg((current) => current.map((wing) =>
      wing.id === wingId ? { ...wing, committees: wing.committees.filter((committee) => committee.id !== committeeId) } : wing
    ));
    if (selectedItem?.entityType === 'committee' && selectedItem.committeeId === committeeId) {
      setSelectedItemId(`wing-${wingId}`);
    }
    setDeleteModal(null);
  };

  const saveMember = ({ id, ...data }) => {
    const updateCommittee = (committee) => {
      if (committee.id !== memberModal.committee.id) return committee;
      return memberModal.member
        ? { ...committee, memberList: committee.memberList.map((member) => member.id === memberModal.member.id ? { id, ...data } : member) }
        : { ...committee, memberList: [...(committee.memberList || []), { id, ...data }], members: (committee.members || 0) + 1 };
    };
    setOrg((current) => current.map((wing) => ({ ...wing, committees: wing.committees.map(updateCommittee) })));
    setSelectedItemId(`committee-${memberModal.committee.id}`);
  };

  const deleteMember = () => {
    const { committee, member } = deleteModal;
    const updateCommittee = (entry) => entry.id !== committee.id
      ? entry
      : { ...entry, memberList: entry.memberList.filter((item) => item.id !== member.id), members: entry.members - 1 };
    setOrg((current) => current.map((wing) => ({ ...wing, committees: wing.committees.map(updateCommittee) })));
    setSelectedItemId(`committee-${committee.id}`);
    setDeleteModal(null);
  };

  const peopleForSelectedItem = (() => {
    if (!selectedItem) return [];
    if (selectedItem.entityType === 'wing') {
      const volunteers = (selectedItem.committees || []).flatMap((committee) =>
        (committee.memberList || []).map((member) => ({
          ...member,
          scope: committee.name,
        }))
      );
      return [
        {
          id: `wing-lead-${selectedItem.wingId}`,
          name: selectedItem.lead,
          email: '-',
          role: 'Team Lead',
          scope: selectedItem.name,
          isCommitteeLead: true,
        },
        ...volunteers,
      ];
    }

    return [
      {
        id: `committee-lead-${selectedItem.committeeId}`,
        name: selectedItem.lead,
        email: '-',
        role: 'Team Lead',
        scope: selectedItem.name,
        isCommitteeLead: true,
      },
      ...(selectedItem.memberList || []).map((member) => ({
        ...member,
        scope: selectedItem.name,
      })),
    ];
  })();

  return (
    <div className="stack-gap-1">
      <div className="mobile-safe-grid" style={{ gridTemplateColumns: '240px minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="card" style={{ padding: '0.875rem' }}>
          <div className="card-flex-between" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Directory</h3>
            {canManageWings && (
              <button className="btn-primary" style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }} onClick={() => setWingModal(true)}>
                <PlusCircle size={12} /> Add Wing
              </button>
            )}
          </div>
          <div className="search-bar" style={{ marginBottom: '0.75rem' }}>
            <Search size={13} style={{ color: 'var(--color-outline)' }} />
            <input placeholder="Search wings or committees..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItemId(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '0.25rem', background: selectedItem?.id === item.id ? 'var(--color-primary-fixed)' : 'transparent', transition: 'background 0.1s' }}
            >
              <div style={{ width: '1.875rem', height: '1.875rem', borderRadius: '0.4rem', background: `${item.color}22`, border: `1.5px solid ${item.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.entityType === 'wing' ? <Building2 size={12} style={{ color: item.color }} /> : <Users size={12} style={{ color: item.color }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>
                  {item.entityType === 'wing' ? 'Wing' : `Committee · ${item.wingName}`}
                </p>
              </div>
              <ChevronRight size={13} style={{ color: 'var(--color-outline)', flexShrink: 0 }} />
            </button>
          ))}
        </div>

        {selectedItem ? (
          <div className="stack-gap-1">
            <div className="card" style={{ background: 'var(--gradient-primary)', color: '#fff' }}>
              <div className="card-flex-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.78, fontWeight: 700 }}>
                    {selectedItem.entityType === 'wing' ? 'Wing' : 'Committee'}
                  </p>
                  <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{selectedItem.name}</h2>
                  <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.85 }}>
                    {selectedItem.entityType === 'wing' ? 'People Directory' : selectedItem.wingName}
                  </p>
                </div>
                <div className="card-action-row" style={{ flexShrink: 0 }}>
                  {canManageWings && selectedItem.entityType === 'wing' && (
                    <button onClick={() => setDeleteModal({ type: 'wing', wingId: selectedItem.wingId, label: selectedItem.name })}
                      style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '0.375rem', padding: '0.375rem 0.75rem', color: '#fff', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Trash2 size={13} /> Delete Wing
                    </button>
                  )}
                  {selectedItem.entityType === 'committee' && (
                    <>
                      <button className="btn-ghost" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }} onClick={() => setCommitteeModal({ wing: org.find((wing) => wing.id === selectedItem.wingId), committee: selectedCommittee })}>
                        <Edit2 size={13} /> Edit
                      </button>
                      <button onClick={() => setDeleteModal({ type: 'committee', wingId: selectedItem.wingId, committeeId: selectedItem.committeeId, label: selectedItem.name })}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '0.375rem', padding: '0.375rem 0.75rem', color: '#fff', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Trash2 size={13} /> Delete Committee
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="card-action-row" style={{ gap: '1.5rem', marginTop: '0.875rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700 }}>{peopleForSelectedItem.length}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>People</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700 }}>{selectedItem.entityType === 'wing' ? selectedItem.committees.length : selectedItem.members}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>{selectedItem.entityType === 'wing' ? 'Volunteers' : 'Volunteers'}</p>
                </div>
              </div>
            </div>

            <PeopleTable
              title="Team Lead and Volunteers"
              people={peopleForSelectedItem}
              canEdit={selectedItem.entityType === 'committee'}
              onAddMember={(committee) => setMemberModal({ committee, member: null })}
              onEditMember={(committee, member) => setMemberModal({ committee, member })}
              onDeleteMember={(committee, member) => setDeleteModal({ type: 'member', committee, member })}
              committeeContext={selectedCommittee}
            />

            {canManageWings && (
              <div className="card card-flex-between" style={{ alignItems: 'center', background: '#fef3c7' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', background: '#fcd34d', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={16} color="#92400e" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#92400e' }}>Super Admin: Role Management</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#b45309' }}>Promote volunteers, assign Team Leads, or change Wing Admins.</p>
                </div>
                <button className="btn-primary" style={{ flexShrink: 0 }}>Manage Roles</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--color-on-surface-variant)' }}>
            <Building2 size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>Select a wing or committee from the left panel.</p>
          </div>
        )}
      </div>

      {wingModal && <AddWingModal onClose={() => setWingModal(false)} onAdd={addWing} />}
      {committeeModal && (
        <CommitteeModal
          wingName={committeeModal.wing.name}
          initial={committeeModal.committee}
          onClose={() => setCommitteeModal(null)}
          onSave={saveCommittee}
        />
      )}
      {memberModal && (
        <MemberModal
          committeeName={memberModal.committee.name}
          initial={memberModal.member}
          onClose={() => setMemberModal(null)}
          onSave={saveMember}
        />
      )}
      {deleteModal?.type === 'wing' && (
        <ConfirmDelete
          title={`Delete Wing: ${deleteModal.label}`}
          message="All committees and members in this wing will also be removed. This cannot be undone."
          onConfirm={() => deleteWing(deleteModal.wingId)}
          onClose={() => setDeleteModal(null)}
        />
      )}
      {deleteModal?.type === 'committee' && (
        <ConfirmDelete
          title={`Delete Committee: ${deleteModal.label}`}
          message="All members in this committee will be removed. This cannot be undone."
          onConfirm={deleteCommittee}
          onClose={() => setDeleteModal(null)}
        />
      )}
      {deleteModal?.type === 'member' && (
        <ConfirmDelete
          title={deleteModal.member.name}
          message="This member will be removed from the committee. This action cannot be undone."
          onConfirm={deleteMember}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
};

const Organization = () => {
  const { role } = useAuthStore();

  const pageTitles = {
    [ROLES.TEAM_LEAD]: 'My Committee',
    [ROLES.ADMIN]: 'Wing Management',
    [ROLES.SUPER_ADMIN]: 'Organization Structure',
  };

  return (
    <>
      <TopBar title={pageTitles[role] || 'Organization'} />
      <div className="page-body">
        {role === ROLES.TEAM_LEAD ? (
          <TeamLeadView />
        ) : (
          <AdminView role={role} />
        )}
      </div>
    </>
  );
};

export default Organization;
