import React, { useState, useEffect, useCallback } from 'react';
import {
  adminGetUsers, adminGetBookings, adminGetTrains, adminDeleteTrain, adminSetUserRole,
  adminDeleteUser, adminResetPassword, adminSuspendUser, adminCancelBooking,
  adminGetRevenue, adminSetTrainStatus, adminSaveTrain,
  adminGetAnnouncements, adminCreateAnnouncement, adminToggleAnnouncement, adminDeleteAnnouncement,
  adminGetPromoCodes, adminCreatePromoCode, adminDeletePromoCode,
} from '../services/trainService';

/* ── helpers ── */
var fmt = function(n) { return '$' + Number(n).toLocaleString(); };
// eslint-disable-next-line no-unused-vars
var pct = function(b,t) { return t === 0 ? 0 : Math.round(b*100/t); };

/* ── tiny shared components ── */
var Badge = function({ text, color }) {
  var colors = { green:'rgba(5,150,105,0.10)', red:'rgba(220,38,38,0.10)', amber:'rgba(217,119,6,0.10)', indigo:'rgba(99,102,241,0.10)', gray:'rgba(0,0,0,0.06)' };
  var texts  = { green:'#059669', red:'#dc2626', amber:'#d97706', indigo:'#4f46e5', gray:'#64748b' };
  return <span style={{ background:colors[color]||colors.gray, color:texts[color]||texts.gray, borderRadius:'20px', padding:'3px 10px', fontSize:'0.68rem', fontWeight:'700', whiteSpace:'nowrap' }}>{text}</span>;
};

var Card = function({ children, style }) {
  return <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'14px', padding:'20px', boxShadow:'0 1px 6px rgba(0,0,0,0.04)', ...style }}>{children}</div>;
};

