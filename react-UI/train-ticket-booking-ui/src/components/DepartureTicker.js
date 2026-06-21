import React, { useState, useEffect } from 'react';
import { getDepartures } from '../services/trainService';

function toMins(hhmm) {
  var p = (hhmm || '').split(':');
  return p.length < 2 ? -1 : parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

function statusInfo(train) {
  var s = (train.status || 'ON_TIME').toUpperCase();
  if (s === 'CANCELLED') return { label: 'CANCELLED', color: '#dc2626' };
  if (s === 'DELAYED' || (train.delay_minutes || train.delayMinutes || 0) > 0)
    return { label: 'DELAYED', color: '#ea580c' };

  var stops = train.stations || [];
  var times = train.station_times || train.stationTimes || {};
  var dep = times[stops[0]] || '';
  var depM = toMins(dep);
  if (depM >= 0) {
    var now = new Date();
    var nowM = now.getHours() * 60 + now.getMinutes();
    var diff = depM - nowM;
    if (diff < -5)  return { label: 'DEPARTED', color: '#64748b' };
    if (diff <= 30) return { label: 'BOARDING', color: '#d97706' };
  }
  return { label: 'ON TIME', color: '#059669' };
}

export default function DepartureTicker() {
  var [trains, setTrains] = useState([]);

  useEffect(function() {
    getDepartures().then(setTrains).catch(function() {});
    var iv = setInterval(function() {
      getDepartures().then(setTrains).catch(function() {});
    }, 60000);
    return function() { clearInterval(iv); };
  }, []);

  if (trains.length === 0) return null;

  // Build the ticker text as a list of segments — duplicated so it loops seamlessly
  var segments = trains.map(function(t) {
    var stops = t.stations || [];
    var times = t.station_times || t.stationTimes || {};
    var origin = stops[0] || '';
    var dest   = stops[stops.length - 1] || '';
    var dep    = times[origin] || '—';
    var si     = statusInfo(t);
    return { name: t.name || t.trainId, dep, origin, dest, si };
  });

  // Inline keyframes via a style tag; animation duration scales with content length
  var duration = Math.max(20, segments.length * 6);

  var tickerItem = function(seg, key) {
    return (
      <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0', marginRight: '0' }}>
        {/* separator dot */}
        <span style={{ color: '#cbd5e1', margin: '0 18px', fontSize: '0.6rem' }}>◆</span>
        {/* train name */}
        <span style={{ color: '#334155', fontWeight: '700', fontSize: '0.72rem', fontFamily: "'Courier New', monospace", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {seg.name}
        </span>
        {/* departure time */}
        <span style={{ color: '#64748b', fontSize: '0.7rem', fontFamily: "'Courier New', monospace", margin: '0 8px' }}>
          {seg.dep}
        </span>
        {/* route */}
        <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontFamily: "'Courier New', monospace" }}>
          {seg.origin.toUpperCase()} → {seg.dest.toUpperCase()}
        </span>
        {/* status pill */}
        <span style={{ marginLeft: '10px', color: seg.si.color, fontSize: '0.62rem', fontWeight: '800', fontFamily: "'Courier New', monospace", letterSpacing: '0.08em' }}>
          {seg.si.label}
        </span>
      </span>
    );
  };

  return (
    <div style={{
      background: '#f0f4ff',
      borderBottom: '1px solid rgba(99,102,241,0.12)',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Left fade */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px', background: 'linear-gradient(to right, #f0f4ff, transparent)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Pulse dot + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', borderRight: '1px solid rgba(0,0,0,0.07)', flexShrink: 0, zIndex: 3, background: '#f0f4ff' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981', animation: 'tickerPulse 2s infinite' }} />
        <span style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Live</span>
      </div>

      {/* Scrolling content — duplicated for seamless loop */}
      <div style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
        <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: `tickerScroll ${duration}s linear infinite` }}>
          {segments.map(function(seg, i) { return tickerItem(seg, 'a' + i); })}
          {segments.map(function(seg, i) { return tickerItem(seg, 'b' + i); })}
        </div>
      </div>

      {/* Right fade */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(to left, #f0f4ff, transparent)', zIndex: 2, pointerEvents: 'none' }} />

      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes tickerPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
