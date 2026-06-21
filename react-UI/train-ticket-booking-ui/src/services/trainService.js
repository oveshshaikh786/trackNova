import api from './api';

// ---- Stations ----
export const getStations = async () => {
  const res = await api.get('/api/stations');
  return res.data;
};

// ---- Trains ----
export const searchTrains = async (source, destination) => {
  const res = await api.get('/api/trains/search', { params: { source, destination } });
  if (typeof res.data === 'string' || res.data?.message) return [];
  return res.data;
};

// ---- Bookings ----
export const fetchBookings = async (userId) => {
  const res = await api.get('/api/bookings', { params: { userId } });
  return res.data;
};

/**
 * POST /api/book
 * body: { userId, trainId, row, col, source, destination, dateOfTravel }
 */
export const bookSeat = async (userId, trainId, row, col, source, destination, dateOfTravel) => {
  const res = await api.post('/api/book', {
    userId, trainId, row, col, source, destination, dateOfTravel,
  });
  return res.data;
};

export const cancelBooking = async (ticketId, userId) => {
  const res = await api.delete(`/api/cancel/${ticketId}`, { params: { userId } });
  return res.data;
};

// ---- Profile ----
export const getProfile = async (userId) => {
  const res = await api.get('/api/profile', { params: { userId } });
  return res.data;
};

export const updateProfile = async (profileData) => {
  const res = await api.put('/api/profile', profileData);
  return res.data;
};

// ---- Admin ----
export const adminGetUsers = async () => {
  const res = await api.get('/api/admin/users');
  return res.data;
};

export const adminGetBookings = async () => {
  const res = await api.get('/api/admin/bookings');
  return res.data;
};

export const adminGetTrains = async () => {
  const res = await api.get('/api/admin/trains');
  return res.data;
};

export const adminDeleteTrain = async (trainId) => {
  const res = await api.delete(`/api/admin/trains/${trainId}`);
  return res.data;
};

export const adminSetUserRole = async (userId, role) => {
  const res = await api.put(`/api/admin/users/${userId}/role`, { role });
  return res.data;
};

export const adminDeleteUser = async (userId) => {
  const res = await api.delete(`/api/admin/users/${userId}`);
  return res.data;
};

export const adminResetPassword = async (userId, newPassword) => {
  const res = await api.put(`/api/admin/users/${userId}/password`, { newPassword });
  return res.data;
};

export const changeOwnPassword = async (userId, currentPassword, newPassword) => {
  const res = await api.put('/api/profile/password', { userId, currentPassword, newPassword });
  return res.data;
};

// ---- PredictRail ----
export const getDelayForecast = async (trainId, date) => {
  try {
    const res = await api.get('/api/trains/delay-forecast', { params: { trainId, date } });
    return res.data;
  } catch {
    return null;
  }
};

// ---- WindowAI ----
export const getWaypoints = async (trainId) => {
  const res = await api.get(`/api/waypoints/${trainId}`);
  return res.data;
};

export const getJourneyState = async (trainId, departureTime, currentTime) => {
  const res = await api.get('/api/journey/current', { params: { trainId, departureTime, currentTime } });
  return res.data;
};

// ---- Fresh single train (for seat availability) ----
export const getTrain = async (trainId) => {
  const res = await api.get(`/api/trains/${trainId}`);
  return res.data;
};

// ---- Departure Board ----
export const getDepartures = async () => {
  try {
    const res = await api.get('/api/departures');
    return Array.isArray(res.data) ? res.data : [];
  } catch { return []; }
};

// ---- Announcements ----
export const getAnnouncements = async () => {
  try {
    const res = await api.get('/api/announcements');
    return Array.isArray(res.data) ? res.data : [];
  } catch { return []; }
};

// ---- Promo codes ----
export const validatePromo = async (code) => {
  try {
    const res = await api.get('/api/promo/validate', { params: { code } });
    return res.data;
  } catch (e) {
    return e.response?.data || { valid: false, message: 'Invalid code' };
  }
};

// ---- Admin — revenue ----
export const adminGetRevenue = async () => {
  const res = await api.get('/api/admin/revenue');
  return res.data;
};

