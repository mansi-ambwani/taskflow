import { PRIORITY, STATUS } from '../utils/format.js';

export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{STATUS[status]}</span>;
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`priority priority-${priority}`}>
      <span className="dot" /> {PRIORITY[priority]}
    </span>
  );
}
