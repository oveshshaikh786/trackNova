import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBookings, cancelBooking, getWaitlist, cancelWaitlist } from '../services/trainService';
import { getCurrentUser } from '../services/authService';

var COLS = ['A','B','C','D'];
var TABS = ['Tickets','Waitlist'];

function classColor(cls) {
  if (!cls) return '#059669';
  if (cls.toUpperCase()==='FIRST')    return '#d97706';
  if (cls.toUpperCase()==='BUSINESS') return '#4f46e5';
  return '#059669';
}

function getFareClass(row) {
  if (row >= 9) return 'FIRST';
  if (row >= 6) return 'BUSINESS';
  return 'ECONOMY';
}

export default function BookingsPage() {
  var navigate = useNavigate();
  var user     = getCurrentUser();

  var [tab,         setTab]         = useState('Tickets');
  var [tickets,     setTickets]     = useState([]);
  var [waitlist,    setWaitlist]    = useState([]);
  var [loading,     setLoading]     = useState(true);
  var [query,       setQuery]       = useState('');
  var [filterFC,    setFilterFC]    = useState('ALL');
  var [filterTrip,  setFilterTrip]  = useState('ALL');
  var [cancelling,  setCancelling]  = useState(null);
  var [sortDir,     setSortDir]     = useState('desc'); // 'desc' = newest first
  var [error,       setError]       = useState(null);

  var userId = user?.userId;

  var loadAll = useCallback(async function() {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      var [t, w] = await Promise.all([
        fetchBookings(userId),
        getWaitlist(userId),
      ]);
      setTickets(Array.isArray(t) ? t : []);
      setWaitlist(Array.isArray(w) ? w : []);
    } catch(e) {
      console.error('BookingsPage load error:', e);
      setError(e?.response?.data?.message || e?.message || 'Failed to load bookings.');
      setTickets([]);
      setWaitlist([]);
    }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(function() { loadAll(); }, [loadAll]);

  function matches(t) {
    if (filterFC !== 'ALL') {
      var cls = t.fare_class || t.fareClass || getFareClass(t.seat_row ?? t.seatRow ?? 0);
      if (cls.toUpperCase() !== filterFC) return false;
    }
    if (filterTrip !== 'ALL') {
      var tt = (t.trip_type || t.tripType || 'OUTBOUND').toUpperCase();
      if (tt !== filterTrip) return false;
    }
    if (query.trim()) {
      var q = query.toLowerCase();
      var trainName = t.train?.name || '';
      var route = (t.source||'') + ' ' + (t.destination||'');
      var d = t.date_of_travel || t.dateOfTravel || '';
      if (!trainName.toLowerCase().includes(q) && !route.toLowerCase().includes(q) && !d.includes(q)) return false;
    }
    return true;
  }

  var hasActiveFilters = query.trim() || filterFC !== 'ALL' || filterTrip !== 'ALL';

  function clearFilters() {
    setQuery('');
    setFilterFC('ALL');
    setFilterTrip('ALL');
  }

  // Deduplicate by ticketId (guards against double-render of duplicate rows)
  var seen = new Set();
  var filtered = tickets
    .filter(function(t) {
      var id = t.ticket_id || t.ticketId;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .filter(matches)
    .slice()
    .sort(function(a, b) {
      var da = a.date_of_travel || a.dateOfTravel || '';
      var db = b.date_of_travel || b.dateOfTravel || '';
      return sortDir === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
    });

  async function handleCancel(ticketId) {
    if (!window.confirm('Cancel this booking?')) return;
    setCancelling(ticketId);
    try {
      await cancelBooking(ticketId, userId);
      setTickets(function(prev){ return prev.filter(function(t){ return (t.ticket_id||t.ticketId)!==ticketId; }); });
    } catch(e) { alert('Could not cancel.'); }
    finally { setCancelling(null); }
  }

  async function handleCancelWaitlist(entryId) {
    if (!window.confirm('Leave waitlist?')) return;
    setCancelling(entryId);
    try {
      await cancelWaitlist(entryId, userId);
      setWaitlist(function(prev){ return prev.filter(function(e){ return e.id!==entryId; }); });
    } catch(e) { alert('Could not remove.'); }
    finally { setCancelling(null); }
  }

  var pastCount    = tickets.filter(function(t){ var d=t.date_of_travel||t.dateOfTravel||''; return d && d < new Date().toISOString().split('T')[0]; }).length;
  var upcomingCount= tickets.length - pastCount;
  var totalSpent   = tickets.reduce(function(a,t){ return a+(t.price_paid||t.pricePaid||0); },0);
  var waitingCount = waitlist.filter(function(e){ return e.status==='WAITING'; }).length;

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4ff', padding:'32px 24px', boxSizing:'border-box' }}>
      <div style={{ maxWidth:'860px', margin:'0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ color:'#0f172a', fontWeight:'800', fontSize:'1.6rem', margin:'0 0 4px' }}>My Journeys</h1>
          <p style={{ color:'#64748b', margin:0, fontSize:'0.9rem' }}>Your bookings, waitlist, and travel history</p>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:'12px', marginBottom:'28px', flexWrap:'wrap' }}>
          {[
            { label:'Upcoming', value:upcomingCount, color:'#059669', bg:'rgba(16,185,129,0.07)' },
            { label:'Completed', value:pastCount,    color:'#64748b', bg:'rgba(100,116,139,0.07)' },
            { label:'Waitlists', value:waitingCount, color:'#d97706', bg:'rgba(245,158,11,0.07)'  },
            { label:'Total Spent', value:'$'+totalSpent, color:'#f59e0b', bg:'rgba(245,158,11,0.07)' },
          ].map(function(stat) {
            return <div key={stat.label} style={{ flex:'1 1 100px', background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'12px', padding:'14px 16px', textAlign:'center', boxShadow:'0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ color:stat.color, fontWeight:'800', fontSize:'1.3rem' }}>{stat.value}</div>
              <div style={{ color:'#64748b', fontSize:'0.75rem', marginTop:'2px' }}>{stat.label}</div>
            </div>;
          })}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'4px', background:'rgba(0,0,0,0.04)', borderRadius:'12px', padding:'4px', marginBottom:'20px', width:'fit-content' }}>
          {TABS.map(function(t) {
            var active = tab===t;
            return <button key={t} onClick={function(){setTab(t);}}
              style={{ padding:'8px 20px', borderRadius:'9px', border:'none', background:active?'#ffffff':'transparent', color:active?'#4f46e5':'#64748b', fontWeight:active?'700':'600', fontSize:'0.88rem', cursor:'pointer', transition:'all .2s', boxShadow:active?'0 1px 6px rgba(0,0,0,0.08)':'' }}>{t}
              {t==='Waitlist'&&waitingCount>0&&<span style={{ marginLeft:'6px', background:'#f59e0b', color:'#fff', borderRadius:'10px', padding:'1px 6px', fontSize:'0.72rem', fontWeight:'800' }}>{waitingCount}</span>}
            </button>;
          })}
        </div>

        {/* Tickets tab */}
        {tab==='Tickets' && (
          <>
            {/* Filters */}
            <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap', alignItems:'center' }}>
              <input value={query} onChange={function(e){setQuery(e.target.value);}}
                placeholder="🔍 Search train, route, date…"
                style={{ flex:'1 1 200px', background:'#ffffff', border:'1px solid rgba(0,0,0,0.10)', borderRadius:'10px', padding:'9px 14px', color:'#0f172a', fontSize:'0.88rem', outline:'none' }} />
              <select value={filterFC} onChange={function(e){setFilterFC(e.target.value);}}
                style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.10)', borderRadius:'10px', padding:'9px 12px', color:'#475569', fontSize:'0.88rem', outline:'none', cursor:'pointer' }}>
                <option value="ALL">All Classes</option>
                <option value="ECONOMY">Economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First</option>
              </select>
              <select value={filterTrip} onChange={function(e){setFilterTrip(e.target.value);}}
                style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.10)', borderRadius:'10px', padding:'9px 12px', color:'#475569', fontSize:'0.88rem', outline:'none', cursor:'pointer' }}>
                <option value="ALL">All Trips</option>
                <option value="OUTBOUND">Outbound</option>
                <option value="RETURN">Return</option>
              </select>
              {/* Sort toggle */}
              <button onClick={function(){ setSortDir(function(d){ return d==='desc'?'asc':'desc'; }); }}
                style={{ padding:'9px 14px', background:'#ffffff', border:'1px solid rgba(0,0,0,0.10)', borderRadius:'10px', color:'#475569', fontSize:'0.88rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                {sortDir==='desc' ? '↓ Newest' : '↑ Oldest'}
              </button>
              {/* Clear filters */}
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  style={{ padding:'9px 14px', background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'10px', color:'#dc2626', fontSize:'0.88rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:'12px', padding:'14px 18px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'1.2rem' }}>⚠️</span>
                <div>
                  <div style={{ color:'#dc2626', fontWeight:'700', fontSize:'0.9rem' }}>Could not load bookings</div>
                  <div style={{ color:'#94a3b8', fontSize:'0.82rem', marginTop:'2px' }}>{error}</div>
                </div>
                <button onClick={loadAll} style={{ marginLeft:'auto', padding:'6px 14px', background:'rgba(220,38,38,0.12)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:'8px', color:'#dc2626', fontSize:'0.82rem', cursor:'pointer', fontWeight:'600' }}>Retry</button>
              </div>
            )}

            {loading && <div style={{ textAlign:'center', color:'#94a3b8', padding:'40px 0' }}>Loading…</div>}

            {!loading && !error && filtered.length===0 && (
              <div style={{ textAlign:'center', padding:'60px 0' }}>
                <div style={{ fontSize:'3rem', marginBottom:'12px' }}>🎫</div>
                <p style={{ color:'#64748b' }}>{tickets.length===0 ? "No bookings yet." : "No results match your filters."}</p>
                {tickets.length===0
                  ? <button onClick={function(){navigate('/search');}} style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'10px', color:'#fff', fontWeight:'700', cursor:'pointer', marginTop:'12px' }}>Search Trains</button>
                  : <button onClick={clearFilters} style={{ padding:'10px 24px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.20)', borderRadius:'10px', color:'#4f46e5', fontWeight:'700', cursor:'pointer', marginTop:'12px' }}>Clear Filters</button>
                }
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {filtered.map(function(t) {
                var id        = t.ticket_id || t.ticketId;
                var trainName = t.train?.name || 'Unknown Train';
                var row       = t.seat_row ?? t.seatRow ?? 0;
                var col       = t.seat_col ?? t.seatCol ?? 0;
                var date      = t.date_of_travel || t.dateOfTravel;
                var cls       = (t.fare_class || t.fareClass || getFareClass(row)).toUpperCase();
                var price     = t.price_paid || t.pricePaid || 0;
                var tripType  = (t.trip_type || t.tripType || 'OUTBOUND').toUpperCase();
                var isPast    = date && date < new Date().toISOString().split('T')[0];

                return (
                  <div key={id} style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'14px', overflow:'hidden', opacity:isPast?0.7:1, boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
                    {/* Color strip by class */}
                    <div style={{ height:'3px', background: cls==='FIRST'?'linear-gradient(90deg,#b45309,#d97706)':cls==='BUSINESS'?'linear-gradient(90deg,#4338ca,#4f46e5)':'linear-gradient(90deg,#047857,#059669)' }} />
                    <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                      {/* Train info */}
                      <div style={{ flex:'1 1 180px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px' }}>
                          <span style={{ color:'#0f172a', fontWeight:'700', fontSize:'0.95rem' }}>{trainName}</span>
                          {tripType==='RETURN' && <span style={{ fontSize:'0.68rem', color:'#d97706', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'10px', padding:'1px 6px', fontWeight:'700' }}>RETURN</span>}
                          {isPast && <span style={{ fontSize:'0.68rem', color:'#64748b', background:'rgba(100,116,139,0.08)', border:'1px solid rgba(100,116,139,0.15)', borderRadius:'10px', padding:'1px 6px' }}>Completed</span>}
                        </div>
                        <div style={{ color:'#64748b', fontSize:'0.82rem' }}>{t.source} → {t.destination}</div>
                      </div>
                      {/* Seat */}
                      <div style={{ textAlign:'center', minWidth:'60px' }}>
                        <div style={{ color:'#94a3b8', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>Seat</div>
                        <div style={{ color:'#0f172a', fontWeight:'700', fontSize:'0.95rem' }}>R{row+1}{COLS[col]}</div>
                        <div style={{ color:classColor(cls), fontSize:'0.72rem', fontWeight:'600' }}>{cls}</div>
                      </div>
                      {/* Date */}
                      <div style={{ textAlign:'center', minWidth:'80px' }}>
                        <div style={{ color:'#94a3b8', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>Date</div>
                        <div style={{ color:'#475569', fontWeight:'600', fontSize:'0.88rem' }}>{date}</div>
                      </div>
                      {/* Price */}
                      {price > 0 && (
                        <div style={{ textAlign:'center', minWidth:'50px' }}>
                          <div style={{ color:'#94a3b8', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>Paid</div>
                          <div style={{ color:'#f59e0b', fontWeight:'700' }}>${price}</div>
                        </div>
                      )}
                      {/* Actions */}
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        {!isPast && (
                          <button onClick={function(){
                            var trainId   = t.train?.train_id || t.train?.trainId || '';
                            var trainName = t.train?.name || '';
                            var departure = t.train?.station_times?.[t.source] || t.train?.stationTimes?.[t.source] || '06:00';
                            var travelDate = t.date_of_travel || t.dateOfTravel || '';
                            navigate('/journey?trainId='+encodeURIComponent(trainId)+'&name='+encodeURIComponent(trainName)+'&departure='+encodeURIComponent(departure)+'&from='+encodeURIComponent(t.source||'')+'&to='+encodeURIComponent(t.destination||'')+'&date='+encodeURIComponent(travelDate));
                          }} style={{ padding:'7px 14px', background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'8px', color:'#4f46e5', fontSize:'0.8rem', cursor:'pointer', fontWeight:'600' }}>Track →</button>
                        )}
                        {!isPast && (
                          <button onClick={function(){handleCancel(id);}} disabled={cancelling===id}
                            style={{ padding:'7px 14px', background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'8px', color:'#dc2626', fontSize:'0.8rem', cursor:'pointer', fontWeight:'600' }}>
                            {cancelling===id ? '…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Waitlist tab */}
        {tab==='Waitlist' && (
          <>
            {loading && <div style={{ textAlign:'center', color:'#94a3b8', padding:'40px 0' }}>Loading…</div>}
            {!loading && waitlist.length===0 && (
              <div style={{ textAlign:'center', padding:'60px 0' }}>
                <div style={{ fontSize:'3rem', marginBottom:'12px' }}>⏳</div>
                <p style={{ color:'#64748b' }}>You're not on any waitlists.</p>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {waitlist.map(function(e) {
                var statusColor = e.status==='BOOKED'?'#059669':e.status==='CANCELLED'?'#dc2626':'#d97706';
                return (
                  <div key={e.id} style={{ background:'#ffffff', border:'1px solid rgba(245,158,11,0.20)', borderRadius:'14px', padding:'16px 20px', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ flex:'1 1 180px' }}>
                      <div style={{ color:'#0f172a', fontWeight:'700', fontSize:'0.95rem', marginBottom:'2px' }}>{e.trainId}</div>
                      <div style={{ color:'#64748b', fontSize:'0.82rem' }}>{e.source} → {e.destination} · {e.dateOfTravel}</div>
                    </div>
                    <div style={{ textAlign:'center', minWidth:'70px' }}>
                      <div style={{ color:'#94a3b8', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>Class</div>
                      <div style={{ color:classColor(e.fareClass), fontWeight:'700', fontSize:'0.88rem' }}>{e.fareClass}</div>
                    </div>
                    <span style={{ padding:'4px 12px', borderRadius:'20px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:statusColor, fontSize:'0.78rem', fontWeight:'700' }}>{e.status}</span>
                    {e.status==='WAITING' && (
                      <button onClick={function(){handleCancelWaitlist(e.id);}} disabled={cancelling===e.id}
                        style={{ padding:'7px 14px', background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'8px', color:'#dc2626', fontSize:'0.8rem', cursor:'pointer', fontWeight:'600' }}>
                        {cancelling===e.id?'…':'Leave'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
