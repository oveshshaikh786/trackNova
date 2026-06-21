import React, { useState, useEffect, useRef } from 'react';
import { getDepartures } from '../services/trainService';

var STATUS_CFG = {
  ON_TIME:   { label: 'ON TIME',   color: '#059669', bg: 'rgba(5,150,105,0.08)',   dot: '#059669' },
  BOARDING:  { label: 'BOARDING',  color: '#d97706', bg: 'rgba(217,119,6,0.08)',   dot: '#d97706' },
  DELAYED:   { label: 'DELAYED',   color: '#ea580c', bg: 'rgba(234,88,12,0.08)',   dot: '#ea580c' },
  CANCELLED: { label: 'CANCELLED', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   dot: '#dc2626' },
  DEPARTED:  { label: 'DEPARTED',  color: '#64748b', bg: 'rgba(100,116,139,0.07)', dot: '#94a3b8' },
};

function toMins(hhmm) {
  var p = (hhmm || '').split(':');
  return p.length < 2 ? -1 : parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

function getStatusKey(train, depTime) {
  var s = (train.status || 'ON_TIME').toUpperCase();
  if (s === 'CANCELLED') return 'CANCELLED';
  if (s === 'DELAYED' || (train.delay_minutes || train.delayMinutes || 0) > 0) return 'DELAYED';

  var dep = toMins(depTime);
  if (dep < 0) return 'ON_TIME';

  var now = new Date();
  var nowM = now.getHours() * 60 + now.getMinutes();
  var diff = dep - nowM; // positive = departs in future, negative = already left

  if (diff < -5)  return 'DEPARTED'; // left more than 5 min ago
  if (diff <= 30) return 'BOARDING'; // within 30 min of departure
  return 'ON_TIME';
}

function getFirstStop(train) {
  var stops = train.stations || train.stationList || [];
  return stops[0] || '—';
}
function getLastStop(train) {
  var stops = train.stations || train.stationList || [];
  return stops[stops.length - 1] || '—';
}
function getDepartureTime(train) {
  var stops = train.stations || train.stationList || [];
  var times = train.station_times || train.stationTimes || {};
  return times[stops[0]] || '—';
}
function getMidStops(train) {
  var stops = train.stations || train.stationList || [];
  return stops.slice(1, stops.length - 1).join(' · ') || '';
}

// Flip-flap character animation for a single character cell
function FlipChar({ char, delay }) {
  var [display, setDisplay] = useState(char);
  var [flipping, setFlipping] = useState(false);
  var prev = useRef(char);

  useEffect(function() {
    if (prev.current === char) return;
    var t = setTimeout(function() {
      setFlipping(true);
      setTimeout(function() {
        setDisplay(char);
        setFlipping(false);
        prev.current = char;
      }, 120);
    }, delay);
    return function() { clearTimeout(t); };
  }, [char, delay]);

  return (
    <span style={{
      display: 'inline-block',
      fontFamily: "'Courier New', monospace",
      fontWeight: '700',
      fontSize: '0.82rem',
      letterSpacing: '0.02em',
      color: flipping ? '#94a3b8' : '#0f172a',
      transform: flipping ? 'scaleY(0)' : 'scaleY(1)',
      transition: flipping ? 'transform 0.06s ease-in' : 'transform 0.06s ease-out, color 0.1s',
      transformOrigin: 'center',
    }}>{display === ' ' ? ' ' : display}</span>
  );
}

function FlipText({ text, maxLen = 20 }) {
  var padded = text.toUpperCase().padEnd(maxLen).slice(0, maxLen);
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {padded.split('').map(function(c, i) {
        return <FlipChar key={i} char={c} delay={i * 18} />;
      })}
    </span>
  );
}

