import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useDebounce from '../hooks/useDebounce.js';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDate, initials } from '../utils/format.js';

// Shows the invite link admins share with new teammates.
function InviteCard({ notify }) {
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    api.invite().then((r) => setInvite(r.data)).catch(() => setInvite({ enabled: false }));
  }, []);

  if (!invite) return null;

  const link = invite.enabled
    ? `${window.location.origin}/register?code=${encodeURIComponent(invite.inviteCode)}`
    : `${window.location.origin}/register`;

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copied`);
    } catch {
      notify('Could not copy — select the text and copy it manually', 'error');
    }
  }

  return (
    <section className="card invite-card">
      <div>
        <h3>Invite teammates</h3>
        <p className="muted">
          {invite.enabled
            ? 'Only people with this link (or the code) can sign up and join your team.'
            : 'Sign-up is open: anyone with the site link can join. Set INVITE_CODE on the server to restrict it.'}
        </p>
      </div>
      <div className="invite-row">
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invite link" />
        <button className="btn btn-primary" onClick={() => copy(link, 'Invite link')}>Copy link</button>
      </div>
      {invite.enabled && (
        <div className="invite-row">
          <input readOnly value={invite.inviteCode} onFocus={(e) => e.target.select()} aria-label="Invite code" />
          <button className="btn btn-ghost" onClick={() => copy(invite.inviteCode, 'Invite code')}>Copy code</button>
        </div>
      )}
    </section>
  );
}

// Admin-only page: see everyone, change roles, remove accounts.
export default function Users() {
  const { user: me } = useAuth();
  const notify = useToast();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listUsers({ page, limit: 10, search: debounced });
      setUsers(res.data);
      setMeta(res.meta);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debounced, notify]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [debounced]);

  async function changeRole(u, role) {
    try {
      await api.updateRole(u.id, role);
      notify(`${u.name} is now ${role === 'admin' ? 'an admin' : 'a member'}`);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.deleteUser(deleting.id);
      notify(`${deleting.name} removed`);
      setDeleting(null);
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Team</h1>
          <p className="muted">Manage roles and accounts.</p>
        </div>
      </div>

      <InviteCard notify={notify} />

      <div className="card filters">
        <div className="search">
          <Icon name="search" size={16} />
          <input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
        </div>
      </div>

      <section className="card card-flush">
        {loading && !users.length ? (
          <Spinner />
        ) : (
          <div className="user-list">
            {users.map((u) => (
              <div key={u.id} className="user-row">
                <span className="avatar">{initials(u.name)}</span>
                <div className="user-info">
                  <strong>{u.name} {u.id === me.id && <span className="muted">(you)</span>}</strong>
                  <span className="muted">{u.email}</span>
                </div>
                <span className="muted user-meta">{u.open_tasks} open · {u.done_tasks} done</span>
                <span className="muted user-meta">Joined {formatDate(u.created_at)}</span>
                <select
                  value={u.role}
                  disabled={u.id === me.id}
                  onChange={(e) => changeRole(u, e.target.value)}
                  aria-label={`Role of ${u.name}`}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  className="icon-btn danger"
                  disabled={u.id === me.id}
                  onClick={() => setDeleting(u)}
                  aria-label={`Remove ${u.name}`}
                  title="Remove user"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
            {!users.length && <div className="empty"><p className="muted">No users found.</p></div>}
          </div>
        )}
        <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
      </section>

      {deleting && (
        <ConfirmDialog
          title="Remove user?"
          message={`${deleting.name}'s account and the tasks they created will be deleted. Tasks assigned to them become unassigned.`}
          confirmLabel="Remove"
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
