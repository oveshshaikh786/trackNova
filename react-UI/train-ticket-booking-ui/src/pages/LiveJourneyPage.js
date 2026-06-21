import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getWaypoints, getJourneyState } from '../services/trainService';

function getNowHHMM() {
  var now = new Date();
  return now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
}
function sideLabel(side) {
  if (side === 'LEFT')  return '👈 Look left';
  if (side === 'RIGHT') return '👉 Look right';
  return '👀 Look both sides';
}

function ProgressRing({ pct }) {
  var r = 44; var circ = 2 * Math.PI * r;
  var offset = circ - (pct / 100) * circ;
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="8"/>
      <circle cx="55" cy="55" r={r} fill="none" stroke="#f59e0b" strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transform:'rotate(-90deg)', transformOrigin:'55px 55px', transition:'stroke-dashoffset 0.8s ease' }}/>
      <text x="55" y="50" textAnchor="middle" fill="#0f172a" fontSize="18" fontWeight="800">{pct}%</text>
      <text x="55" y="68" textAnchor="middle" fill="#475569" fontSize="10">complete</text>
    </svg>
  );
}

function WaypointCard({ waypoint, isCurrent }) {
  if (!waypoint) return null;
  return (
    <div style={{
      background: isCurrent ? 'rgba(245,158,11,0.05)' : '#ffffff',
      borderRadius: '14px',
      border: isCurrent ? '1.5px solid rgba(245,158,11,0.35)' : '1px solid rgba(0,0,0,0.07)',
      padding: '20px 22px',
      boxShadow: isCurrent ? '0 0 24px rgba(245,158,11,0.08)' : '0 1px 8px rgba(0,0,0,0.04)',
      opacity: isCurrent ? 1 : 0.75,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize: isCurrent ? '1.7rem' : '1.2rem' }}>{waypoint.emoji}</span>
          <div>
            <div style={{ fontWeight:'800', fontSize: isCurrent ? '1rem' : '0.9rem', color:'#0f172a' }}>{waypoint.name}</div>
            <div style={{ fontSize:'0.7rem', fontWeight:'700', color:'#6366f1', marginTop:'2px' }}>{sideLabel(waypoint.side)}</div>
          </div>
        </div>
        {isCurrent
          ? <div style={{ background:'rgba(217,119,6,0.10)', color:'#d97706', borderRadius:'12px', padding:'3px 10px', fontSize:'0.68rem', fontWeight:'700' }}>NOW</div>
          : <div style={{ background:'rgba(0,0,0,0.04)', color:'#64748b', borderRadius:'12px', padding:'3px 10px', fontSize:'0.68rem', fontWeight:'600' }}>@{waypoint.positionPercent}%</div>
        }
      </div>
      <p style={{ margin:0, fontSize: isCurrent ? '0.88rem' : '0.8rem', color: isCurrent ? '#94a3b8' : '#475569', lineHeight:1.6 }}>
        {waypoint.narration}
      </p>
    </div>
  );
}