export default function DepartureBoard() {
  var [trains,  setTrains]  = useState([]);
  var [active,  setActive]  = useState(0);   // which row is highlighted
  var [visible, setVisible] = useState(true);
  var [isMobile, setIsMobile] = useState(window.innerWidth < 560);
  var ROWS = 6; // how many rows to show at once

  useEffect(function() {
    var onResize = function() { setIsMobile(window.innerWidth < 560); };
    window.addEventListener('resize', onResize);
    return function() { window.removeEventListener('resize', onResize); };
  }, []);

  useEffect(function() {
    getDepartures().then(function(list) {
      setTrains(list);
    });
    // Refresh every 60 s
    var iv = setInterval(function() {
      getDepartures().then(setTrains);
    }, 60000);
    return function() { clearInterval(iv); };
  }, []);

  // Rotate the "active" highlight row every 2.5s
  useEffect(function() {
    if (trains.length === 0) return;
    var t = setInterval(function() {
      setActive(function(a) { return (a + 1) % trains.length; });
    }, 2500);
    return function() { clearInterval(t); };
  }, [trains.length]);

  // Scroll the visible window so active row is always in view
  var windowStart = Math.max(0, Math.min(active - 1, trains.length - ROWS));
  var visibleTrains = trains.slice(windowStart, windowStart + ROWS);

  if (trains.length === 0) return null;

  var col = { color: '#94a3b8', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px 6px', whiteSpace: 'nowrap' };
  var cell = { padding: '0 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

  return (
    <div style={{ background: '#f8faff', borderBottom: '1px solid rgba(99,102,241,0.12)', overflow: 'hidden' }}>
      {/* Board header */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Live Departures
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.08em' }}>
              {trains.length} trains scheduled
            </span>
          </div>
          <button
            onClick={function() { setVisible(function(v) { return !v; }); }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', padding: '2px 6px' }}
          >
            {visible ? '▲ HIDE' : '▼ SHOW'}
          </button>
        </div>

        {visible && (
          <>
            {/* Column headers */}
            {isMobile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '62px 1fr auto', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '4px', marginBottom: '2px' }}>
                <span style={col}>Dep.</span>
                <span style={col}>Train / Route</span>
                <span style={col}>Status</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 80px 110px 90px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '4px', marginBottom: '2px' }}>
                <span style={col}>Departs</span>
                <span style={col}>Train</span>
                <span style={col}>Route</span>
                <span style={col}>No.</span>
                <span style={col}>Via</span>
                <span style={col}>Status</span>
              </div>
            )}

            {/* Rows */}
            <div style={{ paddingBottom: '10px' }}>
              {visibleTrains.map(function(train, idx) {
                var globalIdx = windowStart + idx;
                var isActive  = globalIdx === active;
                var id        = train.train_id || train.trainId;
                var dep       = getDepartureTime(train);
                var statusKey = getStatusKey(train, dep);
                var sc        = STATUS_CFG[statusKey] || STATUS_CFG.ON_TIME;
                var origin    = getFirstStop(train);
                var dest      = getLastStop(train);
                var via       = getMidStops(train);
                var no        = train.train_no || train.trainNo || id;

                var rowBase = {
                  alignItems: 'center',
                  padding: '5px 0',
                  background: isActive ? 'rgba(99,102,241,0.05)' : 'transparent',
                  borderRadius: '6px',
                  transition: 'background 0.4s ease',
                  borderLeft: isActive ? '2px solid rgba(99,102,241,0.4)' : '2px solid transparent',
                };

                var statusBadge = (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '2px 7px', borderRadius: '20px',
                    background: sc.bg, color: sc.color,
                    fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.06em',
                    fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sc.dot, display: 'inline-block', flexShrink: 0 }} />
                    {sc.label}
                  </span>
                );

                if (isMobile) {
                  return (
                    <div key={id} style={{ ...rowBase, display: 'grid', gridTemplateColumns: '62px 1fr auto', gap: '4px' }}>
                      {/* Time */}
                      <div style={{ ...cell, fontFamily: "'Courier New', monospace", color: '#0f172a', fontWeight: '700', fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                        {dep}
                      </div>
                      {/* Train name + route stacked */}
                      <div style={{ ...cell, overflow: 'hidden' }}>
                        <div style={{ fontFamily: "'Courier New', monospace", fontWeight: '700', fontSize: '0.75rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isActive
                            ? <FlipText text={train.name || id} maxLen={18} />
                            : (train.name || id).toUpperCase()
                          }
                        </div>
                        <div style={{ fontSize: '0.67rem', color: '#94a3b8', fontFamily: "'Courier New', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                          {origin.toUpperCase()} → {dest.toUpperCase()}
                        </div>
                      </div>
                      {/* Status */}
                      <div style={{ padding: '0 8px 0 4px' }}>{statusBadge}</div>
                    </div>
                  );
                }

                return (
                  <div key={id} style={{ ...rowBase, display: 'grid', gridTemplateColumns: '90px 1fr 1fr 80px 110px 90px' }}>
                    {/* Departure time */}
                    <div style={{ ...cell, fontFamily: "'Courier New', monospace", color: '#0f172a', fontWeight: '700', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                      {dep}
                    </div>
                    {/* Train name */}
                    <div style={cell}>
                      {isActive
                        ? <FlipText text={train.name || id} maxLen={22} />
                        : <span style={{ fontFamily: "'Courier New', monospace", fontWeight: '700', fontSize: '0.82rem', color: '#334155', letterSpacing: '0.02em' }}>{(train.name || id).toUpperCase()}</span>
                      }
                    </div>
                    {/* Origin → Destination */}
                    <div style={{ ...cell, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontFamily: "'Courier New', monospace", fontSize: '0.78rem', color: '#334155', fontWeight: '600' }}>{origin.toUpperCase()}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>→</span>
                      <span style={{ fontFamily: "'Courier New', monospace", fontSize: '0.78rem', color: '#64748b' }}>{dest.toUpperCase()}</span>
                    </div>
                    {/* Train number */}
                    <div style={{ ...cell, fontFamily: "'Courier New', monospace", color: '#94a3b8', fontSize: '0.75rem' }}>
                      {no}
                    </div>
                    {/* Via stops */}
                    <div style={{ ...cell, color: '#94a3b8', fontSize: '0.7rem', fontFamily: "'Courier New', monospace", overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {via ? via.toUpperCase() : '—'}
                    </div>
                    {/* Status badge */}
                    <div style={{ padding: '0 10px' }}>{statusBadge}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
