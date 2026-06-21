import React from 'react';
import LoginForm from '../components/LoginForm';

const LogoMark = function() {
  return (
    <svg width="44" height="44" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#f59e0b"/>
      <rect x="5" y="11" width="22" height="12" rx="3" fill="white"/>
      <rect x="8"  y="14" width="5" height="4" rx="1.5" fill="#6366f1"/>
      <rect x="16" y="14" width="5" height="4" rx="1.5" fill="#6366f1"/>
      <circle cx="10" cy="24" r="2.5" fill="#07090f"/>
      <circle cx="22" cy="24" r="2.5" fill="#07090f"/>
    </svg>
  );
};

/* Star field */
var stars = Array.from({ length: 60 }, function(_, i) {
  return { id: i, x: Math.sin(i * 137.5) * 50 + 50, y: (i * 13.7) % 100, r: i % 4 === 0 ? 2 : 1, op: 0.2 + (i % 5) * 0.12 };
});

/* Track SVG (perspective rails) */
const TrackDecor = function() {
  return (
    <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', opacity: 0.18, pointerEvents: 'none' }}>
      {/* Rails perspective */}
      <line x1="200" y1="0" x2="20"  y2="200" stroke="#6366f1" strokeWidth="3"/>
      <line x1="200" y1="0" x2="380" y2="200" stroke="#6366f1" strokeWidth="3"/>
      {/* Sleepers */}
      {[20,40,60,80,100,120,145,170,195].map(function(y, i) {
        var spread = y * 0.85;
        var lx = 200 - spread; var rx = 200 + spread;
        return <line key={i} x1={lx} y1={y} x2={rx} y2={y} stroke="#6366f1" strokeWidth="2" />;
      })}
    </svg>
  );
};

const Feature = function({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ color: 'rgba(241,245,249,0.7)', fontSize: '0.9rem', lineHeight: 1.4 }}>{text}</span>
    </div>
  );
};

const LoginPage = function() {
  return (
    <div style={pg.root}>
      {/* ── Left hero panel ── */}
      <div style={pg.hero}>
        {/* Stars */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
          {stars.map(function(s) {
            return <circle key={s.id} cx={s.x} cy={s.y} r={s.r * 0.3} fill="white" opacity={s.op} />;
          })}
        </svg>
        <TrackDecor />

        <div style={pg.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
            <LogoMark />
            <span style={{ color: '#f1f5f9', fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              Track<span style={{ color: '#f59e0b' }}>Nova</span>
            </span>
          </div>

          <h2 style={pg.heroH}>
            America's most<br />
            <span style={{ color: '#818cf8' }}>intelligent</span> rail network.
          </h2>
          <p style={pg.heroSub}>
            AI-powered booking, real-time delay prediction, and live journey narration — all in one place.
          </p>

          <div style={{ marginTop: '36px' }}>
            <Feature icon="🤖" text="PredictRail — ML delay forecast before you book" />
            <Feature icon="🛰️" text="WindowAI — live landmark narration en route" />
            <Feature icon="⚡" text="Instant seat booking across 200+ US routes" />
            <Feature icon="🔒" text="JWT-secured · Your data stays yours" />
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={pg.formPanel}>
        <LoginForm />
      </div>
    </div>
  );
};

const pg = {
  root:     { display: 'flex', minHeight: '100vh' },
  hero: {
    flex: '1 1 55%', minHeight: '100vh',
    background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 45%, #1e3a8a 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  heroContent: { position: 'relative', zIndex: 1, padding: '48px', maxWidth: '480px' },
  heroH: { color: '#f1f5f9', fontSize: '2.2rem', fontWeight: '800', lineHeight: 1.2, marginBottom: '14px' },
  heroSub: { color: 'rgba(241,245,249,0.6)', fontSize: '0.97rem', lineHeight: 1.65 },
  formPanel: {
    flex: '0 0 440px',
    background: '#ffffff',
    borderLeft: '1px solid rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 16px',
    boxShadow: '-8px 0 40px rgba(0,0,0,0.06)',
  },
};

export default LoginPage;
