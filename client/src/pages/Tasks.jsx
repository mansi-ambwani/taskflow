import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useDebounce from '../hooks/useDebounce.js';
import useTasks from '../hooks/useTasks.js';
import Icon from '../components/Icon.jsx';
import Modal, { ConfirmDialog } from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import TaskForm from '../components/TaskForm.jsx';
import TaskList from '../components/TaskList.jsx';
import { PRIORITY, STATUS } from '../utils/format.js';

const DEFAULT_FILTERS = { status: '', priority: '', assignedTo: '', overdue: '', sortBy: 'created_at', order: 'desc' };

export default function Tasks() {
  const { isAdmin } = useAuth();
  const notify = useToast();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim());

  const { tasks, meta, loading, error, reload } = useTasks({ ...filters, search: debouncedSearch, page, limit: 10 });

  const [editing, setEditing] = useState(null); // null = closed, {} = new, task = edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [userOptions, setUserOptions] = useState([]);

  // Admins need the user list for the "Assign to" dropdown and filter.
  useEffect(() => {
    if (isAdmin) api.userOptions().then((r) => setUserOptions(r.data)).catch(() => {});
  }, [isAdmin]);

  // Any filter change goes back to page 1.
  useEffect(() => setPage(1), [filters, debouncedSearch]);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const hasFilters = search || Object.keys(DEFAULT_FILTERS).some((k) => filters[k] !== DEFAULT_FILTERS[k]);

  async function saveTask(payload) {
    if (editing?.id) {
      await api.updateTask(editing.id, payload);
      notify('Task updated');
    } else {
      await api.createTask(payload);
      notify('Task created');
    }
    setEditing(null);
    reload();
  }

  async function changeStatus(task, status) {
    try {
      await api.updateTask(task.id, { status });
      notify(`Moved to “${STATUS[status]}”`);
      reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.deleteTask(deleting.id);
      notify('Task deleted');
      setDeleting(null);
      // If we removed the last item on this page, step back a page.
      if (tasks.length === 1 && page > 1) setPage(page - 1);
      else reload();
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
          <h1>{isAdmin ? 'All tasks' : 'My tasks'}</h1>
          <p className="muted">{isAdmin ? 'Every task across the team.' : 'Tasks you created or that are assigned to you.'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={16} /> New task
        </button>
      </div>

      <div className="card filters">
        <div className="search">
          <Icon name="search" size={16} />
          <input placeholder="Search title or description…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search tasks" />
        </div>
        <select value={filters.status} onChange={setFilter('status')} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filters.priority} onChange={setFilter('priority')} aria-label="Filter by priority">
          <option value="">All priorities</option>
          {Object.entries(PRIORITY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filters.assignedTo} onChange={setFilter('assignedTo')} aria-label="Filter by assignee">
          <option value="">{isAdmin ? 'Anyone' : 'Created by or assigned to me'}</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
          {userOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={filters.overdue} onChange={setFilter('overdue')} aria-label="Due filter">
          <option value="">Any due date</option>
          <option value="true">Overdue only</option>
        </select>
        <select
          value={`${filters.sortBy}:${filters.order}`}
          onChange={(e) => {
            const [sortBy, order] = e.target.value.split(':');
            setFilters((f) => ({ ...f, sortBy, order }));
          }}
          aria-label="Sort"
        >
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="due_date:asc">Due date (soonest)</option>
          <option value="priority:desc">Priority (high → low)</option>
          <option value="title:asc">Title (A → Z)</option>
        </select>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(''); }}>
            Clear
          </button>
        )}
      </div>

      <section className="card card-flush">
        {error ? (
          <div className="alert m">{error}</div>
        ) : loading && !tasks.length ? (
          <Spinner />
        ) : tasks.length ? (
          <div className={loading ? 'is-loading' : ''}>
            <TaskList tasks={tasks} onEdit={setEditing} onDelete={setDeleting} onStatusChange={changeStatus} />
          </div>
        ) : (
          <div className="empty">
            <h3>{hasFilters ? 'No tasks match these filters' : 'No tasks yet'}</h3>
            <p className="muted">{hasFilters ? 'Try clearing a filter or the search.' : 'Create your first task to get started.'}</p>
          </div>
        )}
        <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
      </section>

      {editing && (
        <Modal title={editing.id ? 'Edit task' : 'New task'} onClose={() => setEditing(null)}>
          <TaskForm task={editing.id ? editing : null} userOptions={userOptions} onSubmit={saveTask} onCancel={() => setEditing(null)} />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete task?"
          message={`“${deleting.title}” will be permanently deleted.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