const LiveJourneyPage = function() {
  var [params]  = useSearchParams();
  var navigate  = useNavigate();
  var trainId   = params.get('trainId')   || '';
  var departure = params.get('departure') || '06:00';
  var from      = params.get('from')      || '';
  var to        = params.get('to')        || '';
  var trainName = params.get('name')      || trainId;
  var travelDate = params.get('date')     || '';   // YYYY-MM-DD

  var [state,    setState]    = useState(null);
  var [allWpts,  setAllWpts]  = useState([]);
  var [loading,  setLoading]  = useState(true);
  var [error,    setError]    = useState('');
  var [lastRefresh, setLastRefresh] = useState('');

  // Derive date relationship once
  var today = new Date().toISOString().split('T')[0];
  var dateStatus = !travelDate ? 'unknown'
    : travelDate > today ? 'future'
    : travelDate < today ? 'past'
    : 'today';

  var load = useCallback(async function() {
    if (!trainId) { setError('No train specified.'); setLoading(false); return; }
    // Don't call backend if travel date is in the future — journey hasn't started
    if (dateStatus === 'future') { setLoading(false); return; }
    try {
      var now = getNowHHMM();
      var results = await Promise.all([getJourneyState(trainId, departure, now), getWaypoints(trainId)]);
      setState(results[0]); setAllWpts(results[1]); setLastRefresh(now); setError('');
    } catch (e) { setError('Could not load journey data.'); }
    finally { setLoading(false); }
  }, [trainId, departure, dateStatus]);

  useEffect(function() {
    load();
    var iv = setInterval(load, 60000);
    return function() { clearInterval(iv); };
  }, [load]);

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'16px', background:'#f0f4ff' }}>
      <div style={{ width:'36px', height:'36px', border:'3px solid rgba(0,0,0,0.08)', borderTopColor:'#f59e0b', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ color:'#475569', fontSize:'0.88rem' }}>Loading your journey…</div>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth:'600px', margin:'80px auto', padding:'0 24px', textAlign:'center', background:'#f0f4ff', minHeight:'100vh' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>🛤️</div>
      <div style={{ fontWeight:'700', color:'#0f172a', marginBottom:'8px' }}>Journey data unavailable</div>
      <div style={{ color:'#64748b', marginBottom:'24px', fontSize:'0.88rem' }}>{error}</div>
      <button className="sr-btn sr-btn-gold" onClick={function() { navigate('/bookings'); }}>Back to Bookings</button>
    </div>
  );

  // Future trip — show countdown card instead of journey tracker
  if (!loading && dateStatus === 'future') {
    var daysUntil = Math.ceil((new Date(travelDate) - new Date(today)) / 86400000);
    return (
      <div style={{ background:'#f0f4ff', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
        <div style={{ textAlign:'center', maxWidth:'480px' }}>
          <div style={{ fontSize:'3rem', marginBottom:'16px' }}>🗓️</div>
          <h2 style={{ color:'#0f172a', fontWeight:'800', fontSize:'1.3rem', marginBottom:'8px' }}>Journey Not Started Yet</h2>
          <p style={{ color:'#64748b', marginBottom:'8px' }}>
            <strong style={{ color:'#4f46e5' }}>{trainName}</strong> departs <strong style={{ color:'#d97706' }}>{from} → {to}</strong>
          </p>
          <p style={{ color:'#64748b', marginBottom:'24px' }}>
            Travel date: <strong style={{ color:'#0f172a' }}>{travelDate}</strong> · Departs at <strong style={{ color:'#0f172a' }}>{departure}</strong>
            <br /><span style={{ color:'#059669', fontWeight:'700' }}>{daysUntil} day{daysUntil!==1?'s':''} away</span>
          </p>
          <button onClick={function(){ navigate('/bookings'); }}
            style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'10px', color:'#fff', fontWeight:'700', cursor:'pointer' }}>
            ← Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  var pos       = state ? state.positionPercent : 0;
  var current   = state ? state.current : null;
  var upcoming  = state ? (state.upcoming || []) : [];
  var elapsed   = state ? state.elapsedMinutes : 0;
  var total     = state ? state.totalMinutes : 480;
  var elH = Math.floor(elapsed / 60), elM = elapsed % 60;
  var remM = Math.max(0, total - elapsed), remH = Math.floor(remM / 60), remMm = remM % 60;
  var notStarted = elapsed <= 0;
  var completed  = pos >= 99;

  return (
    <div style={{ background:'#f0f4ff', minHeight:'100vh' }}>
      {/* Header */}
      <div className="sr-hero" style={{ padding:'28px 24px 40px' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto' }}>
          <button onClick={function() { navigate('/bookings'); }}
            style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.8)', borderRadius:'8px', padding:'7px 14px', cursor:'pointer', fontSize:'0.8rem', fontWeight:'600', marginBottom:'20px', display:'inline-flex', alignItems:'center', gap:'6px', fontFamily:'inherit' }}>
            ← My Bookings
          </button>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'20px', padding:'4px 12px', marginBottom:'10px' }}>
                <span style={{ fontSize:'0.68rem', fontWeight:'700', color:'rgba(255,255,255,0.9)', textTransform:'uppercase', letterSpacing:'0.1em' }}>🛰️ WindowAI — Live Journey</span>
              </div>
              <h1 style={{ color:'#ffffff', fontSize:'1.5rem', fontWeight:'800', margin:0, lineHeight:1.2 }}>{trainName}</h1>
              <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.88rem', marginTop:'6px' }}>{from} → {to} · Departed {departure}</div>
            </div>
            <ProgressRing pct={pos} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'24px 24px 60px' }}>
        {/* Status strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:'10px', marginBottom:'24px' }}>
          {[
            { l:'STATUS',      v: completed ? '🏁 Arrived' : notStarted ? '⏳ Not started' : '🚆 En route' },
            { l:'ELAPSED',     v: notStarted ? '—' : elH + 'h ' + elM + 'm' },
            { l:'REMAINING',   v: completed  ? '—' : remH + 'h ' + remMm + 'm' },
            { l:'LAST UPDATE', v: lastRefresh },
          ].map(function(item) {
            return (
              <div key={item.l} style={{ background:'#ffffff', borderRadius:'12px', padding:'14px 18px', border:'1px solid rgba(0,0,0,0.07)', boxShadow:'0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:'0.62rem', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>{item.l}</div>
                <div style={{ fontSize:'0.92rem', fontWeight:'700', color:'#0f172a' }}>{item.v}</div>
              </div>
            );
          })}
        </div>

        {notStarted && (
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'14px', padding:'32px', textAlign:'center', marginBottom:'20px', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'10px' }}>🚉</div>
            <div style={{ fontWeight:'700', fontSize:'1.05rem', color:'#0f172a', marginBottom:'6px' }}>Journey hasn't started yet</div>
            <div style={{ color:'#475569', fontSize:'0.88rem' }}>Your train departs at {departure}. Board up and come back!</div>
          </div>
        )}

        {completed && (
          <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'14px', padding:'22px', textAlign:'center', marginBottom:'20px' }}>
            <div style={{ fontSize:'2rem', marginBottom:'8px' }}>🏁</div>
            <div style={{ fontWeight:'700', fontSize:'1rem', color:'#059669' }}>You've arrived at {to}! Enjoy your destination.</div>
          </div>
        )}

        {!notStarted && !completed && current && (
          <div style={{ marginBottom:'22px' }}>
            <div style={{ fontSize:'0.68rem', fontWeight:'700', color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'10px' }}>📍 Right now outside your window</div>
            <WaypointCard waypoint={current} isCurrent={true} />
          </div>
        )}

        {upcoming.length > 0 && !completed && (
          <div style={{ marginBottom:'22px' }}>
            <div style={{ fontSize:'0.68rem', fontWeight:'700', color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'10px' }}>🔭 Coming up on your journey</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {upcoming.map(function(wp) { return <WaypointCard key={wp.positionPercent} waypoint={wp} isCurrent={false} />; })}
            </div>
          </div>
        )}

        {allWpts.length > 0 && (
          <div style={{ marginBottom:'24px' }}>
            <div style={{ fontSize:'0.68rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'12px' }}>🗺️ Full route — {allWpts.length} landmarks</div>
            <div style={{ background:'#ffffff', borderRadius:'14px', border:'1px solid rgba(0,0,0,0.07)', overflow:'hidden', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
              {allWpts.map(function(wp, i) {
                var isPast = wp.positionPercent < pos;
                var isCur  = current && wp.positionPercent === current.positionPercent;
                return (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'14px', padding:'14px 20px', borderBottom: i < allWpts.length-1 ? '1px solid rgba(0,0,0,0.05)' : 'none', opacity: isPast && !isCur ? 0.4 : 1, background: isCur ? 'rgba(245,158,11,0.05)' : 'transparent' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:'2px' }}>
                      <div style={{ width:'9px', height:'9px', borderRadius:'50%', background: isCur ? '#f59e0b' : isPast ? '#e2e8f0' : '#6366f1', border: isCur ? '2px solid rgba(245,158,11,0.4)' : '2px solid rgba(99,102,241,0.3)', flexShrink:0 }} />
                      {i < allWpts.length-1 && <div style={{ width:'1px', flex:1, minHeight:'18px', background:'rgba(0,0,0,0.07)', marginTop:'3px' }} />}
                    </div>
                    <div style={{ flex:1, paddingBottom: i < allWpts.length-1 ? '6px' : 0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                        <span>{wp.emoji}</span>
                        <span style={{ fontWeight:'700', fontSize:'0.86rem', color:'#0f172a' }}>{wp.name}</span>
                        {isCur && <span style={{ background:'rgba(217,119,6,0.10)', color:'#d97706', borderRadius:'6px', padding:'1px 6px', fontSize:'0.62rem', fontWeight:'700' }}>NOW</span>}
                        <span style={{ marginLeft:'auto', fontSize:'0.7rem', color:'#475569' }}>{wp.positionPercent}%</span>
                      </div>
                      <div style={{ fontSize:'0.76rem', color:'#475569', marginTop:'3px', lineHeight:1.5 }}>
                        {wp.narration.substring(0,90)}{wp.narration.length > 90 ? '…' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign:'center', color:'#94a3b8', fontSize:'0.75rem' }}>
          Auto-refreshes every 60s · Powered by WindowAI™
        </div>
      </div>
    </div>
  );
};

export default LiveJourneyPage;
