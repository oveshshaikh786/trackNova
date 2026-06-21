import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavigationBar from './components/NavigationBar';
import DepartureBoard from './components/DepartureBoard';
import DepartureTicker from './components/DepartureTicker';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TrainSearchPage from './pages/TrainSearchPage';
import SeatBookingPage from './pages/SeatBookingPage';
import BookingsPage from './pages/BookingsPage';
import ProfilePage from './pages/ProfilePage';
import PaymentPage from './pages/PaymentPage';
import AdminPage from './pages/AdminPage';
import LiveJourneyPage from './pages/LiveJourneyPage';
import { isLoggedIn, isAdmin, getCurrentUser } from './services/authService';
import { getAnnouncements } from './services/trainService';
import { useState, useEffect } from 'react';

var ProtectedRoute = function({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
};

var AdminRoute = function({ children }) {
  return isLoggedIn() && isAdmin() ? children : <Navigate to="/search" replace />;
};

// Shows compact ticker on auth pages, full board everywhere else
function DepartureHeader() {
  var location = useLocation();
  var isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  return isAuthPage ? <DepartureTicker /> : <DepartureBoard />;
}

function AppInner() {
  var [announcements, setAnnouncements] = useState([]);
  var [dismissed, setDismissed] = useState({});

  useEffect(function() {
    if (isLoggedIn()) {
      getAnnouncements().then(setAnnouncements).catch(function(){});
    }
  }, []);

  var typeIcon = { INFO:'ℹ️', WARNING:'⚠️', ALERT:'🚨' };

  var activeAnnouncements = announcements.filter(function(a) { return a.active && !dismissed[a.id]; });

  function dismissAll() {
    setDismissed(function(d) {
      var next = { ...d };
      activeAnnouncements.forEach(function(a) { next[a.id] = true; });
      return next;
    });
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        a.sr-btn-gold:hover { background: #e09318 !important; }
        @keyframes tn-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <NavigationBar />
      {activeAnnouncements.length > 0 && (
        <div style={{ background:'linear-gradient(90deg,#312e81,#4338ca,#1e3a8a)', overflow:'hidden', height:'34px', display:'flex', alignItems:'center', position:'relative' }}>
          <div style={{ display:'inline-flex', gap:'72px', whiteSpace:'nowrap', animation:'tn-ticker ' + (activeAnnouncements.length * 18 + 20) + 's linear infinite', willChange:'transform' }}>
            {[...activeAnnouncements, ...activeAnnouncements].map(function(a, i) {
              return (
                <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:'7px', fontSize:'0.8rem', color:'rgba(255,255,255,0.92)' }}>
                  <span>{typeIcon[a.type] || '📢'}</span>
                  <span style={{ fontWeight:'600' }}>{a.message}</span>
                  <span style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.7rem', fontWeight:'500' }}>· {a.type}</span>
                </span>
              );
            })}
          </div>
          <button onClick={dismissAll} style={{ position:'absolute', right:'10px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.75)', borderRadius:'50%', width:'22px', height:'22px', cursor:'pointer', fontSize:'0.7rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
        </div>
      )}
      <DepartureHeader />
      <Routes>
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/search"   element={<ProtectedRoute><TrainSearchPage /></ProtectedRoute>} />
        <Route path="/book"     element={<ProtectedRoute><SeatBookingPage /></ProtectedRoute>} />
        <Route path="/payment"  element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
        <Route path="/journey"  element={<ProtectedRoute><LiveJourneyPage /></ProtectedRoute>} />
        <Route path="/profile"  element={
          <ProtectedRoute>
            <div style={{ maxWidth: '600px', margin: '32px auto', padding: '0 24px' }}>
              <ProfilePage />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

        <Route path="/" element={
          isLoggedIn() ? <Navigate to="/search" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}

export default App;
