import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStations, searchTrains, getDelayForecast } from '../services/trainService';

// Comprehensive US states + major cities for autocomplete
var US_LOCATIONS = [
  // States
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
  // Major cities
  'Albany','Albuquerque','Anaheim','Anchorage','Arlington','Atlanta','Aurora',
  'Austin','Bakersfield','Baltimore','Baton Rouge','Birmingham','Boise','Boston South',
  'Boston','Boulder','Buffalo','Charlotte','Chesapeake','Chicago Union','Chicago',
  'Cincinnati','Cleveland','Colorado Springs','Columbus','Corpus Christi','Dallas',
  'Denver','Detroit','Durham','El Paso','Eugene','Flagstaff','Fort Worth',
  'Fresno','Greensboro','Hartford','Henderson','Honolulu','Houston','Indianapolis',
  'Irvine','Jacksonville','Jersey City','Kansas City','Las Vegas','Laredo',
  'Lexington','Lincoln','Little Rock','Long Beach','Los Angeles','Louisville',
  'Lubbock','Madison','Memphis','Mesa','Miami','Milwaukee','Minneapolis',
  'Nashville','New Orleans','New York Penn','New York','Newark','Norfolk',
  'Oakland','Oklahoma City','Omaha','Orlando','Philadelphia','Phoenix','Pittsburgh',
  'Plano','Portland','Providence','Raleigh','Reno','Richmond','Riverside',
  'Rochester','Sacramento','Salt Lake City','San Antonio','San Diego',
  'San Francisco','San Jose','San Luis Obispo','Santa Ana','Savannah',
  'Seattle King St','Seattle','St. Louis','St. Paul','Stockton','Syracuse',
  'Tampa','Toledo','Tucson','Tulsa','Virginia Beach','Washington DC','Wichita',
  'Winston-Salem',
];

var FARE_CLASSES = [
  { id:'ECONOMY',  label:'Economy',  icon:'🪑', desc:'Rows 1–6', color:'#059669', bg:'rgba(5,150,105,0.07)'   },
  { id:'BUSINESS', label:'Business', icon:'💼', desc:'Rows 7–9', color:'#4f46e5', bg:'rgba(99,102,241,0.07)'  },
  { id:'FIRST',    label:'First',    icon:'👑', desc:'Row 10',   color:'#d97706', bg:'rgba(217,119,6,0.07)'   },
];

// Grouped autocomplete dropdown — train stations first, then US cities
function StationDropdown({ sug, onSelect }) {
  var itemStyle = function(isStation) { return {
    padding: '9px 14px', cursor: 'pointer', fontSize: '0.88rem',
    display: 'flex', alignItems: 'center', gap: '8px',
    color: isStation ? '#0f172a' : '#64748b',
  }; };
  var onHover = function(e, on) { e.currentTarget.style.background = on ? 'rgba(99,102,241,0.07)' : ''; };
  return (
    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#ffffff',
      border:'1px solid rgba(99,102,241,0.2)', borderRadius:'12px', marginTop:'4px',
      zIndex:100, boxShadow:'0 8px 32px rgba(0,0,0,0.10)', overflow:'hidden' }}>
      {sug.trainStations.length > 0 && (
        <>
          <div style={{ padding:'6px 14px 3px', fontSize:'0.65rem', fontWeight:'800',
            letterSpacing:'0.12em', color:'#6366f1', textTransform:'uppercase',
            background:'rgba(99,102,241,0.04)', borderBottom:'1px solid rgba(99,102,241,0.08)' }}>
            🚉 Train Stations — guaranteed results
          </div>
          {sug.trainStations.map(function(s) {
            return <div key={s} onMouseDown={function(){onSelect(s);}}
              style={itemStyle(true)}
              onMouseEnter={function(e){onHover(e,true);}}
              onMouseLeave={function(e){onHover(e,false);}}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#6366f1', flexShrink:0 }} />
              {s}
            </div>;
          })}
        </>
      )}
      {sug.cities.length > 0 && (
        <>
          <div style={{ padding:'6px 14px 3px', fontSize:'0.65rem', fontWeight:'800',
            letterSpacing:'0.12em', color:'#94a3b8', textTransform:'uppercase',
            borderTop: sug.trainStations.length > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            📍 Other US Cities &amp; States
          </div>
          {sug.cities.map(function(s) {
            return <div key={s} onMouseDown={function(){onSelect(s);}}
              style={itemStyle(false)}
              onMouseEnter={function(e){onHover(e,true);}}
              onMouseLeave={function(e){onHover(e,false);}}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#cbd5e1', flexShrink:0 }} />
              {s}
            </div>;
          })}
        </>
      )}
    </div>
  );
}

