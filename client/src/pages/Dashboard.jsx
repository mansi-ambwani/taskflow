import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDate, isOverdue, STATUS } from '../utils/format.js';

// One page, two dashboards: admins get team-wide numbers + workload; members get their own.
export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.stats().then((r) => setStats(r.data)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!stats) return <Spinner />;

  const s = stats.summary;
  const completion = s.total ? Math.round((s.done / s.total) * 100) : 0;
  const firstName = user.name.split(' ')[0];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Hi, {firstName}</h1>
          <p className="muted">{isAdmin ? 'Here is how the whole team is doing.' : 'Here is what is on your plate.'}</p>
        </div>
        <Link to="/tasks" className="btn btn-primary">{isAdmin ? 'Manage tasks' : 'Go to my tasks'}</Link>
      </div>

      <div className="stat-grid">
        <StatCard label={isAdmin ? 'Total tasks' : 'My tasks'} value={s.total} />
        <StatCard label="Completed" value={`${completion}%`} hint={`${s.done} done`} />
        <StatCard label="High priority open" value={s.high_open} tone={s.high_open ? 'warn' : ''} />
        <StatCard label="Overdue" value={s.overdue} tone={s.overdue ? 'danger' : ''} />
        {isAdmin && <StatCard label="Team members" value={s.users} />}
      </div>

      <div className="dash-grid">
        <section className="card">
          <h3>Status breakdown</h3>
          <div className="status-bars">
            {Object.keys(STATUS).map((key) => {
              const pct = s.total ? (s[key] / s.total) * 100 : 0;
              return (
                <div key={key} className="status-bar-row">
                  <span className="status-bar-label">{STATUS[key]}</span>
                  <div className="status-bar-track">
                    <div className={`status-bar-fill fill-${key}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="status-bar-value">{s[key]}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h3>Upcoming deadlines</h3>
          {stats.upcoming.length ? (
            <ul className="upcoming">
              {stats.upcoming.map((t) => (
                <li key={t.id}>
                  <div>
                    <strong>{t.title}</strong>
                    <div className="upcoming-meta">
                      <StatusBadge status={t.status} /> <PriorityBadge priority={t.priority} />
                    </div>
                  </div>
                  <span className={isOverdue(t) ? 'overdue' : 'muted'}>{formatDate(t.due_date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No upcoming deadlines. 🎉</p>
          )}
        </section>

        {isAdmin && (
          <section className="card span-2">
            <h3>Team workload</h3>
            {stats.workload.length ? (
              <div className="workload">
                {stats.workload.map((w) => {
                  const total = w.open_tasks + w.done_tasks;
                  return (
                    <div key={w.id} className="workload-row">
                      <span className="workload-name">{w.name}</span>
                      <div className="status-bar-track">
                        <div className="status-bar-fill fill-done" style={{ width: `${(w.done_tasks / total) * 100}%` }} />
                      </div>
                      <span className="muted workload-count">{w.open_tasks} open · {w.done_tasks} done</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted">No tasks are assigned yet.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, tone = '' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
