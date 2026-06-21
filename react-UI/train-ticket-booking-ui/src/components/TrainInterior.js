import React from 'react';

const SEAT_LABELS = ['A', 'B', 'C', 'D'];

const TrainInterior = ({ seats, selected, onSelect, trainName }) => {
  if (!seats || seats.length === 0) return <p style={{ color: '#94a3b8' }}>No seat data.</p>;

  return (
    <div style={styles.wrapper}>
      <div style={styles.carHeader}>
        <span style={{ fontSize: '1.4rem' }}>🚆</span>
        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#f1f5f9' }}>{trainName || 'Coach Class'}</span>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>Car 4</span>
      </div>

      <div style={styles.legend}>
        <LegendDot color="#10b981" label="Available" />
        <LegendDot color="#f87171" label="Booked" />
        <LegendDot color="#6366f1" label="Selected" />
      </div>

      <div style={styles.seatHeaderRow}>
        <div style={{ width: '28px' }} />
        <div style={styles.seatHeaderCell}>A</div>
        <div style={styles.seatHeaderCell}>B</div>
        <div style={styles.aisleHeader}>AISLE</div>
        <div style={styles.seatHeaderCell}>C</div>
        <div style={styles.seatHeaderCell}>D</div>
      </div>

      <div style={styles.carBody}>
        {seats.map(function(row, rowIdx) {
          return (
            <div key={rowIdx} style={styles.seatRow}>
              <div style={styles.rowNum}>{rowIdx + 1}</div>
              {[0, 1].map(function(colIdx) {
                var val = row[colIdx] ?? 0;
                return <SeatButton key={colIdx} label={SEAT_LABELS[colIdx]} rowIdx={rowIdx} colIdx={colIdx}
                  isBooked={val === 1} isSelected={selected?.row === rowIdx && selected?.col === colIdx} onSelect={onSelect} />;
              })}
              <div style={styles.aisle} />
              {[2, 3].map(function(colIdx) {
                var val = row[colIdx] ?? 0;
                return <SeatButton key={colIdx} label={SEAT_LABELS[colIdx]} rowIdx={rowIdx} colIdx={colIdx}
                  isBooked={val === 1} isSelected={selected?.row === rowIdx && selected?.col === colIdx} onSelect={onSelect} />;
              })}
              <div style={styles.windowRight} />
            </div>
          );
        })}
      </div>

      <div style={styles.carFooter}>
        <span>◀ Front of Train</span>
        <span>Back of Train ▶</span>
      </div>
    </div>
  );
};

const SeatButton = function({ label, rowIdx, colIdx, isBooked, isSelected, onSelect }) {
  var bg     = isSelected ? '#6366f1' : isBooked ? '#7f1d1d' : '#065f46';
  var border = isSelected ? '#4f46e5' : isBooked ? '#991b1b' : '#047857';
  var opacity = isBooked ? 0.6 : 1;

  return (
    <button onClick={function() { if (!isBooked) onSelect({ row: rowIdx, col: colIdx }); }}
      disabled={isBooked}
      title={isBooked ? 'Already booked' : 'Row ' + (rowIdx+1) + label}
      style={{ width:'44px', height:'52px', margin:'3px', backgroundColor:bg, border:'2px solid '+border,
        borderRadius:'6px 6px 4px 4px', cursor: isBooked ? 'not-allowed' : 'pointer',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        color:'#fff', fontWeight:'800', fontSize:'13px', opacity,
        boxShadow: isSelected ? '0 0 12px rgba(99,102,241,0.5)' : isBooked ? 'none' : '0 2px 6px rgba(0,0,0,0.4)',
        transition:'transform 0.1s', position:'relative', fontFamily:'inherit' }}
      onMouseEnter={function(e) { if (!isBooked) e.currentTarget.style.transform = 'scale(1.1)'; }}
      onMouseLeave={function(e) { e.currentTarget.style.transform = 'scale(1)'; }}>
      <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:'5px',
        backgroundColor:'rgba(255,255,255,0.2)', borderRadius:'3px 3px 0 0' }} />
      <span>{label}</span>
    </button>
  );
};

const LegendDot = function({ color, label }) {
  return (
    <span style={{ display:'flex', alignItems:'center', gap:'5px', marginRight:'14px', fontSize:'0.78rem', color:'#94a3b8' }}>
      <span style={{ width:13, height:13, backgroundColor:color, borderRadius:'3px', display:'inline-block' }} />
      {label}
    </span>
  );
};

const styles = {
  wrapper:     { background:'#0d1220', border:'2px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'16px', maxWidth:'380px', margin:'16px 0', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' },
  carHeader:   { display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'10px', padding:'10px 14px', marginBottom:'12px' },
  legend:      { display:'flex', marginBottom:'10px' },
  seatHeaderRow:{ display:'flex', alignItems:'center', marginBottom:'2px', paddingLeft:'32px' },
  seatHeaderCell:{ width:'50px', textAlign:'center', fontSize:'0.78rem', fontWeight:'700', color:'#475569' },
  aisleHeader: { width:'32px', textAlign:'center', fontSize:'0.65rem', color:'#334155' },
  carBody:     { background:'rgba(255,255,255,0.03)', borderRadius:'10px', padding:'8px 4px', border:'1px solid rgba(255,255,255,0.06)' },
  seatRow:     { display:'flex', alignItems:'center', marginBottom:'2px' },
  rowNum:      { width:'28px', textAlign:'right', paddingRight:'6px', fontSize:'0.78rem', color:'#475569', fontWeight:'700' },
  aisle:       { width:'24px', height:'52px', margin:'0 4px', background:'rgba(255,255,255,0.04)', borderRadius:'3px' },
  windowRight: { width:'8px', height:'36px', background:'rgba(99,102,241,0.25)', borderRadius:'3px', marginLeft:'6px', border:'1px solid rgba(99,102,241,0.4)' },
  carFooter:   { display:'flex', justifyContent:'space-between', marginTop:'12px', fontSize:'0.72rem', color:'#334155' },
};

export default TrainInterior;
