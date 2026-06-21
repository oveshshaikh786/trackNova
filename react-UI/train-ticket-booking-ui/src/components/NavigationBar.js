import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getStoredUser, clearUser, isAdmin } from '../services/authService';

/* ── TrackNova Logo SVG ── */
const TrackNovaLogo = function() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#f59e0b"/>
      <rect x="5" y="11" width="22" height="12" rx="3" fill="white"/>
      <rect x="8"  y="14" width="5" height="4" rx="1.5" fill="#6366f1"/>
      <rect x="16" y="14" width="5" height="4" rx="1.5" fill="#6366f1"/>
      <circle cx="10" cy="24" r="2.5" fill="#07090f"/>
      <circle cx="22" cy="24" r="2.5" fill="#07090f"/>
    </svg>
  );
};

function stringToColor(str) {
  if (!str) return '#6366f1';
  var hash = 0;
  for (var i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  var h = Math.abs(hash) % 360;
  return 'hsl(' + h + ',60%,55%)';
}

/* ── Hamburger icon ── */
const HamburgerIcon = function({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {open ? (
        /* X */
        <>
          <line x1="4" y1="4" x2="18" y2="18" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="18" y1="4" x2="4" y2="18" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round"/>
        </>
      ) : (
        /* ≡ */
        <>
          <line x1="3" y1="6"  x2="19" y2="6"  stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="3" y1="11" x2="19" y2="11" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="3" y1="16" x2="19" y2="16" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
};

const NavigationBar = function() {
  var user          = getStoredUser();
  var navigate      = useNavigate();
  var location      = useLocation();
  var [dropOpen, setDropOpen]   = useState(false);
  var [sideOpen, setSideOpen]   = useState(false);
  var [isMobile, setIsMobile]   = useState(window.innerWidth < 640);
  var dropRef       = useRef(null);
  var sideRef       = useRef(null);

  var hideOnAuth = ['/login', '/signup'].includes(location.pathname);

  /* close sidebar on route change */
  useEffect(function() { setSideOpen(false); setDropOpen(false); }, [location.pathname]);

  /* responsive listener */
  useEffect(function() {
    var onResize = function() { setIsMobile(window.innerWidth < 640); };
    window.addEventListener('resize', onResize);
    return function() { window.removeEventListener('resize', onResize); };
  }, []);

  /* close dropdown on outside click */
  useEffect(function() {
    if (hideOnAuth) return;
    var handler = function(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return function() { document.removeEventListener('mousedown', handler); };
  }, [hideOnAuth]);

  /* close sidebar on outside click */
  useEffect(function() {
    if (!sideOpen) return;
    var handler = function(e) {
      if (sideRef.current && !sideRef.current.contains(e.target)) setSideOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return function() { document.removeEventListener('mousedown', handler); };
  }, [sideOpen]);

  /* lock body scroll when sidebar open */
  useEffect(function() {
    document.body.style.overflow = sideOpen ? 'hidden' : '';
    return function() { document.body.style.overflow = ''; };
  }, [sideOpen]);

  if (hideOnAuth) return null;

  var handleLogout = function() {
    clearUser();
    setSideOpen(false);
    navigate('/login');
  };

  var initials = user ? (user.name || 'U').slice(0, 2).toUpperCase() : '?';
  var avatarBg = stringToColor(user ? user.name : '');

  var isActive = function(path) { return location.pathname === path; };

  var sideLink = function(to, icon, label, color) {
    return (
      <Link
        to={to}
        onClick={function() { setSideOpen(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '13px 20px', borderRadius: '12px', textDecoration: 'none',
          fontSize: '1rem', fontWeight: '600',
          color: color || (isActive(to) ? '#4f46e5' : '#0f172a'),
          background: isActive(to) ? 'rgba(99,102,241,0.08)' : 'transparent',
          transition: 'background 0.15s',
        }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* ── Main nav bar ── */}
      <nav style={nb.bar}>
        <div style={nb.inner}>

          {/* Logo */}
          <Link to="/search" style={nb.logoLink}>
            <TrackNovaLogo />
            <span style={nb.logoText}>
              Track<span style={{ color: '#f59e0b' }}>Nova</span>
            </span>
          </Link>

          {/* Desktop nav links (hidden on mobile) */}
          {user && !isMobile && (
            <div style={nb.links}>
              <Link to="/search"   style={{ ...nb.link, ...(isActive('/search')   ? nb.linkActive : {}) }}>Search</Link>
              <Link to="/bookings" style={{ ...nb.link, ...(isActive('/bookings') ? nb.linkActive : {}) }}>My Trips</Link>
              {isAdmin() && (
                <Link to="/admin" style={{ ...nb.link, ...(isActive('/admin') ? nb.linkActive : {}), color: '#d97706' }}>
                  ⚙ Admin
                </Link>
              )}
            </div>
          )}

          {/* Right side */}
          <div style={nb.right}>
            {!user ? (
              <Link to="/login" className="sr-btn sr-btn-gold" style={{ padding: '9px 22px', textDecoration: 'none', fontSize: '0.85rem' }}>
                Get Started
              </Link>
            ) : isMobile ? (
              /* ── Mobile: avatar chip + hamburger ── */
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ ...nb.avatar, background: avatarBg, width: '34px', height: '34px', borderRadius: '9px', fontSize: '0.78rem' }}>{initials}</div>
                <button
                  onClick={function() { setSideOpen(!sideOpen); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', borderRadius: '8px' }}
                  aria-label="Open menu">
                  <HamburgerIcon open={sideOpen} />
                </button>
              </div>
            ) : (
              /* ── Desktop: avatar dropdown ── */
              <div style={{ position: 'relative' }} ref={dropRef}>
                <button style={nb.avatarBtn} onClick={function() { setDropOpen(!dropOpen); }}>
                  <div style={{ ...nb.avatar, background: avatarBg }}>{initials}</div>
                  <div style={nb.avatarInfo}>
                    <div style={nb.avatarName}>{user.name}</div>
                    <div style={nb.avatarRole}>TrackNova Member</div>
                  </div>
                  <span style={{ color: 'rgba(15,23,42,0.4)', fontSize: '0.7rem', marginLeft: '2px' }}>▾</span>
                </button>

                {dropOpen && (
                  <div style={nb.dropdown}>
                    <Link to="/profile" style={nb.dropItem} onClick={function() { setDropOpen(false); }}>
                      <span>👤</span> Profile
                    </Link>
                    <Link to="/bookings" style={nb.dropItem} onClick={function() { setDropOpen(false); }}>
                      <span>🎫</span> My Trips
                    </Link>
                    <div style={nb.dropDivider} />
                    <button style={nb.dropItemBtn} onClick={handleLogout}>
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile sidebar overlay ── */}
      {isMobile && sideOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}>
          {/* Sidebar panel */}
          <div
            ref={sideRef}
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: '78vw', maxWidth: '300px',
              background: '#ffffff',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>

            {/* Sidebar header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '20px 20px 16px',
              borderBottom: '1px solid rgba(0,0,0,0.07)',
            }}>
              <div style={{ ...nb.avatar, background: avatarBg, width: '42px', height: '42px', borderRadius: '11px', fontSize: '0.9rem' }}>{initials}</div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>{user ? user.name : ''}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>TrackNova Member</div>
              </div>
              <button
                onClick={function() { setSideOpen(false); }}
                style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                aria-label="Close menu">
                <HamburgerIcon open={true} />
              </button>
            </div>

            {/* Nav links */}
            <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
              {sideLink('/search',   '🔍', 'Search Trains')}
              {sideLink('/bookings', '🎫', 'My Trips')}
              {sideLink('/profile',  '👤', 'Profile')}
              {isAdmin() && sideLink('/admin', '⚙', 'Admin Panel', '#d97706')}
            </div>

            {/* Divider + sign out */}
            <div style={{ padding: '12px 10px 28px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  width: '100%', padding: '13px 20px', borderRadius: '12px',
                  background: 'rgba(220,38,38,0.06)', border: 'none', cursor: 'pointer',
                  fontSize: '1rem', fontWeight: '600', color: '#dc2626', fontFamily: 'inherit',
                }}>
                <span style={{ fontSize: '1.2rem' }}>🚪</span>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const nb = {
  bar: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
    boxShadow: '0 1px 12px rgba(99,102,241,0.07)',
  },
  inner: {
    maxWidth: '1100px', margin: '0 auto',
    padding: '0 20px', height: '62px',
    display: 'flex', alignItems: 'center', gap: '32px',
  },
  logoLink: { display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' },
  logoText: { fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' },
  links:    { display: 'flex', alignItems: 'center', gap: '4px', flex: 1 },
  link: {
    color: 'rgba(15,23,42,0.52)', fontSize: '0.88rem', fontWeight: '600',
    textDecoration: 'none', padding: '6px 14px', borderRadius: '8px',
    transition: 'all 0.15s',
  },
  linkActive: { color: '#0f172a', background: 'rgba(99,102,241,0.08)' },
  right:    { marginLeft: 'auto', display: 'flex', alignItems: 'center' },
  avatarBtn: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.09)',
    borderRadius: '10px', padding: '6px 12px 6px 8px',
    cursor: 'pointer', color: 'inherit',
    transition: 'background 0.15s',
  },
  avatar: { width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', color: '#fff', flexShrink: 0 },
  avatarInfo: { textAlign: 'left' },
  avatarName: { fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', lineHeight: 1.2 },
  avatarRole: { fontSize: '0.68rem', color: 'rgba(15,23,42,0.42)', lineHeight: 1 },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)',
    borderRadius: '12px', padding: '6px', minWidth: '180px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.10)',
    display: 'flex', flexDirection: 'column', gap: '2px',
  },
  dropItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 14px', borderRadius: '8px',
    color: 'rgba(15,23,42,0.72)', fontSize: '0.86rem', fontWeight: '500',
    textDecoration: 'none', transition: 'background 0.12s',
    background: 'transparent',
  },
  dropItemBtn: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 14px', borderRadius: '8px', width: '100%',
    color: '#dc2626', fontSize: '0.86rem', fontWeight: '500',
    background: 'transparent', border: 'none', cursor: 'pointer',
    transition: 'background 0.12s', fontFamily: 'inherit', textAlign: 'left',
  },
  dropDivider: { height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 0' },
};

export default NavigationBar;
