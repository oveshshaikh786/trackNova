import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrain, joinWaitlist } from '../services/trainService';
import { getCurrentUser } from '../services/authService';

var CLASS_CFG = {
  ECONOMY:  { rows:[0,1,2,3,4,5], label:'Economy',  icon:'🪑', color:'#059669', bg:'rgba(16,185,129,0.08)',  border:'rgba(16,185,129,0.2)'  },
  BUSINESS: { rows:[6,7,8],       label:'Business', icon:'💼', color:'#4f46e5', bg:'rgba(99,102,241,0.08)',  border:'rgba(99,102,241,0.2)'  },
  FIRST:    { rows:[9],           label:'First',    icon:'👑', color:'#d97706', bg:'rgba(245,158,11,0.08)',  border:'rgba(245,158,11,0.2)'  },
};

function getFareClass(row) {
  if (row >= 9) return 'FIRST';
  if (row >= 6) return 'BUSINESS';
  return 'ECONOMY';
}

export default function SeatBookingPage() {
  var navigate = useNavigate();
  var user     = getCurrentUser();

  var [train,     setTrain]     = useState(null);
  var [meta,      setMeta]      = useState(null);   // cached session data
  var [selected,  setSelected]  = useState([]);     // [{row,col}]
  var [loading,   setLoading]   = useState(true);
  var [error,     setError]     = useState('');
  var [waitlisted,setWaitlisted]= useState(false);
  var [wlLoading, setWlLoading] = useState(false);

  useEffect(function() {
    var stored = sessionStorage.getItem('selectedTrain');
    if (!stored) { navigate('/search'); return; }
    var cached = JSON.parse(stored);
    setMeta(cached);
    var trainId = cached.train_id || cached.trainId;
    getTrain(trainId).then(function(fresh) {
      setTrain({ ...cached, seats: fresh.seats });
    }).catch(function() { setTrain(cached); })
    .finally(function() { setLoading(false); });
  }, [navigate]);

  function toggleSeat(row, col) {
    if (getFareClass(row) !== fareClass) return; // enforce class boundary
    var booked = train.seats[row][col] !== 0;
    if (booked) return;
    setSelected(function(prev) {
      var exists = prev.find(function(s){ return s.row===row && s.col===col; });
      if (exists) return prev.filter(function(s){ return !(s.row===row&&s.col===col); });
      return [...prev, {row, col}];
    });
  }

  function handleContinue() {
    if (selected.length === 0) { setError('Please select at least one seat.'); return; }
    var fareClass = meta?.fareClass || getFareClass(selected[0].row);
    sessionStorage.setItem('bookingSeats', JSON.stringify(selected));
    sessionStorage.setItem('bookingFareClass', fareClass);
    navigate('/payment');
  }

  async function handleWaitlist() {
    if (!user) return;
    setWlLoading(true);
    try {
      var trainId = meta?.train_id || meta?.trainId;
      await joinWaitlist(user.userId, trainId, meta?.source, meta?.destination, meta?.dateOfTravel, meta?.fareClass || 'ECONOMY');
      setWaitlisted(true);
    } catch(e) {
      setError('Could not join waitlist. You may already be on it.');
    } finally { setWlLoading(false); }
  }

  var fareClass    = (meta?.fareClass || 'ECONOMY').toUpperCase();
  var fc           = CLASS_CFG[fareClass] || CLASS_CFG.ECONOMY;
  var classRows    = fc.rows.filter(function(r){ return r < (train?.seats||[]).length; });
  var totalSeats   = classRows.length * 4;
  var bookedSeats  = train?.seats
    ? classRows.reduce(function(sum, r){ return sum + train.seats[r].filter(function(v){return v!==0;}).length; }, 0)
    : 0;
  var availSeats   = totalSeats - bookedSeats;
  var isFull       = availSeats === 0;

  function getPriceForRow(row) {
    var cls = getFareClass(row);
    if (!train) return 0;
    if (cls==='FIRST')    return train.price_first    || train.priceFirst    || Math.round((train.price_per_seat||train.pricePerSeat||0)*3);
    if (cls==='BUSINESS') return train.price_business || train.priceBusiness || Math.round((train.price_per_seat||train.pricePerSeat||0)*1.8);
    return train.price_economy || train.priceEconomy || train.price_per_seat || train.pricePerSeat || 0;
  }

  if (loading) return <div style={{ minHeight:'100vh', background:'#f0f4ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Loading seat map…</div>;
  if (!train)  return <div style={{ minHeight:'100vh', background:'#f0f4ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#dc2626' }}>Train not found.</div>;

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4ff', padding:'32px 24px', boxSizing:'border-box' }}>
      <div style={{ maxWidth:'820px', margin:'0 auto' }}>

        {/* Header */}
        <button onClick={function(){navigate('/search');}} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:'0.9rem', marginBottom:'20px', padding:0, display:'flex', alignItems:'center', gap:'6px' }}>← Back to search</button>

        <div style={{ background:'#ffffff', border:'1px solid rgba(99,102,241,0.15)', borderRadius:'20px', padding:'24px', marginBottom:'24px', boxShadow:'0 2px 16px rgba(99,102,241,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <h1 style={{ color:'#0f172a', fontSize:'1.4rem', fontWeight:'800', margin:'0 0 4px' }}>{train.name}</h1>
              <div style={{ color:'#64748b', fontSize:'0.88rem' }}>{meta?.source} → {meta?.destination} · {meta?.dateOfTravel}</div>
            </div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {/* Fare class badge */}
              <span style={{ padding:'6px 14px', borderRadius:'20px', background:fc.bg, border:'1px solid '+fc.border, color:fc.color, fontSize:'0.82rem', fontWeight:'700' }}>
                {fc.icon} {fc.label}
              </span>
              {/* Availability */}
              <span style={{ padding:'6px 14px', borderRadius:'20px', background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.08)', color:'#64748b', fontSize:'0.82rem' }}>
                {availSeats}/{totalSeats} available
              </span>
            </div>
          </div>

          {meta?.isRoundTrip && (
            <div style={{ marginTop:'12px', padding:'8px 14px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'10px', color:'#d97706', fontSize:'0.82rem', fontWeight:'600' }}>
              🔄 Round Trip — select outbound seat{selected.length>1?'s':''} first, return seats next
            </div>
          )}
        </div>

        {/* Seat map */}
        <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'20px', padding:'28px', marginBottom:'20px', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
          <h2 style={{ color:'#0f172a', fontWeight:'700', fontSize:'1rem', margin:'0 0 20px', textAlign:'center', letterSpacing:'0.05em', textTransform:'uppercase' }}>Select Seat{selected.length!==1?'s':''}</h2>

          {/* Cabin zones — only show the selected fare class */}
          {Object.entries(CLASS_CFG).map(function([clsKey, cfg]) {
            if (clsKey !== fareClass) return null;
            var zoneRows = cfg.rows.filter(function(r){ return r < (train.seats||[]).length; });
            if (zoneRows.length === 0) return null;
            return (
              <div key={clsKey} style={{ marginBottom:'20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', padding:'6px 10px', background:cfg.bg, borderRadius:'8px', border:'1px solid '+cfg.border }}>
                  <span>{cfg.icon}</span>
                  <span style={{ color:cfg.color, fontWeight:'700', fontSize:'0.8rem' }}>{cfg.label} Class</span>
                  <span style={{ color:'#475569', fontSize:'0.75rem' }}>· ${getPriceForRow(zoneRows[0])}/seat</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', alignItems:'center' }}>
                  {zoneRows.map(function(rowIdx) {
                    var row = train.seats[rowIdx];
                    return (
                      <div key={rowIdx} style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                        <span style={{ color:'#475569', fontSize:'0.72rem', width:'20px', textAlign:'right' }}>{rowIdx+1}</span>
                        <div style={{ display:'flex', gap:'6px' }}>
                          {row.map(function(val, colIdx) {
                            var isSel = selected.find(function(s){return s.row===rowIdx&&s.col===colIdx;});
                            var isBooked = val !== 0;
                            var bg, border, cursor;
                            if (isBooked)     { bg='#fef2f2'; border='rgba(248,113,113,0.35)'; cursor='not-allowed'; }
                            else if (isSel)   { bg=cfg.bg.replace('0.1','0.4'); border=cfg.color; cursor='pointer'; }
                            else              { bg='rgba(16,185,129,0.06)'; border='rgba(16,185,129,0.25)'; cursor='pointer'; }
                            return (
                              <button key={colIdx} onClick={function(){toggleSeat(rowIdx,colIdx);}} disabled={isBooked}
                                title={isBooked?'Booked':isSel?'Selected — click to deselect':'Available'}
                                style={{ width:'38px', height:'38px', borderRadius:'8px', border:'1px solid '+border, background:bg, cursor:cursor, transition:'all .15s', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                {isBooked && <span style={{ color:'rgba(248,113,113,0.4)', fontSize:'0.9rem' }}>✕</span>}
                                {isSel    && <span style={{ color:cfg.color, fontSize:'0.9rem' }}>✓</span>}
                                {colIdx === 1 && <div style={{ position:'absolute', right:'-11px', width:'8px', borderBottom:'1px dashed rgba(0,0,0,0.10)' }} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div style={{ display:'flex', gap:'20px', justifyContent:'center', marginTop:'20px', flexWrap:'wrap' }}>
            {[['rgba(16,185,129,0.06)','rgba(16,185,129,0.25)','Available'],['rgba(99,102,241,0.3)','#6366f1','Selected'],['#fef2f2','rgba(248,113,113,0.35)','Booked']].map(function(entry) {
              return <div key={entry[2]} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'16px', height:'16px', borderRadius:'4px', background:entry[0], border:'1px solid '+entry[1] }} />
                <span style={{ color:'#64748b', fontSize:'0.75rem' }}>{entry[2]}</span>
              </div>;
            })}
          </div>
        </div>

        {/* Selection summary */}
        {selected.length > 0 && (
          <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'14px', padding:'16px 20px', marginBottom:'16px' }}>
            <div style={{ color:'#4f46e5', fontWeight:'700', fontSize:'0.9rem', marginBottom:'8px' }}>
              {selected.length} seat{selected.length!==1?'s':''} selected
            </div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {selected.map(function(s) {
                return <span key={s.row+'-'+s.col} style={{ padding:'4px 10px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'20px', color:'#4f46e5', fontSize:'0.8rem' }}>
                  Row {s.row+1} · Seat {s.col+1} ({getFareClass(s.row)})
                </span>;
              })}
            </div>
          </div>
        )}

        {error && <div style={{ color:'#dc2626', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'10px', padding:'10px 16px', marginBottom:'16px', fontSize:'0.88rem' }}>{error}</div>}

        {isFull ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ color:'#dc2626', marginBottom:'12px', fontSize:'0.9rem' }}>This train is fully booked.</div>
            {!waitlisted ? (
              <button onClick={handleWaitlist} disabled={wlLoading}
                style={{ padding:'12px 32px', background:'linear-gradient(135deg,#f59e0b,#d97706)', border:'none', borderRadius:'12px', color:'#000', fontWeight:'800', fontSize:'0.95rem', cursor:wlLoading?'not-allowed':'pointer' }}>
                {wlLoading?'Joining...':'⏳ Join Waitlist'}
              </button>
            ) : (
              <div style={{ color:'#059669', fontWeight:'700' }}>✓ You're on the waitlist!</div>
            )}
          </div>
        ) : (
          <button onClick={handleContinue} disabled={selected.length===0}
            style={{ width:'100%', padding:'14px', background:selected.length===0?'#e2e8f0':'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', color:selected.length===0?'#94a3b8':'#fff', fontWeight:'800', fontSize:'1rem', cursor:selected.length===0?'not-allowed':'pointer', transition:'all .2s' }}>
            Continue to Payment →
          </button>
        )}
      </div>
    </div>
  );
}
