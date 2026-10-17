import Icon from './Icon.jsx';

export default function Pagination({ page, totalPages, total, onChange }) {
  if (!total) return null;
  return (
    <div className="pagination">
      <span className="muted">
        Page {page} of {totalPages} · {total} {total === 1 ? 'item' : 'items'}
      </span>
      <div className="pagination-buttons">
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <Icon name="chevronLeft" size={16} /> Prev
        </button>
        <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
          Next <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}
