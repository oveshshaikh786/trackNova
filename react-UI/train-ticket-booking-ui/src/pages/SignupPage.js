import React from 'react';
import SignupForm from '../components/SignupForm';

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

var stars = Array.from({ length: 60 }, function(_, i) {
  return { id: i, x: Math.cos(i * 137.5) * 50 + 50, y: (i * 17.3) % 100, r: i % 3 === 0 ? 2 : 1, op: 0.15 + (i % 6) * 0.1 };
});

const Stat = function({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'rgba(241,245,249,0.45)', marginTop: '3px' }}>{label}</div>
    </div>
  );
};

const SignupPage = function() {
  return (
    <div style={pg.root}>
      <div style={pg.hero}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
          {stars.map(function(s) {
            return <circle key={s.id} cx={s.x} cy={s.y} r={s.r * 0.3} fill="white" opacity={s.op} />;
          })}
        </svg>

        {/* Decorative glow orbs */}
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', top: '10%', left: '-10%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)', bottom: '15%', right: '10%', pointerEvents: 'none' }} />

        <div style={pg.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
            <LogoMark />
            <span style={{ color: '#f1f5f9', fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              Track<span style={{ color: '#f59e0b' }}>Nova</span>
            </span>
          </div>

          <h2 style={pg.heroH}>
            Travel smarter.<br />
            Travel <span style={{ color: '#818cf8' }}>TrackNova</span>.
          </h2>
          <p style={pg.heroSub}>
            Join thousands of travelers who've upgraded to AI-powered rail booking.
          </p>

          <div style={pg.statsRow}>
            <Stat value="200+" label="Routes" />
            <div style={pg.statDiv} />
            <Stat value="50K+" label="Travelers" />
            <div style={pg.statDiv} />
            <Stat value="4.9★" label="Rating" />
          </div>

          <div style={{ marginTop: '32px' }}>
            {['No hidden fees — ever', 'Cancel anytime before departure', 'Instant booking confirmation', 'AI delay forecast on every train'].map(function(t) {
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#818cf8', fontWeight: '700', flexShrink: 0 }}>✓</div>
                  <span style={{ color: 'rgba(241,245,249,0.65)', fontSize: '0.87rem' }}>{t}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={pg.formPanel}>
        <SignupForm />
      </div>
    </div>
  );
};

const pg = {
  root:     { display: 'flex', minHeight: '100vh' },
  hero: {
    flex: '1 1 55%', minHeight: '100vh',
    background: 'linear-gradient(145deg, #1e1b4b 0%, #2d1b69 45%, #1e3a8a 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  heroContent: { position: 'relative', zIndex: 1, padding: '48px', maxWidth: '480px' },
  heroH:    { color: '#f1f5f9', fontSize: '2.2rem', fontWeight: '800', lineHeight: 1.2, marginBottom: '14px' },
  heroSub:  { color: 'rgba(241,245,249,0.6)', fontSize: '0.97rem', lineHeight: 1.65, marginBottom: '28px' },
  statsRow: { display: 'flex', alignItems: 'center', gap: '24px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px 24px', border: '1px solid rgba(255,255,255,0.12)' },
  statDiv:  { width: '1px', height: '32px', background: 'rgba(255,255,255,0.15)' },
  formPanel: {
    flex: '0 0 440px',
    background: '#ffffff',
    borderLeft: '1px solid rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 16px',
    boxShadow: '-8px 0 40px rgba(0,0,0,0.06)',
  },
};

export default SignupPage;
