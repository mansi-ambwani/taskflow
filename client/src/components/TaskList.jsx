import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, isOverdue, STATUS } from '../utils/format.js';
import { PriorityBadge } from './Badges.jsx';
import Icon from './Icon.jsx';

// Table on desktop, stacked cards on mobile (pure CSS switch).
export default function TaskList({ tasks, onEdit, onDelete, onStatusChange }) {
  const { user, isAdmin } = useAuth();
  const canEdit = (t) => isAdmin || t.created_by === user.id || t.assigned_to === user.id;
  const canDelete = (t) => isAdmin || t.created_by === user.id;

  return (
    <div className="task-table" role="table" aria-label="Tasks">
      <div className="task-row task-head" role="row">
        <span>Task</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due</span>
        <span>Assignee</span>
        <span className="sr-only">Actions</span>
      </div>
      {tasks.map((t) => (
        <div className="task-row" role="row" key={t.id}>
          <div className="task-main">
            <strong className="task-title">{t.title}</strong>
            {t.description && <span className="task-desc">{t.description}</span>}
          </div>
          <div data-label="Status">
            {canEdit(t) ? (
              <select
                className={`status-select status-${t.status}`}
                value={t.status}
                onChange={(e) => onStatusChange(t, e.target.value)}
                aria-label={`Status of ${t.title}`}
              >
                {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : (
              <span className={`badge status-${t.status}`}>{STATUS[t.status]}</span>
            )}
          </div>
          <div data-label="Priority"><PriorityBadge priority={t.priority} /></div>
          <div data-label="Due" className={isOverdue(t) ? 'overdue' : ''}>
            {isOverdue(t) && <Icon name="alert" size={14} />} {formatDate(t.due_date)}
          </div>
          <div data-label="Assignee" className="muted">{t.assigned_to_name || 'Unassigned'}</div>
          <div className="task-actions">
            {canEdit(t) && (
              <button className="icon-btn" onClick={() => onEdit(t)} aria-label={`Edit ${t.title}`} title="Edit">
                <Icon name="edit" size={16} />
              </button>
            )}
            {canDelete(t) && (
              <button className="icon-btn danger" onClick={() => onDelete(t)} aria-label={`Delete ${t.title}`} title="Delete">
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
