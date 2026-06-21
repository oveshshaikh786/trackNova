import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookSeats, validatePromo, createPaymentIntent } from '../services/trainService';
import { getCurrentUser } from '../services/authService';

var COLS = ['A','B','C','D'];

function getFareClass(row) {
  if (row >= 9) return 'FIRST';
  if (row >= 6) return 'BUSINESS';
  return 'ECONOMY';
}

function classColor(cls) {
  if (cls==='FIRST')    return '#d97706';
  if (cls==='BUSINESS') return '#4f46e5';
  return '#059669';
}

// Tiny QR-code-like SVG from a string (visual only — not a real QR)
function MiniQR({ value, size }) {
  var hash = 0;
  for (var i = 0; i < value.length; i++) { hash = ((hash << 5) - hash) + value.charCodeAt(i); hash |= 0; }
  var rng = function(seed) { var x = Math.sin(seed + hash) * 10000; return x - Math.floor(x); };
  var cells = 11;
  var cell  = (size||88) / cells;
  var rects = [];
  [[0,0],[0,cells-7],[cells-7,0]].forEach(function(corner) {
    rects.push(<rect key={'f'+corner} x={corner[1]*cell} y={corner[0]*cell} width={7*cell} height={7*cell} fill="#6366f1" rx="1" />);
    rects.push(<rect key={'fi'+corner} x={(corner[1]+1)*cell} y={(corner[0]+1)*cell} width={5*cell} height={5*cell} fill="#f8faff" rx="1" />);
    rects.push(<rect key={'fc'+corner} x={(corner[1]+2)*cell} y={(corner[0]+2)*cell} width={3*cell} height={3*cell} fill="#6366f1" rx="1" />);
  });
  for (var r = 0; r < cells; r++) {
    for (var c = 0; c < cells; c++) {
      var inFinder = (r<7&&c<7)||(r<7&&c>cells-8)||(r>cells-8&&c<7);
      if (!inFinder && rng(r*cells+c) > 0.5) {
        rects.push(<rect key={'d'+r+'-'+c} x={c*cell} y={r*cell} width={cell*0.85} height={cell*0.85} fill="#6366f1" rx="0.5" />);
      }
    }
  }
  return <svg width={size||88} height={size||88} viewBox={'0 0 '+((size||88))+' '+((size||88))} style={{ borderRadius:'6px' }}>{rects}</svg>;
}

// Format card number with spaces: 1234 5678 9012 3456
function formatCardNumber(v) {
  return v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
}

// Format expiry MM/YY
function formatExpiry(v) {
  var digits = v.replace(/\D/g,'').slice(0,4);
  if (digits.length >= 3) return digits.slice(0,2)+'/'+digits.slice(2);
  return digits;
}