// ---- Admin — train status ----
export const adminSetTrainStatus = async (trainId, status, delayMinutes, statusReason) => {
  const res = await api.put(`/api/admin/trains/${trainId}/status`, { status, delayMinutes, statusReason });
  return res.data;
};

export const adminSaveTrain = async (train) => {
  const res = await api.post('/api/admin/trains', train);
  return res.data;
};

// ---- Admin — bookings ----
export const adminCancelBooking = async (ticketId) => {
  const res = await api.delete(`/api/admin/bookings/${ticketId}`);
  return res.data;
};

// ---- Admin — announcements ----
export const adminGetAnnouncements = async () => {
  const res = await api.get('/api/admin/announcements');
  return res.data;
};
export const adminCreateAnnouncement = async (message, type) => {
  const res = await api.post('/api/admin/announcements', { message, type });
  return res.data;
};
export const adminToggleAnnouncement = async (id, active) => {
  const res = await api.put(`/api/admin/announcements/${id}/toggle`, { active });
  return res.data;
};
export const adminDeleteAnnouncement = async (id) => {
  const res = await api.delete(`/api/admin/announcements/${id}`);
  return res.data;
};

// ---- Admin — promo codes ----
export const adminGetPromoCodes = async () => {
  const res = await api.get('/api/admin/promo-codes');
  return res.data;
};
export const adminCreatePromoCode = async (code, discountPercent, maxUses, expiresAt) => {
  const res = await api.post('/api/admin/promo-codes', { code, discountPercent, maxUses, expiresAt });
  return res.data;
};
export const adminDeletePromoCode = async (code) => {
  const res = await api.delete(`/api/admin/promo-codes/${code}`);
  return res.data;
};

// ---- Admin — suspend user ----
export const adminSuspendUser = async (userId, suspended) => {
  const res = await api.put(`/api/admin/users/${userId}/suspend`, { suspended });
  return res.data;
};

// ---- Payment intent (Stripe-ready, mock when no key configured) ----
export const createPaymentIntent = async (amount) => {
  try {
    const res = await api.post('/api/payment/intent', { amount, currency: 'usd' });
    return res.data; // { mock: true } or { mock: false, clientSecret: '...' }
  } catch {
    return { mock: true }; // fallback — never block booking
  }
};

// ---- Multi-seat + round-trip booking ----
export const bookSeats = async (payload) => {
  // payload: { userId, trainId, seats:[{row,col}], source, destination, dateOfTravel,
  //            promoCode?, returnTrainId?, returnDate?, returnSeats? }
  const body = {
    userId:      payload.userId,
    trainId:     payload.trainId,
    seats:       payload.seats ? payload.seats.map(s => [s.row, s.col]) : undefined,
    row:         payload.seats ? payload.seats[0]?.row : payload.row,
    col:         payload.seats ? payload.seats[0]?.col : payload.col,
    source:      payload.source,
    destination: payload.destination,
    dateOfTravel: payload.dateOfTravel,
    promoCode:   payload.promoCode || null,
    returnTrainId: payload.returnTrainId || null,
    returnDate:    payload.returnDate   || null,
    returnRow:     payload.returnSeats  ? payload.returnSeats[0]?.row : payload.returnRow,
    returnCol:     payload.returnSeats  ? payload.returnSeats[0]?.col : payload.returnCol,
    returnSeats:   payload.returnSeats  ? payload.returnSeats.map(s => [s.row, s.col]) : undefined,
  };
  const res = await api.post('/api/book', body);
  return res.data;
};

// ---- Booking search/filter ----
export const searchBookings = async (userId, query, fareClass, tripType) => {
  const res = await api.get('/api/bookings/search', {
    params: { userId, query, fareClass, tripType }
  });
  return res.data;
};

// ---- Waitlist ----
export const joinWaitlist = async (userId, trainId, source, destination, dateOfTravel, fareClass) => {
  const res = await api.post('/api/waitlist', { userId, trainId, source, destination, dateOfTravel, fareClass });
  return res.data;
};

export const getWaitlist = async (userId) => {
  const res = await api.get('/api/waitlist', { params: { userId } });
  return res.data;
};

export const cancelWaitlist = async (entryId, userId) => {
  const res = await api.delete(`/api/waitlist/${entryId}`, { params: { userId } });
  return res.data;
};
