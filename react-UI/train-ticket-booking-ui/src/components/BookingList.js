import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

var SEAT_COLS = ['A', 'B', 'C', 'D'];

const BookingList = function({ tickets, onCancel }) {
  var [cancelling, setCancelling] = useState(null);
  var navigate = useNavigate();

  var handleCancel = async function(ticketId) {
    if (!window.confirm('Cancel this booking? This cannot be undone.')) return;
    setCancelling(ticketId);
    await onCancel(ticketId);
    setCancelling(null);
  };

  var fmtDate = function(d) {
    if (!d) return '';
    var dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  var isToday = function(d) {
    if (!d) return false;
    return d === new Date().toISOString().split('T')[0];
  };

  var openJourney = function(ticket) {
    var trainId   = ticket.train && ticket.train.train_id;
    var trainName = ticket.train && (ticket.train.name || ticket.train.train_id);
    var departure = ticket.train && ticket.train.station_times
      ? (ticket.train.station_times[ticket.source] || '06:00') : '06:00';
    navigate('/journey?' + [
      'trainId='   + encodeURIComponent(trainId   || ''),
      'departure=' + encodeURIComponent(departure),
      'from='      + encodeURIComponent(ticket.source      || ''),
      'to='        + encodeURIComponent(ticket.destination || ''),
      'name='      + encodeURIComponent(trainName || ''),
    ].join('&'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {tickets.map(function(ticket) {
        var seatLabel = ticket.seat_row != null
          ? ('Row ' + (ticket.seat_row + 1) + ' · ' + (SEAT_COLS[ticket.seat_col] || ticket.seat_col)) : '—';
        var shortId   = ticket.ticket_id ? ticket.ticket_id.slice(0, 8).toUpperCase() : '—';
        var trainName = (ticket.train && (ticket.train.name || ticket.train.train_id)) || '—';
        var trainNo   = (ticket.train && ticket.train.train_no) || '';
        var traveling = isToday(ticket.date_of_travel);

        return (
          <div key={ticket.ticket_id} style={s.card}>
            <div style={s.accentBar} />
            <div style={s.body}>
              <div style={s.routeRow}>
                <div style={s.city}>{(ticket.source || '—').toUpperCase()}</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', margin: '0 12px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(99,102,241,0.3)' }} />
                  <span style={{ fontSize: '1.1rem' }}>🚆</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(99,102,241,0.3)' }} />
                </div>
                <div style={s.city}>{(ticket.destination || '—').toUpperCase()}</div>
              </div>

              <div style={s.meta}>
                <MetaItem label="Train"     value={trainName + (trainNo ? ' #' + trainNo : '')} />
                <MetaItem label="Date"      value={fmtDate(ticket.date_of_travel)} />
                <MetaItem label="Seat"      value={seatLabel} highlight />
                <MetaItem label="Ticket ID" value={'#' + shortId} mono />
              </div>
            </div>

            <div style={s.actions}>
              <div style={s.badge}>Confirmed</div>

              {traveling && ticket.train && (
                <button style={s.journeyBtn} onClick={function() { openJourney(ticket); }} title="WindowAI — Live journey">
                  🛰️ Live
                </button>
              )}

              <button style={s.cancelBtn}
                onClick={function() { handleCancel(ticket.ticket_id); }}
                disabled={cancelling === ticket.ticket_id}>
                {cancelling === ticket.ticket_id ? '…' : 'Cancel'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

var MetaItem = function({ label, value, highlight, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ fontSize: '0.66rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '0.84rem', color: highlight ? '#818cf8' : '#cbd5e1', fontWeight: highlight ? '700' : '500', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  );
};

const s = {
  card:      { display: 'flex', flexDirection: 'column', background: '#0d1220', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', overflow: 'hidden' },
  accentBar: { height: '3px', width: '100%', background: 'linear-gradient(90deg,#6366f1,#818cf8)' },
  body:      { flex: 1, padding: '16px 18px 14px' },
  actions:   { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '10px 18px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' },
  routeRow:  { display: 'flex', alignItems: 'center', marginBottom: '12px', minWidth: 0 },
  city:      { fontSize: '1rem', fontWeight: '800', color: '#f1f5f9', letterSpacing: '0.02em', wordBreak: 'break-word' },
  meta:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '10px' },
  badge:     { background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderRadius: '20px', padding: '4px 12px', fontSize: '0.68rem', fontWeight: '700', whiteSpace: 'nowrap' },
  journeyBtn:{ padding: '7px 14px', background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: '700', whiteSpace: 'nowrap' },
  cancelBtn: { padding: '7px 14px', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', borderRadius: '8px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: '600', whiteSpace: 'nowrap' },
};

export default BookingList;