var Th = function({ children }) {
  return <th style={{ padding:'10px 14px', textAlign:'left', fontSize:'0.65rem', fontWeight:'700', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid rgba(0,0,0,0.07)', whiteSpace:'nowrap' }}>{children}</th>;
};
var Td = function({ children, style }) {
  return <td style={{ padding:'12px 14px', fontSize:'0.84rem', color:'#334155', borderBottom:'1px solid rgba(0,0,0,0.05)', ...style }}>{children}</td>;
};

var MiniBar = function({ value, max, color }) {
  var w = max === 0 ? 0 : Math.min(100, Math.round(value*100/max));
  return (
    <div style={{ height:'6px', borderRadius:'3px', background:'rgba(0,0,0,0.08)', overflow:'hidden', marginTop:'4px' }}>
      <div style={{ height:'100%', width:w+'%', background:color||'#6366f1', borderRadius:'3px', transition:'width 0.6s ease' }} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  TAB: OVERVIEW / REVENUE                                           */
/* ═══════════════════════════════════════════════════════════════════ */
var FC_COLORS = { ECONOMY:'#059669', BUSINESS:'#4f46e5', FIRST:'#d97706' };

var OverviewTab = function() {
  var [stats, setStats] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    adminGetRevenue().then(setStats).finally(function() { setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'60px', color:'#475569' }}>Loading analytics…</div>;
  if (!stats)  return <div style={{ color:'#dc2626', padding:'20px' }}>Failed to load stats.</div>;

  var revenueEntries = Object.entries(stats.revenueByTrain || {}).filter(function(e){ return e[1]>0; });
  var maxRev = Math.max(...revenueEntries.map(function(e) { return e[1]; }), 1);
  var days   = Object.entries(stats.bookingsPerDay || {});
  var maxDay = Math.max(...days.map(function(e) { return e[1]; }), 1);

  // Fare class totals
  var fcRev    = stats.revenueByFareClass    || {};
  var fcCount  = stats.bookingsByFareClass   || {};
  var totalFcRev = Object.values(fcRev).reduce(function(a,v){return a+v;},0) || 1;

  // Promo stats
  var promoStats = (stats.promoStats || []).filter(function(p){ return p.usedCount > 0; })
    .sort(function(a,b){ return b.usedCount - a.usedCount; });

  // Waitlist
  var wlByTrain = Object.entries(stats.waitlistByTrain || {}).sort(function(a,b){ return b[1]-a[1]; });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

      {/* ── KPI row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:'14px' }}>
        {[
          { label:'Total Revenue',     value: fmt(stats.totalRevenue),     color:'#f59e0b', icon:'💰' },
          { label:'Discounts Given',   value: fmt(stats.discountTotal||0), color:'#dc2626', icon:'🏷️' },
          { label:'Total Bookings',    value: stats.totalBookings,         color:'#6366f1', icon:'🎫' },
          { label:'Upcoming Trips',    value: stats.upcomingBookings||0,   color:'#10b981', icon:'🚆' },
          { label:'Past Trips',        value: stats.pastBookings,          color:'#94a3b8', icon:'📋' },
          { label:'Registered Users',  value: stats.totalUsers,            color:'#059669', icon:'👥' },
          { label:'Active Trains',     value: stats.totalTrains,           color:'#0f172a', icon:'🛤️' },
          { label:'On Waitlist',       value: stats.waitlistTotal||0,      color:'#fbbf24', icon:'⏳' },
        ].map(function(k) {
          return (
            <Card key={k.label} style={{ padding:'16px' }}>
              <div style={{ fontSize:'1.3rem', marginBottom:'6px' }}>{k.icon}</div>
              <div style={{ fontSize:'1.45rem', fontWeight:'900', color:k.color }}>{k.value}</div>
              <div style={{ fontSize:'0.68rem', color:'#475569', marginTop:'3px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
            </Card>
          );
        })}
      </div>

      {/* ── Revenue by fare class ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
        <Card>
          <div style={{ fontSize:'0.65rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'16px' }}>💺 Revenue by Fare Class</div>
          {['ECONOMY','BUSINESS','FIRST'].map(function(fc) {
            var rev   = fcRev[fc]   || 0;
            var count = fcCount[fc] || 0;
            var w     = Math.round(rev * 100 / totalFcRev);
            return (
              <div key={fc} style={{ marginBottom:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ fontSize:'0.82rem', color:FC_COLORS[fc], fontWeight:'700' }}>{fc}</span>
                  <span style={{ fontSize:'0.8rem', color:'#0f172a' }}>{fmt(rev)} · <span style={{ color:'#64748b' }}>{count} seat{count!==1?'s':''}</span></span>
                </div>
                <div style={{ height:'8px', borderRadius:'4px', background:'rgba(0,0,0,0.08)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:w+'%', background:FC_COLORS[fc], borderRadius:'4px', transition:'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </Card>

        {/* Bookings per day */}
        <Card>
          <div style={{ fontSize:'0.65rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>📅 Bookings by Travel Date (7-day)</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {days.map(function(e) {
              return (
                <div key={e[0]}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <span style={{ fontSize:'0.78rem', color:'#94a3b8' }}>{e[0]}</span>
                    <span style={{ fontSize:'0.78rem', color:'#818cf8', fontWeight:'700' }}>{e[1]}</span>
                  </div>
                  <MiniBar value={e[1]} max={maxDay} color="#6366f1" />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Revenue by train + Top Passengers ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
        <Card>
          <div style={{ fontSize:'0.65rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>🚆 Revenue by Train</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', maxHeight:'260px', overflowY:'auto' }}>
            {revenueEntries.sort(function(a,b) { return b[1]-a[1]; }).map(function(e) {
              return (
                <div key={e[0]}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <span style={{ fontSize:'0.8rem', color:'#0f172a', fontWeight:'600' }}>{stats.trainNames[e[0]] || e[0]}</span>
                    <span style={{ fontSize:'0.8rem', color:'#f59e0b', fontWeight:'700' }}>{fmt(e[1])}</span>
                  </div>
                  <MiniBar value={e[1]} max={maxRev} color="#f59e0b" />
                </div>
              );
            })}
            {revenueEntries.length === 0 && <div style={{ color:'#475569', fontSize:'0.82rem' }}>No revenue yet.</div>}
          </div>
        </Card>

        {/* Top passengers */}
        <Card>
          <div style={{ fontSize:'0.65rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>👑 Top Passengers by Spend</div>
          {(stats.topPassengers || []).length === 0
            ? <div style={{ color:'#475569', fontSize:'0.82rem' }}>No bookings yet.</div>
            : (stats.topPassengers || []).map(function(p, i) {
              var medals = ['🥇','🥈','🥉'];
              return (
                <div key={p.userId} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize:'1.1rem', minWidth:'24px' }}>{medals[i] || '🎖️'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ color:'#0f172a', fontWeight:'700', fontSize:'0.88rem' }}>{p.name}</div>
                    <div style={{ color:'#64748b', fontSize:'0.72rem' }}>{p.bookingCount} booking{p.bookingCount!==1?'s':''}</div>
                  </div>
                  <span style={{ color:'#f59e0b', fontWeight:'800', fontSize:'0.9rem' }}>{fmt(p.totalSpend)}</span>
                </div>
              );
            })
          }
        </Card>
      </div>

      {/* ── Promo code impact + Waitlist ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
        <Card>
          <div style={{ fontSize:'0.65rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>🎟️ Promo Code Impact</div>
          {promoStats.length === 0
            ? <div style={{ color:'#475569', fontSize:'0.82rem' }}>No promo codes used yet.</div>
            : promoStats.map(function(p) {
              var usePct = p.maxUses > 0 ? Math.round(p.usedCount * 100 / p.maxUses) : 0;
              return (
                <div key={p.code} style={{ marginBottom:'14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <span style={{ fontFamily:'monospace', fontWeight:'800', color:'#d97706', fontSize:'0.9rem' }}>{p.code}</span>
                    <span style={{ fontSize:'0.75rem', color:'#94a3b8' }}>{p.usedCount}/{p.maxUses} uses · <span style={{ color:'#10b981' }}>{p.discountPct}% off</span></span>
                  </div>
                  <MiniBar value={p.usedCount} max={p.maxUses} color={usePct >= 90 ? '#dc2626' : '#d97706'} />
                </div>
              );
            })
          }
          {stats.discountTotal > 0 && (
            <div style={{ marginTop:'12px', paddingTop:'10px', borderTop:'1px solid rgba(0,0,0,0.07)', display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}>
              <span style={{ color:'#64748b' }}>Total discount given</span>
              <span style={{ color:'#dc2626', fontWeight:'700' }}>{fmt(stats.discountTotal||0)}</span>
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize:'0.65rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>⏳ Waitlist by Train</div>
          {wlByTrain.length === 0
            ? <div style={{ color:'#475569', fontSize:'0.82rem' }}>No one on waitlist.</div>
            : wlByTrain.map(function(e) {
              return (
                <div key={e[0]} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'0.85rem' }}>
                  <span style={{ color:'#0f172a', fontWeight:'600' }}>{stats.trainNames[e[0]] || e[0]}</span>
                  <span style={{ background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)', color:'#fbbf24', borderRadius:'12px', padding:'2px 10px', fontWeight:'700', fontSize:'0.78rem' }}>{e[1]} waiting</span>
                </div>
              );
            })
          }
          <div style={{ marginTop:'10px', paddingTop:'8px', borderTop:'1px solid rgba(0,0,0,0.07)', display:'flex', justifyContent:'space-between', fontSize:'0.8rem' }}>
            <span style={{ color:'#64748b' }}>Total on waitlist</span>
            <span style={{ color:'#fbbf24', fontWeight:'700' }}>{stats.waitlistTotal||0}</span>
          </div>
        </Card>
      </div>

      {/* ── Seat Occupancy ── */}
      <Card>
        <div style={{ fontSize:'0.65rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>📊 Seat Occupancy by Train</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              <Th>Train</Th><Th>Booked</Th><Th>Total</Th><Th>Occupancy</Th>
            </tr></thead>
            <tbody>
              {Object.entries(stats.occupancy || {}).map(function(e) {
                var o = e[1];
                var color = o.pct >= 80 ? '#dc2626' : o.pct >= 50 ? '#d97706' : '#059669';
                return (
                  <tr key={e[0]}>
                    <Td><span style={{ fontWeight:'700', color:'#0f172a' }}>{stats.trainNames[e[0]] || e[0]}</span></Td>
                    <Td>{o.booked}</Td>
                    <Td>{o.total}</Td>
                    <Td>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ color, fontWeight:'700', minWidth:'36px' }}>{o.pct}%</span>
                        <div style={{ flex:1, height:'6px', borderRadius:'3px', background:'rgba(0,0,0,0.08)', overflow:'hidden', minWidth:'80px' }}>
                          <div style={{ height:'100%', width:o.pct+'%', background:color, borderRadius:'3px' }} />
                        </div>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  TAB: USERS                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
var UsersTab = function() {
  var [users, setUsers]       = useState([]);
  var [bookings, setBookings] = useState([]);
  var [loading, setLoading]   = useState(true);
  var [editUser, setEditUser] = useState(null);
  var [newPwd, setNewPwd]     = useState('');
  var [search, setSearch]     = useState('');
  var [msg, setMsg]           = useState('');

  var load = useCallback(function() {
    Promise.all([adminGetUsers(), adminGetBookings()]).then(function(r) {
      setUsers(r[0]); setBookings(r[1]); setLoading(false);
    });
  }, []);
  useEffect(function() { load(); }, [load]);

  var flash = function(m) { setMsg(m); setTimeout(function() { setMsg(''); }, 2500); };

  var spendByUser = {};
  bookings.forEach(function(b) {
    var uid = b.user_id || b.userId;
    var price = b.train ? b.train.price_per_seat : 0;
    spendByUser[uid] = (spendByUser[uid] || 0) + price;
  });

  var filtered = users.filter(function(u) {
    var q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || (u.userId||'').toLowerCase().includes(q);
  });

  return (
    <div>
      {msg && <div className="sr-alert" style={{ marginBottom:'14px', background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)', color:'#059669' }}>{msg}</div>}
      <div style={{ display:'flex', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
        <input className="sr-input" placeholder="Search by name or ID…" value={search}
          onChange={function(e) { setSearch(e.target.value); }}
          style={{ flex:'1', minWidth:'200px' }} />
      </div>
      {loading ? <div style={{ color:'#475569', padding:'40px', textAlign:'center' }}>Loading…</div> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><Th>User</Th><Th>Role</Th><Th>Last Login</Th><Th>Bookings</Th><Th>Total Spend</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
              <tbody>
                {filtered.map(function(u) {
                  var bCount = bookings.filter(function(b) { return (b.user_id||b.userId) === u.userId; }).length;
                  var spend  = spendByUser[u.userId] || 0;
                  return (
                    <tr key={u.userId}>
                      <Td>
                        <div style={{ fontWeight:'700', color:'#0f172a' }}>{u.name}</div>
                        <div style={{ fontSize:'0.7rem', color:'#475569', fontFamily:'monospace' }}>#{(u.userId||'').slice(0,8)}</div>
                      </Td>
                      <Td><Badge text={u.role} color={u.role==='ADMIN'?'amber':'indigo'} /></Td>
                      <Td style={{ color:'#64748b', fontSize:'0.78rem' }}>{u.last_login || u.lastLogin || '—'}</Td>
                      <Td style={{ color:'#818cf8', fontWeight:'700' }}>{bCount}</Td>
                      <Td style={{ color:'#f59e0b', fontWeight:'700' }}>{fmt(spend)}</Td>
                      <Td>{u.suspended ? <Badge text="Suspended" color="red" /> : <Badge text="Active" color="green" />}</Td>
                      <Td>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          <button style={btn.sm} onClick={function() { setEditUser(u); setNewPwd(''); }}>Edit</button>
                          <button style={{ ...btn.sm, borderColor:'rgba(217,119,6,0.3)', color:'#d97706' }}
                            onClick={function() {
                              adminSuspendUser(u.userId, !u.suspended).then(function() { flash(u.name + (u.suspended ? ' unsuspended' : ' suspended')); load(); });
                            }}>
                            {u.suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button style={{ ...btn.sm, borderColor:'rgba(220,38,38,0.4)', color:'#dc2626' }}
                            onClick={function() {
                              if (!window.confirm('Delete user ' + u.name + '? All their bookings will also be removed.')) return;
                              adminDeleteUser(u.userId).then(function() { flash('User deleted'); load(); });
                            }}>Delete</button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit panel */}
      {editUser && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.10)', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'420px', boxShadow:'0 4px 24px rgba(0,0,0,0.12)' }}>
            <div style={{ fontWeight:'800', fontSize:'1.1rem', color:'#0f172a', marginBottom:'18px' }}>Edit — {editUser.name}</div>
            <div style={{ marginBottom:'14px' }}>
              <label style={lbl}>Role</label>
              <select className="sr-input" value={editUser.role}
                onChange={function(e) { setEditUser({ ...editUser, role: e.target.value }); }}
                style={{ width:'100%', colorScheme:'light' }}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div style={{ marginBottom:'18px' }}>
              <label style={lbl}>New Password (leave blank to keep)</label>
              <input className="sr-input" placeholder="Enter new password…" value={newPwd}
                onChange={function(e) { setNewPwd(e.target.value); }} style={{ width:'100%', boxSizing:'border-box' }} />
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button className="sr-btn sr-btn-indigo" style={{ flex:1 }} onClick={function() {
                var p1 = adminSetUserRole(editUser.userId, editUser.role);
                var p2 = newPwd.length >= 4 ? adminResetPassword(editUser.userId, newPwd) : Promise.resolve();
                Promise.all([p1, p2]).then(function() { flash('User updated'); setEditUser(null); load(); });
              }}>Save</button>
              <button style={{ ...btn.sm, padding:'10px 18px' }} onClick={function() { setEditUser(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  TAB: BOOKINGS                                                      */
/* ═══════════════════════════════════════════════════════════════════ */
var BookingsTab = function() {
  var [bookings, setBookings] = useState([]);
  var [loading, setLoading]   = useState(true);
  var [search, setSearch]     = useState('');
  var [filter, setFilter]     = useState('all'); // all | upcoming | past
  var [msg, setMsg]           = useState('');
  var today = new Date().toISOString().split('T')[0];

  var load = useCallback(function() {
    adminGetBookings().then(function(d) { setBookings(d); setLoading(false); });
  }, []);
  useEffect(function() { load(); }, [load]);

  var flash = function(m) { setMsg(m); setTimeout(function() { setMsg(''); }, 2500); };

  var filtered = bookings.filter(function(b) {
    var q = search.toLowerCase();
    var matchSearch = !q
      || (b.ticket_id||'').toLowerCase().includes(q)
      || (b.user_id||b.userId||'').toLowerCase().includes(q)
      || (b.source||'').toLowerCase().includes(q)
      || (b.destination||'').toLowerCase().includes(q)
      || (b.train && (b.train.name||'').toLowerCase().includes(q));
    var matchFilter = filter === 'all'
      || (filter === 'upcoming' && (b.date_of_travel||b.dateOfTravel) >= today)
      || (filter === 'past'     && (b.date_of_travel||b.dateOfTravel) <  today);
    return matchSearch && matchFilter;
  });

  var noShowCount = bookings.filter(function(b) { return (b.date_of_travel||b.dateOfTravel) < today; }).length;

  return (
    <div>
      {msg && <div className="sr-alert" style={{ marginBottom:'14px', background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)', color:'#059669' }}>{msg}</div>}

      <div style={{ display:'flex', gap:'12px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
        <input className="sr-input" placeholder="Search ticket ID, user, route, train…" value={search}
          onChange={function(e) { setSearch(e.target.value); }} style={{ flex:1, minWidth:'200px' }} />
        {['all','upcoming','past'].map(function(f) {
          return (
            <button key={f} style={{ ...btn.sm, background: filter===f ? 'rgba(99,102,241,0.08)' : 'transparent', borderColor: filter===f ? 'rgba(99,102,241,0.6)' : 'rgba(0,0,0,0.12)', color: filter===f ? '#4f46e5' : '#64748b', padding:'8px 14px' }}
              onClick={function() { setFilter(f); }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          );
        })}
        <div style={{ fontSize:'0.78rem', color:'#64748b' }}>Past trips: <span style={{ color:'#dc2626', fontWeight:'700' }}>{noShowCount}</span></div>
      </div>

      {loading ? <div style={{ color:'#475569', padding:'40px', textAlign:'center' }}>Loading…</div> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><Th>Ticket ID</Th><Th>User</Th><Th>Train</Th><Th>Route</Th><Th>Seat</Th><Th>Date</Th><Th>Fare</Th><Th>Action</Th></tr></thead>
              <tbody>
                {filtered.map(function(b) {
                  var cols = ['A','B','C','D'];
                  var seatLabel = b.seat_row != null ? ('R'+(b.seat_row+1)+cols[b.seat_col]) : '—';
                  var tDate = b.date_of_travel || b.dateOfTravel || '';
                  var isPast = tDate < today;
                  return (
                    <tr key={b.ticket_id}>
                      <Td style={{ fontFamily:'monospace', fontSize:'0.76rem' }}>#{(b.ticket_id||'').slice(0,8).toUpperCase()}</Td>
                      <Td style={{ fontSize:'0.78rem', color:'#94a3b8' }}>{b.user_id||b.userId||'—'}</Td>
                      <Td><span style={{ fontWeight:'600', color:'#0f172a' }}>{b.train ? b.train.name : '—'}</span></Td>
                      <Td style={{ fontSize:'0.78rem' }}>{b.source} → {b.destination}</Td>
                      <Td><Badge text={seatLabel} color="indigo" /></Td>
                      <Td><span style={{ color: isPast ? '#64748b' : '#059669', fontSize:'0.8rem' }}>{tDate}</span></Td>
                      <Td style={{ color:'#f59e0b', fontWeight:'700' }}>{b.train ? fmt(b.train.price_per_seat) : '—'}</Td>
                      <Td>
                        <button style={{ ...btn.sm, borderColor:'rgba(220,38,38,0.4)', color:'#dc2626' }}
                          onClick={function() {
                            if (!window.confirm('Force-cancel this booking and free the seat?')) return;
                            adminCancelBooking(b.ticket_id).then(function() { flash('Booking cancelled, seat freed'); load(); });
                          }}>Cancel</button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  TAB: TRAINS                                                        */
/* ═══════════════════════════════════════════════════════════════════ */
var TrainsTab = function() {
  var [trains, setTrains]       = useState([]);
  var [loading, setLoading]     = useState(true);
  var [editTrain, setEditTrain] = useState(null);
  var [statusModal, setStatusModal] = useState(null);
  var [msg, setMsg]             = useState('');

  var load = useCallback(function() {
    adminGetTrains().then(function(d) { setTrains(d); setLoading(false); });
  }, []);
  useEffect(function() { load(); }, [load]);

  var flash = function(m) { setMsg(m); setTimeout(function() { setMsg(''); }, 2500); };

  var statusColor = function(s) { return s==='CANCELLED'?'red':s==='DELAYED'?'amber':'green'; };

  return (
    <div>
      {msg && <div className="sr-alert" style={{ marginBottom:'14px', background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)', color:'#059669' }}>{msg}</div>}
      {loading ? <div style={{ color:'#475569', padding:'40px', textAlign:'center' }}>Loading…</div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {trains.map(function(t) {
            var booked = t.seats ? t.seats.reduce(function(acc,r) { return acc+r.filter(function(v){return v===1;}).length; },0) : 0;
            var total  = t.seats ? t.seats.length*4 : 0;
            return (
              <Card key={t.train_id} style={{ display:'flex', flexWrap:'wrap', gap:'16px', alignItems:'center', padding:'16px 20px' }}>
                <div style={{ background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'8px', padding:'4px 10px', fontSize:'0.72rem', fontWeight:'700', color:'#4f46e5', whiteSpace:'nowrap' }}>
                  #{t.train_no || t.train_id}
                </div>
                <div style={{ flex:1, minWidth:'200px' }}>
                  <div style={{ fontWeight:'800', color:'#0f172a' }}>{t.name}</div>
                  <div style={{ fontSize:'0.78rem', color:'#64748b', marginTop:'2px' }}>
                    {(t.stations||[]).join(' → ')}
                  </div>
                </div>
                <div style={{ textAlign:'center', minWidth:'80px' }}>
                  <div style={{ fontSize:'1.1rem', fontWeight:'800', color:'#f59e0b' }}>${t.price_per_seat}</div>
                  <div style={{ fontSize:'0.65rem', color:'#475569' }}>per seat</div>
                </div>
                <div style={{ textAlign:'center', minWidth:'80px' }}>
                  <div style={{ fontSize:'1.1rem', fontWeight:'800', color: booked===total?'#dc2626':'#059669' }}>{booked}/{total}</div>
                  <div style={{ fontSize:'0.65rem', color:'#475569' }}>seats</div>
                  <MiniBar value={booked} max={total} color={booked/total>0.8?'#dc2626':'#10b981'} />
                </div>
                <div style={{ minWidth:'90px' }}>
                  <Badge text={t.status||'ON_TIME'} color={statusColor(t.status||'ON_TIME')} />
                  {t.delay_minutes > 0 && <div style={{ fontSize:'0.68rem', color:'#d97706', marginTop:'2px' }}>+{t.delay_minutes}m delay</div>}
                </div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button style={{ ...btn.sm, borderColor:'rgba(217,119,6,0.3)', color:'#d97706' }}
                    onClick={function() { setStatusModal({ ...t }); }}>Status</button>
                  <button style={btn.sm} onClick={function() { setEditTrain({ ...t }); }}>Edit</button>
                  <button style={{ ...btn.sm, borderColor:'rgba(220,38,38,0.4)', color:'#dc2626' }}
                    onClick={function() {
                      if (!window.confirm('Delete ' + t.name + '?')) return;
                      adminDeleteTrain(t.train_id).then(function() { flash('Train deleted'); load(); });
                    }}>Delete</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status modal */}
      {statusModal && (
        <Modal title={'Set Status — ' + statusModal.name} onClose={function() { setStatusModal(null); }}>
          <div style={{ marginBottom:'12px' }}>
            <label style={lbl}>Status</label>
            <select className="sr-input" value={statusModal.status||'ON_TIME'}
              onChange={function(e) { setStatusModal({ ...statusModal, status: e.target.value }); }}
              style={{ width:'100%', colorScheme:'light' }}>
              <option value="ON_TIME">ON_TIME</option>
              <option value="DELAYED">DELAYED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          {statusModal.status === 'DELAYED' && (
            <div style={{ marginBottom:'12px' }}>
              <label style={lbl}>Delay (minutes)</label>
              <input className="sr-input" type="number" value={statusModal.delay_minutes||0}
                onChange={function(e) { setStatusModal({ ...statusModal, delay_minutes: parseInt(e.target.value)||0 }); }}
                style={{ width:'100%', boxSizing:'border-box' }} />
            </div>
          )}
          <div style={{ marginBottom:'18px' }}>
            <label style={lbl}>Reason (optional)</label>
            <input className="sr-input" placeholder="e.g. Track maintenance" value={statusModal.status_reason||''}
              onChange={function(e) { setStatusModal({ ...statusModal, status_reason: e.target.value }); }}
              style={{ width:'100%', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button className="sr-btn sr-btn-gold" style={{ flex:1 }} onClick={function() {
              adminSetTrainStatus(statusModal.train_id, statusModal.status||'ON_TIME', statusModal.delay_minutes||0, statusModal.status_reason||'')
                .then(function() { flash('Status updated'); setStatusModal(null); load(); });
            }}>Save</button>
            <button style={{ ...btn.sm, padding:'10px 18px' }} onClick={function() { setStatusModal(null); }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Edit train modal */}
      {editTrain && (
        <Modal title={'Edit Train — ' + editTrain.name} onClose={function() { setEditTrain(null); }}>
          {['name','price_per_seat'].map(function(field) {
            return (
              <div key={field} style={{ marginBottom:'12px' }}>
                <label style={lbl}>{field === 'price_per_seat' ? 'Price per Seat ($)' : 'Train Name'}</label>
                <input className="sr-input" value={editTrain[field]||''}
                  onChange={function(e) { setEditTrain({ ...editTrain, [field]: e.target.value }); }}
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
            );
          })}
          <div style={{ display:'flex', gap:'10px', marginTop:'6px' }}>
            <button className="sr-btn sr-btn-indigo" style={{ flex:1 }} onClick={function() {
              adminSaveTrain({ ...editTrain, price_per_seat: parseInt(editTrain.price_per_seat)||editTrain.price_per_seat })
                .then(function() { flash('Train updated'); setEditTrain(null); load(); });
            }}>Save</button>
            <button style={{ ...btn.sm, padding:'10px 18px' }} onClick={function() { setEditTrain(null); }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  TAB: ANNOUNCEMENTS                                                  */
/* ═══════════════════════════════════════════════════════════════════ */
var AnnouncementsTab = function() {
  var [list, setList]       = useState([]);
  var [msg, setMsg]         = useState('');
  var [newMsg, setNewMsg]   = useState('');
  var [newType, setNewType] = useState('INFO');
  var [loading, setLoading] = useState(true);

  var load = useCallback(function() {
    adminGetAnnouncements().then(function(d) { setList(d); setLoading(false); });
  }, []);
  useEffect(function() { load(); }, [load]);

  var flash = function(m) { setMsg(m); setTimeout(function() { setMsg(''); }, 2500); };
  var typeColor = function(t) { return t==='ALERT'?'red':t==='WARNING'?'amber':'indigo'; };

  return (
    <div>
      {msg && <div className="sr-alert" style={{ marginBottom:'14px', background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)', color:'#059669' }}>{msg}</div>}
      <Card style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'0.65rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>📢 New Announcement</div>
        <textarea className="sr-input" rows={3} placeholder="Message to broadcast to all users…" value={newMsg}
          onChange={function(e) { setNewMsg(e.target.value); }}
          style={{ width:'100%', boxSizing:'border-box', resize:'vertical', marginBottom:'10px' }} />
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          <select className="sr-input" value={newType} onChange={function(e) { setNewType(e.target.value); }}
            style={{ flex:'0 0 130px', colorScheme:'light' }}>
            <option value="INFO">ℹ️ INFO</option>
            <option value="WARNING">⚠️ WARNING</option>
            <option value="ALERT">🚨 ALERT</option>
          </select>
          <button className="sr-btn sr-btn-gold" onClick={function() {
            if (!newMsg.trim()) return;
            adminCreateAnnouncement(newMsg.trim(), newType).then(function() { flash('Announcement published'); setNewMsg(''); load(); });
          }}>Publish</button>
        </div>
      </Card>

      {loading ? <div style={{ color:'#475569', textAlign:'center', padding:'40px' }}>Loading…</div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {list.length === 0 && <div style={{ color:'#475569', textAlign:'center', padding:'40px' }}>No announcements yet.</div>}
          {list.map(function(a) {
            return (
              <Card key={a.id} style={{ display:'flex', gap:'14px', alignItems:'flex-start', padding:'16px 18px', opacity: a.active ? 1 : 0.5 }}>
                <Badge text={a.type} color={typeColor(a.type)} />
                <div style={{ flex:1 }}>
                  <div style={{ color:'#0f172a', fontSize:'0.9rem', lineHeight:1.5 }}>{a.message}</div>
                  <div style={{ fontSize:'0.7rem', color:'#475569', marginTop:'4px' }}>{a.created_at || a.createdAt}</div>
                </div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button style={{ ...btn.sm, borderColor: a.active ? 'rgba(220,38,38,0.3)' : 'rgba(5,150,105,0.3)', color: a.active ? '#dc2626' : '#059669' }}
                    onClick={function() {
                      adminToggleAnnouncement(a.id, !a.active).then(function() { flash(a.active ? 'Deactivated' : 'Activated'); load(); });
                    }}>{a.active ? 'Deactivate' : 'Activate'}</button>
                  <button style={{ ...btn.sm, borderColor:'rgba(220,38,38,0.3)', color:'#dc2626' }}
                    onClick={function() {
                      if (!window.confirm('Delete this announcement?')) return;
                      adminDeleteAnnouncement(a.id).then(function() { flash('Deleted'); load(); });
                    }}>Delete</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  TAB: PROMO CODES                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
var PromoTab = function() {
  var [codes, setCodes]   = useState([]);
  var [loading, setLoading] = useState(true);
  var [msg, setMsg]       = useState('');
  var [form, setForm]     = useState({ code:'', discountPercent:10, maxUses:100, expiresAt:'' });

  var load = useCallback(function() {
    adminGetPromoCodes().then(function(d) { setCodes(d); setLoading(false); });
  }, []);
  useEffect(function() { load(); }, [load]);

  var flash = function(m) { setMsg(m); setTimeout(function() { setMsg(''); }, 2500); };

  return (
    <div>
      {msg && <div className="sr-alert" style={{ marginBottom:'14px', background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)', color:'#059669' }}>{msg}</div>}
      <Card style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'0.65rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>🎟️ Create Promo Code</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'12px', marginBottom:'12px' }}>
          <div>
            <label style={lbl}>Code</label>
            <input className="sr-input" placeholder="SUMMER10" value={form.code}
              onChange={function(e) { setForm({ ...form, code: e.target.value.toUpperCase() }); }}
              style={{ width:'100%', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={lbl}>Discount %</label>
            <input className="sr-input" type="number" min="1" max="100" value={form.discountPercent}
              onChange={function(e) { setForm({ ...form, discountPercent: parseInt(e.target.value)||10 }); }}
              style={{ width:'100%', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={lbl}>Max Uses</label>
            <input className="sr-input" type="number" min="1" value={form.maxUses}
              onChange={function(e) { setForm({ ...form, maxUses: parseInt(e.target.value)||100 }); }}
              style={{ width:'100%', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={lbl}>Expires (optional)</label>
            <input className="sr-input" type="date" value={form.expiresAt}
              onChange={function(e) { setForm({ ...form, expiresAt: e.target.value }); }}
              style={{ width:'100%', boxSizing:'border-box', colorScheme:'light' }} />
          </div>
        </div>
        <button className="sr-btn sr-btn-gold" onClick={function() {
          if (!form.code.trim()) return;
          adminCreatePromoCode(form.code, form.discountPercent, form.maxUses, form.expiresAt||null)
            .then(function() { flash('Promo code created'); setForm({ code:'', discountPercent:10, maxUses:100, expiresAt:'' }); load(); })
            .catch(function() { flash('Code may already exist'); });
        }}>Create Code</button>
      </Card>

      {loading ? <div style={{ color:'#475569', textAlign:'center', padding:'40px' }}>Loading…</div> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><Th>Code</Th><Th>Discount</Th><Th>Used / Max</Th><Th>Expires</Th><Th>Status</Th><Th>Action</Th></tr></thead>
              <tbody>
                {codes.length === 0 && <tr><Td colSpan={6} style={{ textAlign:'center', color:'#475569' }}>No promo codes yet.</Td></tr>}
                {codes.map(function(c) {
                  var exhausted = c.used_count >= c.max_uses;
                  var expired   = c.expires_at && c.expires_at < new Date().toISOString().split('T')[0];
                  return (
                    <tr key={c.code}>
                      <Td><span style={{ fontFamily:'monospace', fontWeight:'800', color:'#d97706', fontSize:'1rem' }}>{c.code}</span></Td>
                      <Td><span style={{ fontWeight:'800', color:'#10b981', fontSize:'1rem' }}>{c.discount_percent}%</span></Td>
                      <Td>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ color: exhausted?'#dc2626':'#0f172a' }}>{c.used_count} / {c.max_uses}</span>
                          <MiniBar value={c.used_count} max={c.max_uses} color={exhausted?'#dc2626':'#6366f1'} />
                        </div>
                      </Td>
                      <Td style={{ color: expired?'#dc2626':'#94a3b8' }}>{c.expires_at || '—'}</Td>
                      <Td>{exhausted || expired ? <Badge text={exhausted?'Exhausted':'Expired'} color="red" /> : <Badge text="Active" color="green" />}</Td>
                      <Td>
                        <button style={{ ...btn.sm, borderColor:'rgba(220,38,38,0.4)', color:'#dc2626' }}
                          onClick={function() {
                            if (!window.confirm('Delete promo code ' + c.code + '?')) return;
                            adminDeletePromoCode(c.code).then(function() { flash('Deleted'); load(); });
                          }}>Delete</button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  SHARED MODAL WRAPPER                                               */
/* ═══════════════════════════════════════════════════════════════════ */
var Modal = function({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
      <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.10)', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'460px', boxShadow:'0 8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
          <div style={{ fontWeight:'800', fontSize:'1.05rem', color:'#0f172a' }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'1.2rem', lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ── shared styles ── */
var btn = {
  sm: { padding:'6px 12px', background:'transparent', border:'1px solid rgba(0,0,0,0.12)', color:'#64748b', borderRadius:'7px', cursor:'pointer', fontSize:'0.75rem', fontWeight:'600', fontFamily:'inherit', whiteSpace:'nowrap' },
};
var lbl = { display:'block', fontSize:'0.68rem', fontWeight:'700', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' };

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN AdminPage                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
var TABS = [
  { id:'overview',      label:'📊 Overview',      component: OverviewTab },
  { id:'users',         label:'👥 Users',          component: UsersTab },
  { id:'bookings',      label:'🎫 Bookings',       component: BookingsTab },
  { id:'trains',        label:'🚆 Trains',         component: TrainsTab },
  { id:'announcements', label:'📢 Announcements',  component: AnnouncementsTab },
  { id:'promo',         label:'🎟️ Promo Codes',   component: PromoTab },
];

const AdminPage = function() {
  var [tab, setTab] = useState('overview');
  var current = TABS.find(function(t) { return t.id === tab; });
  var TabComponent = current ? current.component : OverviewTab;

  return (
    <div style={{ background:'#f0f4ff', minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ background:'rgba(255,255,255,0.95)', borderBottom:'1px solid rgba(0,0,0,0.07)', padding:'20px 28px', backdropFilter:'blur(8px)' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'20px', padding:'3px 12px', marginBottom:'10px' }}>
            <span style={{ fontSize:'0.62rem', fontWeight:'700', color:'#d97706', textTransform:'uppercase', letterSpacing:'0.1em' }}>⚙️ Admin Console</span>
          </div>
          <h1 style={{ color:'#0f172a', fontSize:'1.8rem', fontWeight:'900', margin:'0 0 4px' }}>TrackNova Admin</h1>
          <p style={{ color:'#64748b', margin:0, fontSize:'0.88rem' }}>Full control — users, bookings, trains, announcements, promo codes.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background:'rgba(255,255,255,0.9)', borderBottom:'1px solid rgba(0,0,0,0.07)', padding:'0 28px', overflowX:'auto' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', display:'flex', gap:'2px' }}>
          {TABS.map(function(t) {
            var active = tab === t.id;
            return (
              <button key={t.id} onClick={function() { setTab(t.id); }}
                style={{ padding:'14px 18px', background: active ? 'rgba(99,102,241,0.08)' : 'transparent',
                  borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
                  border:'none', borderRadius:'0', color: active ? '#4f46e5' : '#64748b',
                  cursor:'pointer', fontSize:'0.82rem', fontWeight: active ? '700' : '500',
                  fontFamily:'inherit', whiteSpace:'nowrap', transition:'all 0.15s' }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'24px 28px 60px' }}>
        <TabComponent />
      </div>
    </div>
  );
};

export default AdminPage;
