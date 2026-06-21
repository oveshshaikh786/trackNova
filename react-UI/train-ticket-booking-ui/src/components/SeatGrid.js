import React from 'react';

/**
 * SeatGrid — renders the 2D seat matrix from the train object.
 *
 * Seat values:
 *   0 = available (green)
 *   1 = booked    (red)
 *
 * The currently selected seat (props.selected) is highlighted in blue.
 * Clicking a booked seat does nothing.
 */
const SeatGrid = ({ seats, selected, onSelect }) => {
  if (!seats || seats.length === 0) return <p>No seat data available.</p>;

  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: '#555' }}>
        <span style={{ ...styles.seatBox, backgroundColor: '#4caf50' }} /> Available &nbsp;
        <span style={{ ...styles.seatBox, backgroundColor: '#e53935' }} /> Booked &nbsp;
        <span style={{ ...styles.seatBox, backgroundColor: '#1a73e8' }} /> Selected
      </p>
      <div style={styles.grid}>
        {seats.map((row, rowIdx) => (
          <div key={rowIdx} style={styles.row}>
            <span style={styles.rowLabel}>Row {rowIdx}</span>
            {row.map((val, colIdx) => {
              const isBooked   = val === 1;
              const isSelected = selected?.row === rowIdx && selected?.col === colIdx;
              let bg = '#4caf50';
              if (isBooked)   bg = '#e53935';
              if (isSelected) bg = '#1a73e8';

              return (
                <button
                  key={colIdx}
                  style={{ ...styles.seat, backgroundColor: bg }}
                  onClick={() => !isBooked && onSelect({ row: rowIdx, col: colIdx })}
                  title={isBooked ? 'Already booked' : `Row ${rowIdx}, Col ${colIdx}`}
                  disabled={isBooked}
                >
                  {colIdx}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  grid:     { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  row:      { display: 'flex', alignItems: 'center', gap: '8px' },
  rowLabel: { width: '50px', fontSize: '0.85rem', color: '#666' },
  seat:     { width: '36px', height: '36px', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' },
  seatBox:  { display: 'inline-block', width: '16px', height: '16px', borderRadius: '3px', marginRight: '4px', verticalAlign: 'middle' },
};

export default SeatGrid;
