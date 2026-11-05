import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth, roleHome } from '../../auth/AuthContext';

const ErrorBox = ({ msg }) => msg ? <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>{msg}</div> : null;

export const SignUp = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (f.password !== f.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const u = await register({ name: f.name, email: f.email, phone: f.phone, password: f.password });
      navigate(roleHome(u.role), { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrapper">
      <div className="card-box auth-card">
        <h2>Create Your Account</h2>
        <p>Join BookConnect and start your reading journey.</p>
        <ErrorBox msg={error} />
        <form onSubmit={submit} className="auth-form">
          <input type="text" placeholder="Full Name" value={f.name} onChange={set('name')} required />
          <input type="email" placeholder="Email Address" value={f.email} onChange={set('email')} required />
          <input type="tel" placeholder="Phone Number (07xx xxx xxx)" value={f.phone} onChange={set('phone')} required />
          <input type="password" placeholder="Password (min 6 characters)" value={f.password} onChange={set('password')} minLength={6} required />
          <input type="password" placeholder="Confirm Password" value={f.confirm} onChange={set('confirm')} required />
          <button type="submit" className="btn-primary full-btn" disabled={busy}>{busy ? 'Creating…' : 'Sign Up'}</button>
        </form>
        <p className="switch-auth">Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
};

const ROLES = [
  { id: 'customer', label: 'Customer', icon: '🛒', hint: 'Browse and buy books' },
  { id: 'agent', label: 'Delivery Agent', icon: '🛵', hint: 'Deliver orders' },
  { id: 'admin', label: 'Admin', icon: '⚙️', hint: 'Manage the store' },
];
const DEMO = { customer: 'customer@bookconnect.com / Customer@123', agent: 'agent@bookconnect.com / Agent@123', admin: 'admin@bookconnect.com / Admin@123' };

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const initial = ROLES.some((r) => r.id === params.get('role')) ? params.get('role') : 'customer';
  const [role, setRole] = useState(initial);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = (id) => { setRole(id); setError(''); setParams({ role: id }, { replace: true, state: location.state }); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(identifier, password, role);
      // back to the page they were trying to open, else their own area
      navigate(location.state?.from || roleHome(u.role), { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const current = ROLES.find((r) => r.id === role);
  return (
    <div className="auth-wrapper">
      <div className="card-box auth-card">
        <h2>Welcome Back!</h2>
        <p>Choose your role, then log in.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '14px 0' }}>
          {ROLES.map((r) => (
            <button key={r.id} type="button" onClick={() => pick(r.id)}
              style={{ padding: '10px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center',
                border: `2px solid ${role === r.id ? 'var(--primary)' : 'var(--border-color)'}`,
                background: role === r.id ? 'var(--primary)' : 'transparent', color: role === r.id ? '#fff' : 'var(--text-primary)' }}>
              <div style={{ fontSize: 20 }}>{r.icon}</div>{r.label}
            </button>
          ))}
        </div>
        <ErrorBox msg={error} />
        <form onSubmit={submit} className="auth-form">
          <input type="text" placeholder={`${current.label} email or phone`} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn-primary full-btn" style={{ marginTop: 10 }} disabled={busy}>{busy ? 'Signing in…' : `Login as ${current.label}`}</button>
        </form>
        {role === 'customer' && <p className="switch-auth">Don't have an account? <Link to="/signup">Sign up</Link></p>}
        <p className="switch-auth" style={{ marginTop: 4 }}>Demo: {DEMO[role]}</p>
      </div>
    </div>
  );
};