export default function TrainSearchPage() {
  var navigate    = useNavigate();
  var [apiStations, setApiStations] = useState([]); // actual stations from DB trains
  var [source,    setSource]    = useState('');
  var [dest,      setDest]      = useState('');
  var [date,      setDate]      = useState('');
  var [isRT,      setIsRT]      = useState(false);
  var [retDate,   setRetDate]   = useState('');
  var [fareClass, setFareClass] = useState('ECONOMY');
  var [results,   setResults]   = useState(null);
  var [loading,   setLoading]   = useState(false);
  var [forecasts, setForecasts] = useState({});
  var [srcOpen,   setSrcOpen]   = useState(false);
  var [dstOpen,   setDstOpen]   = useState(false);

  useEffect(function() {
    getStations().then(function(s) {
      setApiStations(Array.isArray(s) ? [...s].sort() : []);
    }).catch(function() { setApiStations([]); });
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  /**
   * Build dropdown suggestions for an input value.
   * Returns { trainStations: [...], cities: [...] }
   * - trainStations: actual DB stations that match (shown first, highlighted)
   * - cities: US cities/states that match but aren't already in trainStations
   */
  var buildSuggestions = function(input) {
    var q = input.trim().toLowerCase();
    if (!q) {
      return { trainStations: apiStations.slice(0, 8), cities: [] };
    }
    var tsMatches = apiStations.filter(function(s) { return s.toLowerCase().includes(q); });
    var tsSet = new Set(tsMatches.map(function(s) { return s.toLowerCase(); }));
    var cityMatches = US_LOCATIONS.filter(function(s) {
      return s.toLowerCase().includes(q) && !tsSet.has(s.toLowerCase());
    }).slice(0, 6);
    return { trainStations: tsMatches.slice(0, 8), cities: cityMatches };
  };

  var srcSug = buildSuggestions(source);
  var dstSug = buildSuggestions(dest);

  var handleSearch = useCallback(async function(e) {
    e.preventDefault();
    if (!source || !dest) return;
    setLoading(true); setResults(null);
    try {
      var trains = await searchTrains(source, dest);
      setResults(trains);
      var fcs = {};
      await Promise.all(trains.map(async function(t) {
        var f = await getDelayForecast(t.train_id || t.trainId, date);
        if (f) fcs[t.train_id || t.trainId] = f;
      }));
      setForecasts(fcs);
    } catch(e) { setResults([]); }
    finally { setLoading(false); }
  }, [source, dest, date]);

  function selectTrain(train) {
    var id = train.train_id || train.trainId;
    sessionStorage.setItem('selectedTrain', JSON.stringify({
      ...train, trainId: id, source, destination: dest,
      dateOfTravel: date, fareClass, isRoundTrip: isRT,
      returnDate: isRT ? retDate : null,
    }));
    navigate('/book');
  }

  function getPriceForClass(train) {
    if (fareClass === 'FIRST')    return train.price_first    || train.priceFirst    || Math.round((train.price_per_seat||train.pricePerSeat||0)*3);
    if (fareClass === 'BUSINESS') return train.price_business || train.priceBusiness || Math.round((train.price_per_seat||train.pricePerSeat||0)*1.8);
    return train.price_economy || train.priceEconomy || train.price_per_seat || train.pricePerSeat || 0;
  }

  var today = new Date().toISOString().split('T')[0];
  var inp = { width:'100%', boxSizing:'border-box', background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.12)', borderRadius:'10px', padding:'12px 14px', color:'#0f172a', fontSize:'0.95rem', outline:'none' };
  var lbl = { display:'block', color:'#64748b', fontSize:'0.72rem', fontWeight:'700', letterSpacing:'0.1em', marginBottom:'6px', textTransform:'uppercase' };

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4ff', paddingBottom:'60px' }}>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#1e3a8a 100%)', padding:'48px 24px 0', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-40px', right:'-60px', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-60px', left:'10%', width:'200px', height:'200px', borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,0.12) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:'860px', margin:'0 auto', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
            <span style={{ fontSize:'1.5rem' }}>🚆</span>
            <span style={{ color:'#fbbf24', fontWeight:'700', letterSpacing:'0.12em', fontSize:'0.75rem', textTransform:'uppercase' }}>TrackNova Search</span>
          </div>
          <h1 style={{ color:'#f1f5f9', fontSize:'clamp(1.6rem,4vw,2.4rem)', fontWeight:'800', margin:'0 0 6px', lineHeight:1.2 }}>Find Your Perfect Journey</h1>
          <p style={{ color:'rgba(241,245,249,0.6)', fontSize:'0.95rem', margin:'0 0 36px' }}>Economy · Business · First Class</p>

          <form onSubmit={handleSearch} style={{ background:'rgba(255,255,255,0.97)', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'20px', padding:'28px', backdropFilter:'blur(12px)', boxShadow:'0 8px 40px rgba(0,0,0,0.12)' }}>
            {/* Trip type */}
            <div style={{ display:'flex', gap:'12px', marginBottom:'20px' }}>
              {['One-Way','Round Trip'].map(function(lbl2,i) {
                var active = isRT===(i===1);
                return <button key={lbl2} type="button" onClick={function(){setIsRT(i===1);}}
                  style={{ padding:'6px 16px', borderRadius:'20px', border:'1px solid '+(active?'#6366f1':'rgba(0,0,0,0.12)'), background:active?'rgba(99,102,241,0.10)':'transparent', color:active?'#4f46e5':'#64748b', fontSize:'0.82rem', fontWeight:'600', cursor:'pointer' }}>{lbl2}</button>;
              })}
            </div>

            {/* Stations */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 1fr', gap:'12px', alignItems:'start', marginBottom:'16px' }}>
              {/* FROM */}
              <div style={{ position:'relative' }}>
                <label style={lbl}>From</label>
                <input value={source}
                  onChange={function(e){setSource(e.target.value);setSrcOpen(true);}}
                  onFocus={function(){setSrcOpen(true);}}
                  onBlur={function(){setTimeout(function(){setSrcOpen(false);},200);}}
                  placeholder="e.g. New York, Chicago, Cleveland"
                  style={inp} />
                {srcOpen && (srcSug.trainStations.length>0 || srcSug.cities.length>0) && (
                  <StationDropdown sug={srcSug} onSelect={function(s){setSource(s);setSrcOpen(false);}} />
                )}
              </div>
              {/* Swap */}
              <div style={{ paddingTop:'26px', display:'flex', justifyContent:'center' }}>
                <button type="button" onClick={function(){var t=source;setSource(dest);setDest(t);}}
                  style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.3)', color:'#6366f1', cursor:'pointer', fontSize:'1rem' }}>⇄</button>
              </div>
              {/* TO */}
              <div style={{ position:'relative' }}>
                <label style={lbl}>To</label>
                <input value={dest}
                  onChange={function(e){setDest(e.target.value);setDstOpen(true);}}
                  onFocus={function(){setDstOpen(true);}}
                  onBlur={function(){setTimeout(function(){setDstOpen(false);},200);}}
                  placeholder="e.g. Washington DC, Miami, Denver"
                  style={inp} />
                {dstOpen && (dstSug.trainStations.length>0 || dstSug.cities.length>0) && (
                  <StationDropdown sug={dstSug} onSelect={function(s){setDest(s);setDstOpen(false);}} />
                )}
              </div>
            </div>

            {/* Dates */}
            <div style={{ display:'grid', gridTemplateColumns:isRT?'1fr 1fr':'1fr', gap:'12px', marginBottom:'20px' }}>
              <div><label style={lbl}>Departure Date</label><input type="date" value={date} min={today} onChange={function(e){setDate(e.target.value);}} style={{...inp, colorScheme:'light'}} /></div>
              {isRT && <div><label style={{...lbl, color:'#d97706'}}>Return Date</label><input type="date" value={retDate} min={date||today} onChange={function(e){setRetDate(e.target.value);}} style={{...inp, border:'1px solid rgba(245,158,11,0.4)', colorScheme:'light'}} /></div>}
            </div>

            {/* Cabin class */}
            <div style={{ marginBottom:'24px' }}>
              <label style={lbl}>Cabin Class</label>
              <div style={{ display:'flex', gap:'10px' }}>
                {FARE_CLASSES.map(function(fc) {
                  var sel = fareClass===fc.id;
                  return <button key={fc.id} type="button" onClick={function(){setFareClass(fc.id);}}
                    style={{ flex:1, padding:'10px 8px', borderRadius:'12px', border:'1px solid '+(sel?fc.color:'rgba(0,0,0,0.09)'), background:sel?fc.bg:'rgba(0,0,0,0.02)', cursor:'pointer', textAlign:'center', transition:'all .2s' }}>
                    <div style={{ fontSize:'1.2rem', marginBottom:'2px' }}>{fc.icon}</div>
                    <div style={{ color:sel?fc.color:'#64748b', fontWeight:'700', fontSize:'0.78rem' }}>{fc.label}</div>
                    <div style={{ color:'#94a3b8', fontSize:'0.68rem' }}>{fc.desc}</div>
                  </button>;
                })}
              </div>
            </div>

            <button type="submit" disabled={loading||!source||!dest}
              style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'1rem', fontWeight:'700', cursor:loading||!source||!dest?'not-allowed':'pointer', opacity:!source||!dest?0.5:1 }}>
              {loading?'🔍 Searching...':'🚆 Search Trains'}
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth:'860px', margin:'32px auto 0', padding:'0 24px' }}>
        {results===null&&!loading&&(
          <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8' }}>
            <div style={{ fontSize:'3rem', marginBottom:'12px' }}>🗺️</div>
            <p>Enter origin and destination to search</p>
          </div>
        )}
        {results!==null&&results.length===0&&(
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ fontSize:'3rem', marginBottom:'12px' }}>😕</div>
            <p style={{ color:'#64748b' }}>No trains found for this route.</p>
          </div>
        )}
        {results!==null&&results.length>0&&(
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h2 style={{ color:'#0f172a', fontSize:'1rem', fontWeight:'700', margin:0 }}>{results.length} train{results.length>1?'s':''} · {source} → {dest}</h2>
              <span style={{ color:'#4f46e5', fontSize:'0.82rem', fontWeight:'600', background:'rgba(99,102,241,0.08)', padding:'4px 10px', borderRadius:'20px' }}>{FARE_CLASSES.find(function(f){return f.id===fareClass;})?.icon} {fareClass}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              {results.map(function(train) {
                var id        = train.train_id||train.trainId;
                var price     = getPriceForClass(train);
                var fc        = forecasts[id];
                var status    = (train.status||'ON_TIME').toUpperCase();
                var isCancelled = status==='CANCELLED';
                var classRowMap = { ECONOMY:[0,1,2,3,4,5], BUSINESS:[6,7,8], FIRST:[9] };
                var fcRows    = classRowMap[fareClass] || classRowMap.ECONOMY;
                var seats     = train.seats
                  ? fcRows.filter(function(r){return r<train.seats.length;})
                      .reduce(function(sum,r){return sum+train.seats[r].filter(function(v){return v===0;}).length;},0)
                  : '—';
                return (
                  <div key={id} style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}
                    onMouseEnter={function(e){if(!isCancelled)e.currentTarget.style.borderColor='rgba(99,102,241,0.30)';}}
                    onMouseLeave={function(e){e.currentTarget.style.borderColor='rgba(0,0,0,0.07)';}}>
                    {status!=='ON_TIME'&&(
                      <div style={{ padding:'6px 20px', fontSize:'0.78rem', fontWeight:'600', background:isCancelled?'rgba(248,113,113,0.06)':'rgba(245,158,11,0.06)', borderBottom:'1px solid '+(isCancelled?'rgba(248,113,113,0.15)':'rgba(245,158,11,0.15)'), color:isCancelled?'#dc2626':'#d97706' }}>
                        {isCancelled?'🚫 Cancelled':'⏱ Delayed '+(train.delay_minutes||train.delayMinutes||0)+' min'}
                      </div>
                    )}
                    <div style={{ padding:'20px 24px', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                      <div style={{ flex:'1 1 180px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                          <span style={{ color:'#0f172a', fontWeight:'800', fontSize:'1.05rem' }}>{train.name}</span>
                          <span style={{ color:'#94a3b8', fontSize:'0.78rem' }}>#{train.train_no||train.trainNo}</span>
                        </div>
                        <div style={{ color:'#64748b', fontSize:'0.82rem' }}>{(train.stations||[]).join(' → ')}</div>
                      </div>
                      <div style={{ textAlign:'center', minWidth:'70px' }}>
                        <div style={{ color:'#94a3b8', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'2px' }}>Departs</div>
                        <div style={{ color:'#0f172a', fontWeight:'700' }}>{((train.station_times||train.stationTimes)||{})[source]||'—'}</div>
                      </div>
                      <div style={{ textAlign:'center', minWidth:'60px' }}>
                        <div style={{ color:'#94a3b8', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'2px' }}>Seats</div>
                        <div style={{ color:seats>5?'#059669':seats>0?'#d97706':'#dc2626', fontWeight:'700' }}>{seats}</div>
                      </div>
                      {fc&&(
                        <div style={{ textAlign:'center', minWidth:'70px' }}>
                          <div style={{ color:'#94a3b8', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'2px' }}>On-Time</div>
                          <div style={{ color:fc.riskLevel==='HIGH'?'#dc2626':fc.riskLevel==='MEDIUM'?'#d97706':'#059669', fontWeight:'700' }}>{fc.onTimeProbability}%</div>
                        </div>
                      )}
                      <div style={{ textAlign:'right', minWidth:'110px' }}>
                        <div style={{ color:'#f59e0b', fontWeight:'800', fontSize:'1.4rem', lineHeight:1 }}>${price}</div>
                        <div style={{ color:'#94a3b8', fontSize:'0.72rem', marginBottom:'10px' }}>per seat</div>
                        <button onClick={function(){selectTrain(train);}} disabled={isCancelled||seats===0}
                          style={{ padding:'8px 18px', background:isCancelled||seats===0?'#f1f5f9':'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'10px', color:isCancelled||seats===0?'#94a3b8':'#fff', fontWeight:'700', fontSize:'0.85rem', cursor:isCancelled||seats===0?'not-allowed':'pointer' }}>
                          {isCancelled?'Cancelled':seats===0?'Full':'Select →'}
                        </button>
                      </div>
                    </div>
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
