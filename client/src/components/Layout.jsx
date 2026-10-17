import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../utils/format.js';
import Icon from './Icon.jsx';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/tasks', label: isAdmin ? 'All tasks' : 'My tasks', icon: 'list' },
    ...(isAdmin ? [{ to: '/users', label: 'Team', icon: 'users' }] : []),
  ];

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><Icon name="check" /></span>
          TaskFlow
        </div>
        <nav onClick={() => setMenuOpen(false)}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon name={l.icon} /> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar">{initials(user.name)}</span>
          <div className="sidebar-user-text">
            <strong>{user.name}</strong>
            <span className={`role-pill role-${user.role}`}>{user.role}</span>
          </div>
          <button className="icon-btn" onClick={logout} title="Log out" aria-label="Log out">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <span className="topbar-title">{links.find((l) => location.pathname.startsWith(l.to))?.label}</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
