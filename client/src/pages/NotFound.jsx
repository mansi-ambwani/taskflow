import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="spinner-page">
      <div className="empty">
        <h1>404</h1>
        <p className="muted">This page doesn't exist.</p>
        <Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>
      </div>
    </div>
  );
}
