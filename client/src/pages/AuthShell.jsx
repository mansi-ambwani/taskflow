import Icon from '../components/Icon.jsx';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <section className="auth-aside">
        <div className="brand brand-light">
          <span className="brand-mark"><Icon name="check" /></span>
          TaskFlow
        </div>
        <div>
          <h1>Plan the work.<br />Track the progress.</h1>
          <p>Assign tasks, follow every status change and keep deadlines in view — for the whole team or just yourself.</p>
        </div>
        <ul className="auth-points">
          <li><Icon name="check" size={16} /> Role-based dashboards for admins and members</li>
          <li><Icon name="check" size={16} /> Search, filter and sort across every task</li>
          <li><Icon name="check" size={16} /> Secure JWT sign-in</li>
        </ul>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
