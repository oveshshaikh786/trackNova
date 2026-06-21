import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, storeUser } from '../services/authService';

const LoginForm = function() {
  var [name, setName]       = useState('');
  var [password, setPassword] = useState('');
  var [error, setError]     = useState('');
  var [loading, setLoading] = useState(false);
  var navigate = useNavigate();

  var handleSubmit = async function(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      var user = await login(name, password);
      storeUser(user);
      navigate('/search');
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.message) || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.eyebrow}>Welcome back</div>
      <h1 style={s.heading}>Sign in to TrackNova</h1>
      <p style={s.sub}>Your intelligent rail journey starts here.</p>

      {error && <div className="sr-alert sr-alert-error">{error}</div>}

      <form onSubmit={handleSubmit} style={s.form}>
        <div>
          <label className="sr-label" htmlFor="login-name">Username</label>
          <input
            id="login-name"
            className="sr-input"
            type="text"
            placeholder="e.g. john_doe"
            value={name}
            onChange={function(e) { setName(e.target.value); }}
            required
          />
        </div>
        <div>
          <label className="sr-label" htmlFor="login-pwd">Password</label>
          <input
            id="login-pwd"
            className="sr-input"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={function(e) { setPassword(e.target.value); }}
            required
          />
        </div>
        <button
          className="sr-btn sr-btn-gold"
          type="submit"
          disabled={loading}
          style={{ width: '100%', marginTop: '8px', padding: '14px', fontSize: '0.95rem' }}
        >
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>
      </form>

      <p style={s.footer}>
        New to TrackNova?{' '}
        <Link to="/signup" style={s.footerLink}>Create an account</Link>
      </p>
    </div>
  );
};

const s = {
  wrap:       { padding: '48px 44px', maxWidth: '420px', width: '100%' },
  eyebrow:    { fontSize: '0.72rem', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' },
  heading:    { fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2, marginBottom: '8px' },
  sub:        { color: '#64748b', fontSize: '0.9rem', marginBottom: '32px' },
  form:       { display: 'flex', flexDirection: 'column', gap: '18px' },
  footer:     { marginTop: '24px', fontSize: '0.87rem', color: '#64748b', textAlign: 'center' },
  footerLink: { color: '#818cf8', fontWeight: '600', textDecoration: 'none' },
};

export default LoginForm;
