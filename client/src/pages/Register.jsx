import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from './AuthShell.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  function validate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Use letters and numbers';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError('');
    try {
      await register(form.name.trim(), form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="New accounts join as team members">
      <form onSubmit={handleSubmit} className="form" noValidate>
        <label className="field">
          <span>Full name</span>
          <input autoComplete="name" value={form.name} onChange={set('name')} autoFocus />
          {errors.name && <small className="field-error">{errors.name}</small>}
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          {errors.email && <small className="field-error">{errors.email}</small>}
        </label>
        <div className="field-row">
          <label className="field">
            <span>Password</span>
            <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
            {errors.password && <small className="field-error">{errors.password}</small>}
          </label>
          <label className="field">
            <span>Confirm</span>
            <input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
            {errors.confirm && <small className="field-error">{errors.confirm}</small>}
          </label>
        </div>
        {error && <div className="alert">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
