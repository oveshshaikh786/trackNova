import React, { useState, useEffect } from 'react';
import { getStoredUser } from '../services/authService';
import { getProfile, updateProfile, changeOwnPassword } from '../services/trainService';

function avatarColor(str) {
  var hash = 0;
  if (!str) return '#6366f1';
  for (var i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return 'hsl(' + (Math.abs(hash) % 360) + ',55%,55%)';
}

const Field = function({ label, id, value, onChange, type, placeholder }) {
  return (
    <div>
      <label className="sr-label" htmlFor={id}>{label}</label>
      <input id={id} className="sr-input" type={type || 'text'} value={value || ''} placeholder={placeholder || ''}
        onChange={function(e) { onChange(e.target.value); }} />
    </div>
  );
};

const ProfilePage = function() {
  var user = getStoredUser();
  // eslint-disable-next-line no-unused-vars
  var [profile, setProfile]     = useState({});
  var [firstName, setFirstName] = useState('');
  var [lastName, setLastName]   = useState('');
  var [age, setAge]             = useState('');
  var [phone, setPhone]         = useState('');
  var [saving, setSaving]       = useState(false);
  var [msg, setMsg]             = useState('');
  var [isErr, setIsErr]         = useState(false);

  var [curPwd, setCurPwd]   = useState('');
  var [newPwd, setNewPwd]   = useState('');
  var [pwdMsg, setPwdMsg]   = useState('');
  var [pwdErr, setPwdErr]   = useState(false);
  var [pwdSaving, setPwdSaving] = useState(false);

  useEffect(function() {
    if (!user) return;
    getProfile(user.userId).then(function(p) {
      setProfile(p);
      setFirstName(p.firstName || '');
      setLastName(p.lastName || '');
      setAge(p.age || '');
      setPhone(p.phone || '');
    }).catch(function() {});
  }, [user]);

  var handleSave = async function(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await updateProfile({ userId: user.userId, firstName, lastName, age: age || null, phone: phone || null });
      setIsErr(false); setMsg('Profile updated successfully.');
    } catch {
      setIsErr(true); setMsg('Failed to update profile.');
    } finally { setSaving(false); }
  };

  var handlePwd = async function(e) {
    e.preventDefault();
    if (newPwd.length < 4) { setPwdErr(true); setPwdMsg('New password must be at least 4 characters.'); return; }
    setPwdSaving(true); setPwdMsg('');
    try {
      await changeOwnPassword({ userId: user.userId, currentPassword: curPwd, newPassword: newPwd });
      setPwdErr(false); setPwdMsg('Password changed successfully.');
      setCurPwd(''); setNewPwd('');
    } catch {
      setPwdErr(true); setPwdMsg('Current password is incorrect.');
    } finally { setPwdSaving(false); }
  };

  var initials = (user && user.name) ? user.name.slice(0, 2).toUpperCase() : '?';
  var bg = avatarColor(user && user.name);

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Avatar header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', padding: '24px', background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a' }}>{user && user.name}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
            {user && user.role === 'ADMIN' ? (
              <span style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderRadius: '5px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: '700' }}>ADMIN</span>
            ) : (
              <span style={{ background: 'rgba(99,102,241,0.10)', color: '#4f46e5', borderRadius: '5px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: '700' }}>MEMBER</span>
            )}
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.07)', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>Personal Information</div>
        {msg && <div className={isErr ? 'sr-alert sr-alert-error' : 'sr-alert sr-alert-success'}>{msg}</div>}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="First Name" id="fn" value={firstName} onChange={setFirstName} placeholder="John" />
            <Field label="Last Name"  id="ln" value={lastName}  onChange={setLastName}  placeholder="Doe" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Age"   id="age"   value={age}   onChange={setAge}   type="number" placeholder="30" />
            <Field label="Phone" id="phone" value={phone} onChange={setPhone} placeholder="+1 555 000 0000" />
          </div>
          <div>
            <label className="sr-label">Username</label>
            <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.03)', border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: '8px', color: '#64748b', fontSize: '0.9rem' }}>
              {user && user.name}
            </div>
          </div>
          <button className="sr-btn sr-btn-gold" type="submit" disabled={saving} style={{ width: '100%', padding: '13px', fontSize: '0.9rem' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.07)', padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>Change Password</div>
        {pwdMsg && <div className={pwdErr ? 'sr-alert sr-alert-error' : 'sr-alert sr-alert-success'}>{pwdMsg}</div>}
        <form onSubmit={handlePwd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="Current Password" id="cur" value={curPwd} onChange={setCurPwd} type="password" placeholder="••••••••" />
          <Field label="New Password"     id="new" value={newPwd} onChange={setNewPwd} type="password" placeholder="Min. 4 characters" />
          <button className="sr-btn sr-btn-indigo" type="submit" disabled={pwdSaving} style={{ width: '100%', padding: '13px', fontSize: '0.9rem' }}>
            {pwdSaving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
