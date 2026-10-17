import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { PRIORITY, STATUS } from '../utils/format.js';

const EMPTY = { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '' };

// Create / edit form. `task` = existing task (edit mode) or null (create mode).
export default function TaskForm({ task, userOptions = [], onSubmit, onCancel }) {
  const { user, isAdmin } = useAuth();
  const isCreator = !task || task.created_by === user.id;
  const statusOnly = !isAdmin && !isCreator; // assignees can only move the status

  const [form, setForm] = useState(
    task
      ? {
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          dueDate: task.due_date ? String(task.due_date).slice(0, 10) : '',
          assignedTo: task.assigned_to ?? '',
        }
      : { ...EMPTY, assignedTo: isAdmin ? '' : user.id }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function validate() {
    const e = {};
    if (!statusOnly) {
      if (form.title.trim().length < 3) e.title = 'At least 3 characters';
      if (form.title.length > 150) e.title = 'Max 150 characters';
      if (form.description.length > 2000) e.description = 'Max 2000 characters';
    }
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setFormError('');
    const payload = statusOnly
      ? { status: form.status }
      : {
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          priority: form.priority,
          dueDate: form.dueDate || null,
          assignedTo: form.assignedTo === '' ? null : Number(form.assignedTo),
        };
    try {
      await onSubmit(payload);
    } catch (err) {
      // Show field errors returned by the API's validation middleware
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      setFormError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form" noValidate>
      {statusOnly && <p className="note">You're the assignee on this task, so you can update its status.</p>}

      <label className="field">
        <span>Title</span>
        <input value={form.title} onChange={set('title')} disabled={statusOnly} maxLength={150} autoFocus={!statusOnly} />
        {errors.title && <small className="field-error">{errors.title}</small>}
      </label>

      <label className="field">
        <span>Description</span>
        <textarea rows={3} value={form.description} onChange={set('description')} disabled={statusOnly} maxLength={2000} />
        {errors.description && <small className="field-error">{errors.description}</small>}
      </label>

      <div className="field-row">
        <label className="field">
          <span>Status</span>
          <select value={form.status} onChange={set('status')}>
            {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Priority</span>
          <select value={form.priority} onChange={set('priority')} disabled={statusOnly}>
            {Object.entries(PRIORITY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Due date</span>
          <input type="date" value={form.dueDate} onChange={set('dueDate')} disabled={statusOnly} />
          {errors.dueDate && <small className="field-error">{errors.dueDate}</small>}
        </label>
        <label className="field">
          <span>Assign to</span>
          {isAdmin ? (
            <select value={form.assignedTo} onChange={set('assignedTo')}>
              <option value="">Unassigned</option>
              {userOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          ) : (
            <select value={form.assignedTo} onChange={set('assignedTo')} disabled={statusOnly}>
              <option value={user.id}>Me</option>
              <option value="">Unassigned</option>
              {task?.assigned_to && task.assigned_to !== user.id && (
                <option value={task.assigned_to}>{task.assigned_to_name}</option>
              )}
            </select>
          )}
          {errors.assignedTo && <small className="field-error">{errors.assignedTo}</small>}
        </label>
      </div>

      {formError && <div className="alert">{formError}</div>}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
