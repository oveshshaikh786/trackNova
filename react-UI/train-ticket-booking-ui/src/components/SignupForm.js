import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../services/authService';

function strengthColor(len) {
  if (len < 4)  return '#dc2626';
  if (len < 8)  return '#fbbf24';
  if (len < 12) return '#818cf8';
  return '#10b981';
}
function strengthLabel(len) {
  if (len < 4)  return 'Too short';
  if (len < 8)  return 'Fair';
  if (len < 12) return 'Good';
  return 'Strong';
}

const SignupForm = function() {
  var [name, setName]         = useState('');
  var [password, setPassword] = useState('');
  var [message, setMessage]   = useState('');
  var [isError, setIsError]   = useState(false);
  var [loading, setLoading]   = useState(false);
  var navigate = useNavigate();

  var handleSignup = async function(e) {
    e.preventDefault();
    if (password.length < 4) { setIsError(true); setMessage('Password must be at least 4 characters.'); return; }
    setLoading(true); setMessage('');
    try {
      await signup(name, password);
      setIsError(false);
      setMessage('Account created! Redirecting to login…');
      setTimeout(function() { navigate('/login'); }, 1500);
    } catch (err) {
      setIsError(true);
      setMessage((err.response && err.response.data && err.response.data.message) || 'Signup failed. Try a different username.');
    } finally {
      setLoading(false);
    }
  };

  var color = strengthColor(password.length);

  return (
    <div style={s.wrap}>
      <div style={s.eyebrow}>Join TrackNova</div>
      <h1 style={s.heading}>Create your account</h1>
      <p style={s.sub}>Start booking AI-powered train journeys today.</p>

      {message && (
        <div className={isError ? 'sr-alert sr-alert-error' : 'sr-alert sr-alert-success'}>{message}</div>
      )}

      <form onSubmit={handleSignup} style={s.form}>
        <div>
          <label className="sr-label" htmlFor="signup-name">Username</label>
          <input id="signup-name" className="sr-input" type="text" placeholder="Choose a unique username"
            value={name} onChange={function(e) { setName(e.target.value); }} required />
        </div>
        <div>
          <label className="sr-label" htmlFor="signup-pwd">Password</label>
          <input id="signup-pwd" className="sr-input" type="password" placeholder="At least 4 characters"
            value={password} onChange={function(e) { setPassword(e.target.value); }} required />
          {password.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
              {[1,2,3,4].map(function(i) {
                return <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: password.length >= i * 3 ? color : 'rgba(0,0,0,0.08)', transition: 'background 0.2s' }} />;
              })}
              <span style={{ fontSize: '0.7rem', fontWeight: '700', marginLeft: '8px', color: color, whiteSpace: 'nowrap' }}>
                {strengthLabel(password.length)}
              </span>
            </div>
          )}
        </div>
        <button className="sr-btn sr-btn-gold" type="submit" disabled={loading}
          style={{ width: '100%', padding: '14px', marginTop: '8px', fontSize: '0.95rem' }}>
          {loading ? 'Creating account…' : 'Create Account →'}
        </button>
      </form>

      <p style={s.footer}>
        Already have an account?{' '}
        <Link to="/login" style={s.footerLink}>Sign in</Link>
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

export default SignupForm;
