import React from 'react';

var statusConfig = {
  CANCELLED: { color:'#dc2626', bg:'rgba(220,38,38,0.08)',   border:'rgba(220,38,38,0.2)',   label:'🚫 Cancelled' },
  DELAYED:   { color:'#d97706', bg:'rgba(245,158,11,0.08)',  border:'rgba(245,158,11,0.2)',  label:'⏱ Delayed' },
  ON_TIME:   { color:'#059669', bg:'rgba(16,185,129,0.08)',  border:'rgba(16,185,129,0.2)',  label:'✅ On Time' },
};

const TrainList = function({ trains, onSelect, bookingDate, forecasts }) {
  if (!trains || trains.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize:'0.68rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>
        {trains.length} train{trains.length !== 1 ? 's' : ''} found
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {trains.map(function(train) {
          var forecast = forecasts && forecasts[train.train_id];
          var riskColor = { LOW:'#059669', MEDIUM:'#d97706', HIGH:'#dc2626' };
          var riskBg    = { LOW:'rgba(16,185,129,0.08)', MEDIUM:'rgba(245,158,11,0.08)', HIGH:'rgba(220,38,38,0.08)' };
          var riskBorder = { LOW:'rgba(16,185,129,0.2)', MEDIUM:'rgba(245,158,11,0.2)', HIGH:'rgba(220,38,38,0.2)' };

          var status = train.status || 'ON_TIME';
          var sc     = statusConfig[status] || statusConfig.ON_TIME;
          var cancelled = status === 'CANCELLED';

          var booked = train.seats ? train.seats.reduce(function(acc,row) { return acc+row.filter(function(v){return v===1;}).length; }, 0) : 0;
          var total  = train.seats ? train.seats.length*4 : 0;
          var avail  = total - booked;

          return (
            <div key={train.train_id} style={{ background:'#ffffff', borderRadius:'14px', border:'1px solid rgba(0,0,0,0.07)', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', opacity: cancelled ? 0.65 : 1 }}>
              {/* Status banner — only show if not ON_TIME */}
              {status !== 'ON_TIME' && (
                <div style={{ background:sc.bg, borderBottom:'1px solid '+sc.border, padding:'7px 20px', display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ color:sc.color, fontWeight:'700', fontSize:'0.78rem' }}>{sc.label}</span>
                  {train.delay_minutes > 0 && <span style={{ color:'#d97706', fontSize:'0.75rem' }}>+{train.delay_minutes} min delay</span>}
                  {(train.status_reason || train.statusReason) && (
                    <span style={{ color:'#94a3b8', fontSize:'0.75rem' }}>· {train.status_reason || train.statusReason}</span>
                  )}
                </div>
              )}

              <div style={{ padding:'20px', display:'flex', flexWrap:'wrap', gap:'16px', alignItems:'center' }}>
                {/* Route */}
                <div style={{ flex:1, minWidth:'220px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                    <span style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', color:'#4f46e5', borderRadius:'7px', padding:'2px 9px', fontSize:'0.7rem', fontWeight:'700' }}>
                      #{train.train_no || train.train_id}
                    </span>
                    <span style={{ fontWeight:'800', fontSize:'1.05rem', color:'#0f172a' }}>{train.name}</span>
                  </div>
                  <div style={{ color:'#64748b', fontSize:'0.8rem' }}>{(train.stations || []).join(' → ')}</div>
                </div>

                {/* Fare */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'1.5rem', fontWeight:'900', color:'#f59e0b' }}>${train.price_per_seat}</div>
                  <div style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>per seat</div>
                </div>

                {/* Seats available */}
                <div style={{ textAlign:'center', minWidth:'70px' }}>
                  <div style={{ fontSize:'1.1rem', fontWeight:'800', color: avail === 0 ? '#dc2626' : avail <= 5 ? '#d97706' : '#059669' }}>{avail}</div>
                  <div style={{ fontSize:'0.65rem', color:'#475569' }}>seats left</div>
                </div>

                {/* PredictRail forecast */}
                {forecast && (
                  <div style={{ background: riskBg[forecast.riskLevel], border:'1px solid '+riskBorder[forecast.riskLevel], borderRadius:'10px', padding:'8px 12px', minWidth:'90px', textAlign:'center' }}>
                    <div style={{ fontSize:'0.62rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', marginBottom:'2px' }}>On-time</div>
                    <div style={{ fontSize:'1.1rem', fontWeight:'900', color:riskColor[forecast.riskLevel] }}>{forecast.onTimeProbability}%</div>
                    <div style={{ fontSize:'0.62rem', color:riskColor[forecast.riskLevel], fontWeight:'700' }}>{forecast.riskLevel}</div>
                    {forecast.riskLevel !== 'LOW' && forecast.factors && forecast.factors.length > 0 && (
                      <div style={{ fontSize:'0.6rem', color:'#475569', marginTop:'4px', lineHeight:1.4 }}>
                        {forecast.factors.slice(0,2).join(' · ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Book button */}
                <button
                  className="sr-btn sr-btn-gold"
                  onClick={function() { onSelect(train); }}
                  disabled={cancelled || avail === 0}
                  style={{ padding:'12px 24px', fontSize:'0.9rem', opacity: (cancelled || avail === 0) ? 0.4 : 1, cursor: (cancelled || avail === 0) ? 'not-allowed' : 'pointer' }}>
                  {cancelled ? 'Cancelled' : avail === 0 ? 'Full' : 'Select →'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrainList;