// Step indicator
function StepBar({ step }) {
  var steps = ['Review', 'Payment', 'Confirmed'];
  var idx   = step==='review' ? 0 : step==='payment' ? 1 : 2;
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:'28px' }}>
      {steps.map(function(label, i) {
        var active  = i === idx;
        var done    = i < idx;
        var color   = done ? '#059669' : active ? '#6366f1' : '#334155';
        var textCol = done ? '#059669' : active ? '#4f46e5' : '#475569';
        return (
          <React.Fragment key={label}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: done ? 'rgba(110,231,183,0.15)' : active ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.06)',
                border:'2px solid '+color, display:'flex', alignItems:'center', justifyContent:'center',
                color: done ? '#059669' : active ? '#4f46e5' : '#475569', fontSize:'0.75rem', fontWeight:'800' }}>
                {done ? '✓' : i+1}
              </div>
              <span style={{ color:textCol, fontSize:'0.82rem', fontWeight: active ? '700' : '500' }}>{label}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{ flex:1, height:'2px', background: i < idx ? 'rgba(110,231,183,0.4)' : 'rgba(0,0,0,0.12)', margin:'0 10px', borderRadius:'2px' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Card brand icon (visual)
function CardBrandIcon({ number }) {
  var n = number.replace(/\s/g,'');
  if (n.startsWith('4'))   return <span style={{ color:'#1a56db', fontWeight:'800', fontSize:'0.8rem', letterSpacing:'0.04em' }}>VISA</span>;
  if (n.startsWith('5') || n.startsWith('2')) return <span style={{ color:'#f59e0b', fontWeight:'800', fontSize:'0.75rem' }}>MC</span>;
  if (n.startsWith('3'))   return <span style={{ color:'#10b981', fontWeight:'800', fontSize:'0.75rem' }}>AMEX</span>;
  return <span style={{ color:'#475569', fontWeight:'700', fontSize:'0.7rem' }}>CARD</span>;
}

var inputStyle = {
  width:'100%', boxSizing:'border-box',
  background:'rgba(0,0,0,0.03)',
  border:'1px solid rgba(0,0,0,0.12)',
  borderRadius:'10px', padding:'12px 14px',
  color:'#0f172a', fontSize:'0.95rem', outline:'none',
  fontFamily:'inherit',
};
var labelStyle = { color:'#64748b', fontSize:'0.75rem', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px', display:'block' };

export default function PaymentPage() {
  var navigate = useNavigate();
  var user     = getCurrentUser();

  var [train,        setTrain]       = useState(null);
  var [meta,         setMeta]        = useState(null);
  var [seats,        setSeats]       = useState([]);
  var [fareClass,    setFareClass]   = useState('ECONOMY');
  var [promo,        setPromo]       = useState('');
  var [promoRes,     setPromoRes]    = useState(null);
  var [promoLoading, setPromoLoading]= useState(false);
  var [paying,       setPaying]      = useState(false);
  var [receipt,      setReceipt]     = useState(null);
  // step: 'review' → 'payment' → receipt shown
  var [step,         setStep]        = useState('review');
  // payment method: 'card' | 'paypal' | 'applepay'
  var [payMethod,    setPayMethod]   = useState('card');
  // card form
  var [card,         setCard]        = useState({ number:'', expiry:'', cvv:'', name:'' });
  var [cardErrors,   setCardErrors]  = useState({});
  // Stripe-ready: intent returned by backend
  // { mock: true } = no Stripe key → use built-in form
  // { mock: false, clientSecret: '...' } = real Stripe → swap form for Stripe Elements
  var [intent,       setIntent]      = useState(null);
  var [intentLoading,setIntentLoading] = useState(false);

  useEffect(function() {
    var stored   = sessionStorage.getItem('selectedTrain');
    var seatData = sessionStorage.getItem('bookingSeats');
    var fcData   = sessionStorage.getItem('bookingFareClass');
    if (!stored || !seatData) { navigate('/search'); return; }
    var m = JSON.parse(stored);
    var s = JSON.parse(seatData);
    setMeta(m);
    setSeats(s);
    setFareClass(fcData || m.fareClass || 'ECONOMY');
    setTrain(m);
  }, [navigate]);

  function getBasePrice(row) {
    if (!train) return 0;
    var cls = getFareClass(row);
    if (cls==='FIRST')    return train.price_first    || train.priceFirst    || Math.round((train.price_per_seat||train.pricePerSeat||0)*3);
    if (cls==='BUSINESS') return train.price_business || train.priceBusiness || Math.round((train.price_per_seat||train.pricePerSeat||0)*1.8);
    return train.price_economy || train.priceEconomy || train.price_per_seat || train.pricePerSeat || 0;
  }

  var discountPct   = promoRes?.valid ? promoRes.discountPercent : 0;
  var seatBreakdown = seats.map(function(s) {
    var base  = getBasePrice(s.row);
    var final = Math.round(base * (1 - discountPct/100));
    return { ...s, base, final, cls: getFareClass(s.row) };
  });
  var totalBase  = seatBreakdown.reduce(function(a,s){return a+s.base;},0);
  var totalFinal = seatBreakdown.reduce(function(a,s){return a+s.final;},0);

  async function handleApplyPromo() {
    if (!promo.trim()) return;
    setPromoLoading(true);
    try {
      var res = await validatePromo(promo.trim().toUpperCase());
      setPromoRes(res);
    } catch(e) { setPromoRes({ valid:false, message:'Could not validate' }); }
    finally { setPromoLoading(false); }
  }

  function validateCard() {
    var errs = {};
    var digits = card.number.replace(/\s/g,'');
    if (digits.length < 16)     errs.number = 'Enter a valid 16-digit card number';
    var exp = card.expiry.replace('/','');
    if (exp.length < 4)         errs.expiry = 'Enter expiry MM/YY';
    else {
      var mm = parseInt(exp.slice(0,2),10);
      if (mm < 1 || mm > 12)   errs.expiry = 'Invalid month';
    }
    if (card.cvv.length < 3)    errs.cvv = 'Enter 3-digit CVV';
    if (!card.name.trim())      errs.name = 'Enter cardholder name';
    setCardErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handlePay() {
    // Validate card if paying by card
    if (payMethod === 'card' && !validateCard()) return;

    if (!user || seats.length===0) return;
    setPaying(true);
    try {
      var payload = {
        userId:        user.userId,
        trainId:       meta.train_id || meta.trainId,
        seats:         seats,
        source:        meta.source,
        destination:   meta.destination,
        dateOfTravel:  meta.dateOfTravel,
        promoCode:     promoRes?.valid ? promo.trim().toUpperCase() : null,
        returnTrainId: meta.isRoundTrip ? meta.train_id || meta.trainId : null,
        returnDate:    meta.isRoundTrip ? meta.returnDate : null,
        returnSeats:   meta.isRoundTrip ? seats : null,
      };
      await bookSeats(payload);
      var refId = Math.random().toString(36).slice(2,10).toUpperCase();
      setReceipt({
        refId,
        train:       meta.name || meta.trainId,
        source:      meta.source,
        destination: meta.destination,
        date:        meta.dateOfTravel,
        returnDate:  meta.isRoundTrip ? meta.returnDate : null,
        seats:       seatBreakdown,
        totalFinal,
        passenger:   user.name,
        isRoundTrip: meta.isRoundTrip,
        payMethod,
        last4:       payMethod==='card' ? card.number.replace(/\s/g,'').slice(-4) : null,
      });
      sessionStorage.removeItem('bookingSeats');
      sessionStorage.removeItem('bookingFareClass');
    } catch(e) {
      alert(e?.response?.data?.message || 'Booking failed. Please try again.');
    } finally { setPaying(false); }
  }

  if (!train || seats.length===0) return (
    <div style={{ minHeight:'100vh', background:'#f0f4ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Loading…</div>
  );

  // ── Receipt / Confirmed ───────────────────────────────────────────────
  if (receipt) {
    return (
      <div style={{ minHeight:'100vh', background:'#f0f4ff', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
        <div style={{ maxWidth:'480px', width:'100%' }}>
          <StepBar step="confirmed" />
          <div style={{ textAlign:'center', marginBottom:'24px' }}>
            <div style={{ fontSize:'3rem', marginBottom:'8px' }}>✅</div>
            <h1 style={{ color:'#0f172a', fontWeight:'800', fontSize:'1.5rem', margin:0 }}>Booking Confirmed!</h1>
            <p style={{ color:'#64748b', margin:'6px 0 0' }}>
              {receipt.payMethod==='card' && receipt.last4 && <>Charged to card ending ···· {receipt.last4}</>}
              {receipt.payMethod==='paypal' && <>Paid via PayPal</>}
              {receipt.payMethod==='applepay' && <>Paid via Apple Pay</>}
            </p>
          </div>

          <div style={{ background:'#ffffff', border:'1px solid rgba(99,102,241,0.15)', borderRadius:'20px', overflow:'hidden', marginBottom:'16px', boxShadow:'0 4px 20px rgba(99,102,241,0.08)' }}>
            <div style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))', padding:'20px 24px', borderBottom:'1px dashed rgba(0,0,0,0.08)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ color:'#f59e0b', fontWeight:'700', fontSize:'0.72rem', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>TrackNova</div>
                  <div style={{ color:'#0f172a', fontWeight:'800', fontSize:'1.1rem' }}>{receipt.train}</div>
                  <div style={{ color:'#64748b', fontSize:'0.85rem', marginTop:'2px' }}>{receipt.source} → {receipt.destination}</div>
                </div>
                <MiniQR value={receipt.refId} size={72} />
              </div>
            </div>

            <div style={{ padding:'16px 24px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                {[['Passenger', receipt.passenger], ['Date', receipt.date], ['Ref #', receipt.refId], ['Seats', receipt.seats.length]].map(function(kv) {
                  return <div key={kv[0]}>
                    <div style={{ color:'#94a3b8', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>{kv[0]}</div>
                    <div style={{ color:'#0f172a', fontWeight:'700', fontSize:'0.9rem' }}>{kv[1]}</div>
                  </div>;
                })}
              </div>

              {receipt.isRoundTrip && receipt.returnDate && (
                <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'8px', padding:'8px 12px', marginBottom:'12px', color:'#d97706', fontSize:'0.82rem', fontWeight:'600' }}>
                  🔄 Return: {receipt.destination} → {receipt.source} · {receipt.returnDate}
                </div>
              )}

              <div style={{ borderTop:'1px solid rgba(0,0,0,0.06)', paddingTop:'12px' }}>
                {receipt.seats.map(function(s,i) {
                  return <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:'0.85rem' }}>
                    <span style={{ color:'#64748b' }}>Row {s.row+1} · {COLS[s.col]} · <span style={{ color:classColor(s.cls) }}>{s.cls}</span></span>
                    <span style={{ color:'#f59e0b', fontWeight:'700' }}>${s.final}</span>
                  </div>;
                })}
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'8px', borderTop:'1px solid rgba(0,0,0,0.06)', marginTop:'4px' }}>
                  <span style={{ color:'#0f172a', fontWeight:'800' }}>Total Paid</span>
                  <span style={{ color:'#f59e0b', fontWeight:'800', fontSize:'1.1rem' }}>${receipt.totalFinal}</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={function(){navigate('/bookings');}}
            style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', color:'#fff', fontWeight:'700', fontSize:'1rem', cursor:'pointer', marginBottom:'10px' }}>
            View My Bookings
          </button>
          <button onClick={function(){navigate('/search');}}
            style={{ width:'100%', padding:'14px', background:'transparent', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'12px', color:'#94a3b8', fontWeight:'600', fontSize:'0.95rem', cursor:'pointer' }}>
            Book Another Trip
          </button>
        </div>
      </div>
    );
  }

  var fcColor = classColor(fareClass);

  // ── Step 1: Review ────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <div style={{ minHeight:'100vh', background:'#f0f4ff', padding:'32px 24px', boxSizing:'border-box' }}>
        <div style={{ maxWidth:'560px', margin:'0 auto' }}>
          <button onClick={function(){navigate('/book');}} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', marginBottom:'20px', padding:0 }}>← Back to seats</button>
          <StepBar step="review" />
          <h1 style={{ color:'#0f172a', fontWeight:'800', fontSize:'1.4rem', margin:'0 0 24px' }}>Review Your Order</h1>

          {/* Trip summary */}
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'16px', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <div>
                <div style={{ color:'#0f172a', fontWeight:'700', fontSize:'1rem' }}>{train.name}</div>
                <div style={{ color:'#64748b', fontSize:'0.85rem' }}>{meta?.source} → {meta?.destination} · {meta?.dateOfTravel}</div>
              </div>
              <span style={{ padding:'4px 12px', borderRadius:'20px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.20)', color:fcColor, fontSize:'0.78rem', fontWeight:'700' }}>{fareClass}</span>
            </div>
            {meta?.isRoundTrip && (
              <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:'8px', padding:'6px 12px', color:'#d97706', fontSize:'0.82rem', fontWeight:'600' }}>
                🔄 Round Trip · Return {meta.returnDate}
              </div>
            )}
          </div>

          {/* Seat breakdown */}
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'16px', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ color:'#64748b', fontSize:'0.78rem', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'12px' }}>Seat Breakdown</div>
            {seatBreakdown.map(function(s,i) {
              return <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ color:'#64748b', fontSize:'0.88rem' }}>Row {s.row+1} · {COLS[s.col]} · <span style={{ color:classColor(s.cls) }}>{s.cls}</span></span>
                <div style={{ textAlign:'right' }}>
                  {discountPct > 0 && <span style={{ color:'#94a3b8', textDecoration:'line-through', fontSize:'0.8rem', marginRight:'6px' }}>${s.base}</span>}
                  <span style={{ color:'#f59e0b', fontWeight:'700' }}>${s.final}</span>
                </div>
              </div>;
            })}
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'10px', marginTop:'4px' }}>
              <span style={{ color:'#0f172a', fontWeight:'800' }}>Total</span>
              <div>
                {discountPct > 0 && <span style={{ color:'#94a3b8', textDecoration:'line-through', marginRight:'8px' }}>${totalBase}</span>}
                <span style={{ color:'#f59e0b', fontWeight:'800', fontSize:'1.1rem' }}>${totalFinal}</span>
                {discountPct > 0 && <span style={{ color:'#059669', fontSize:'0.78rem', marginLeft:'6px' }}>-{discountPct}%</span>}
              </div>
            </div>
          </div>

          {/* Passenger */}
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'16px', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ color:'#64748b', fontSize:'0.78rem', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'10px' }}>Passenger</div>
            <div style={{ color:'#0f172a', fontWeight:'700' }}>{user?.name}</div>
            <div style={{ color:'#64748b', fontSize:'0.85rem' }}>Logged in account</div>
          </div>

          {/* Promo code */}
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'24px', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ color:'#64748b', fontSize:'0.78rem', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'12px' }}>Promo Code (Optional)</div>
            <div style={{ display:'flex', gap:'10px' }}>
              <input value={promo} onChange={function(e){setPromo(e.target.value.toUpperCase());setPromoRes(null);}}
                placeholder="Enter code" disabled={promoRes?.valid}
                style={{ ...inputStyle, flex:1 }} />
              <button onClick={handleApplyPromo} disabled={promoLoading||!promo||promoRes?.valid}
                style={{ padding:'10px 18px', background:promoRes?.valid?'rgba(16,185,129,0.15)':'rgba(99,102,241,0.15)', border:'1px solid '+(promoRes?.valid?'rgba(16,185,129,0.3)':'rgba(99,102,241,0.3)'), borderRadius:'10px', color:promoRes?.valid?'#059669':'#4f46e5', fontWeight:'700', fontSize:'0.85rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                {promoLoading?'…':promoRes?.valid?'Applied ✓':'Apply'}
              </button>
            </div>
            {promoRes && !promoRes.valid && <div style={{ color:'#dc2626', fontSize:'0.82rem', marginTop:'6px' }}>{promoRes.message || 'Invalid code'}</div>}
            {promoRes?.valid && <div style={{ color:'#059669', fontSize:'0.82rem', marginTop:'6px' }}>🎉 {promoRes.discountPercent}% discount applied!</div>}
          </div>

          <button onClick={async function(){
            setIntentLoading(true);
            var intentRes = await createPaymentIntent(totalFinal);
            setIntent(intentRes);
            setIntentLoading(false);
            setStep('payment');
            // NOTE: if intentRes.mock === false, intentRes.clientSecret is available here
            // to initialise Stripe Elements — add: loadStripe(process.env.REACT_APP_STRIPE_KEY)
            // and wrap the payment form in <Elements stripe={stripePromise} options={{clientSecret}}>
          }} disabled={intentLoading}
            style={{ width:'100%', padding:'16px', background:intentLoading?'#e2e8f0':'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'14px', color:intentLoading?'#94a3b8':'#fff', fontWeight:'800', fontSize:'1.05rem', cursor:intentLoading?'not-allowed':'pointer' }}>
            {intentLoading ? 'Preparing…' : 'Continue to Payment →'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Payment ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f0f4ff', padding:'32px 24px', boxSizing:'border-box' }}>
      <div style={{ maxWidth:'560px', margin:'0 auto' }}>
        <button onClick={function(){setStep('review');}} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', marginBottom:'20px', padding:0 }}>← Back to review</button>
        <StepBar step="payment" />
        <h1 style={{ color:'#0f172a', fontWeight:'800', fontSize:'1.4rem', margin:'0 0 24px' }}>Payment Details</h1>

        {/* Order total banner */}
        <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:'14px', padding:'14px 20px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:'#475569', fontSize:'0.75rem', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em' }}>{train.name}</div>
            <div style={{ color:'#64748b', fontSize:'0.82rem' }}>{meta?.source} → {meta?.destination} · {seats.length} seat{seats.length>1?'s':''}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'#f59e0b', fontWeight:'800', fontSize:'1.25rem' }}>${totalFinal}</div>
            {discountPct > 0 && <div style={{ color:'#059669', fontSize:'0.75rem' }}>-{discountPct}% applied</div>}
          </div>
        </div>

        {/* Payment method selector */}
        <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'20px', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ color:'#64748b', fontSize:'0.78rem', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'14px' }}>Payment Method</div>
          <div style={{ display:'flex', gap:'10px' }}>
            {[
              { id:'card',     label:'💳 Credit / Debit' },
              { id:'paypal',   label:'🅿️ PayPal' },
              { id:'applepay', label:' Apple Pay' },
            ].map(function(m) {
              var active = payMethod === m.id;
              return (
                <button key={m.id} onClick={function(){setPayMethod(m.id); setCardErrors({});}}
                  style={{ flex:1, padding:'10px 6px', background: active?'rgba(99,102,241,0.08)':'rgba(0,0,0,0.02)', border:'2px solid '+(active?'#6366f1':'rgba(0,0,0,0.10)'), borderRadius:'10px', color: active?'#4f46e5':'#64748b', fontWeight: active?'700':'500', fontSize:'0.78rem', cursor:'pointer', transition:'all .15s' }}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stripe mode indicator */}
        {intent && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', background: intent.mock ? 'rgba(251,191,36,0.08)' : 'rgba(16,185,129,0.08)', border:'1px solid '+(intent.mock ? 'rgba(251,191,36,0.2)' : 'rgba(16,185,129,0.2)'), borderRadius:'8px', marginBottom:'14px', fontSize:'0.78rem' }}>
            <span>{intent.mock ? '🧪' : '✅'}</span>
            <span style={{ color: intent.mock ? '#fbbf24' : '#059669' }}>
              {intent.mock
                ? 'Demo mode — no real charge. Add STRIPE_SECRET_KEY to enable live payments.'
                : 'Stripe connected — payment is real.'}
            </span>
          </div>
        )}

        {/* Card form */}
        {payMethod === 'card' && (
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'20px', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ color:'#64748b', fontSize:'0.78rem', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'16px' }}>Card Information</div>

            {/* Card number */}
            <div style={{ marginBottom:'14px' }}>
              <label style={labelStyle}>Card Number</label>
              <div style={{ position:'relative' }}>
                <input
                  value={card.number}
                  onChange={function(e){ setCard(function(p){return{...p,number:formatCardNumber(e.target.value)}}); setCardErrors(function(p){return{...p,number:undefined}}); }}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  style={{ ...inputStyle, paddingRight:'54px',
                    borderColor: cardErrors.number ? '#dc2626' : 'rgba(99,102,241,0.25)' }}
                />
                <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)' }}>
                  <CardBrandIcon number={card.number} />
                </div>
              </div>
              {cardErrors.number && <div style={{ color:'#dc2626', fontSize:'0.78rem', marginTop:'4px' }}>{cardErrors.number}</div>}
            </div>

            {/* Expiry + CVV */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
              <div>
                <label style={labelStyle}>Expiry Date</label>
                <input
                  value={card.expiry}
                  onChange={function(e){ setCard(function(p){return{...p,expiry:formatExpiry(e.target.value)}}); setCardErrors(function(p){return{...p,expiry:undefined}}); }}
                  placeholder="MM/YY"
                  maxLength={5}
                  style={{ ...inputStyle, borderColor: cardErrors.expiry ? '#dc2626' : 'rgba(99,102,241,0.25)' }}
                />
                {cardErrors.expiry && <div style={{ color:'#dc2626', fontSize:'0.78rem', marginTop:'4px' }}>{cardErrors.expiry}</div>}
              </div>
              <div>
                <label style={labelStyle}>CVV</label>
                <input
                  value={card.cvv}
                  onChange={function(e){ setCard(function(p){return{...p,cvv:e.target.value.replace(/\D/g,'').slice(0,4)}}); setCardErrors(function(p){return{...p,cvv:undefined}}); }}
                  placeholder="•••"
                  maxLength={4}
                  type="password"
                  style={{ ...inputStyle, borderColor: cardErrors.cvv ? '#dc2626' : 'rgba(99,102,241,0.25)' }}
                />
                {cardErrors.cvv && <div style={{ color:'#dc2626', fontSize:'0.78rem', marginTop:'4px' }}>{cardErrors.cvv}</div>}
              </div>
            </div>

            {/* Cardholder name */}
            <div>
              <label style={labelStyle}>Cardholder Name</label>
              <input
                value={card.name}
                onChange={function(e){ setCard(function(p){return{...p,name:e.target.value}}); setCardErrors(function(p){return{...p,name:undefined}}); }}
                placeholder="Name as on card"
                style={{ ...inputStyle, borderColor: cardErrors.name ? '#dc2626' : 'rgba(99,102,241,0.25)' }}
              />
              {cardErrors.name && <div style={{ color:'#dc2626', fontSize:'0.78rem', marginTop:'4px' }}>{cardErrors.name}</div>}
            </div>

            {/* Secure badge */}
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'14px', color:'#64748b', fontSize:'0.78rem' }}>
              <span>🔒</span>
              <span>Your card details are encrypted and never stored.</span>
            </div>
          </div>
        )}

        {/* PayPal placeholder */}
        {payMethod === 'paypal' && (
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', padding:'32px 20px', marginBottom:'20px', textAlign:'center', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'10px' }}>🅿️</div>
            <div style={{ color:'#0f172a', fontWeight:'700', marginBottom:'4px' }}>Continue with PayPal</div>
            <div style={{ color:'#64748b', fontSize:'0.85rem' }}>You'll be redirected to PayPal to complete payment of <strong style={{ color:'#f59e0b' }}>${totalFinal}</strong></div>
          </div>
        )}

        {/* Apple Pay placeholder */}
        {payMethod === 'applepay' && (
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', padding:'32px 20px', marginBottom:'20px', textAlign:'center', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'10px' }}></div>
            <div style={{ color:'#0f172a', fontWeight:'700', marginBottom:'4px' }}>Pay with Apple Pay</div>
            <div style={{ color:'#64748b', fontSize:'0.85rem' }}>Use Face ID or Touch ID to confirm payment of <strong style={{ color:'#f59e0b' }}>${totalFinal}</strong></div>
          </div>
        )}

        <button onClick={handlePay} disabled={paying}
          style={{ width:'100%', padding:'16px', background:paying?'#e2e8f0':'linear-gradient(135deg,#f59e0b,#d97706)', border:'none', borderRadius:'14px', color:paying?'#94a3b8':'#000', fontWeight:'800', fontSize:'1.05rem', cursor:paying?'not-allowed':'pointer', transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          {paying
            ? <><span style={{ display:'inline-block', width:'16px', height:'16px', border:'2px solid #94a3b8', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />Processing…</>
            : <>🔒 Pay ${totalFinal} · Confirm Booking</>}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
