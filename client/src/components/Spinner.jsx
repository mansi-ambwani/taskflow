export default function Spinner({ fullPage = false, label = 'Loading' }) {
  return (
    <div className={fullPage ? 'spinner-page' : 'spinner-inline'} role="status" aria-label={label}>
      <span className="spinner" />
    </div>
  );
}
