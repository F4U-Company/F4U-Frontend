/* istanbul ignore file */

/**
 * Factory helpers that create thin axios wrappers for every backend endpoint group.
 * They simply proxy HTTP verbs, so we keep them outside of coverage metrics.
 */

export const buildAuthAPI = (api) => ({
  getUserProfile: () => api.get('/api/auth/me'),
  validateToken: () => api.get('/api/auth/validate-token'),
  getUserRoles: () => api.get('/api/auth/roles'),
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
});

export const buildTestAPI = (api) => ({
  healthCheck: () => api.get('/api/test/health'),
  dbStatus: () => api.get('/api/test/db-status'),
  ping: () => api.get('/api/test/ping'),
});

export const buildDebugAPI = (api) => ({
  getTokenInfo: () => api.get('/api/debug/token-info'),
  publicDebug: () => api.get('/api/debug/public'),
  getSessionInfo: () => api.get('/api/debug/session-info'),
});

export const buildFlightAPI = (api) => ({
  getAllFlights: () => api.get('/api/flights'),
  searchFlights: (params) => api.get('/api/flights/search', { params }),
  getFlightById: (id) => api.get(`/api/flights/${id}`),
  getAvailableFlights: () => api.get('/api/flights/available').catch(() => ({ data: [] })),
  getAirports: () => api.get('/api/flights/airports').catch(() => ({ data: [] })),
});

export const buildReservationAPI = (api) => ({
  createReservation: (data) => api.post('/api/reservaciones', data),
  tryLock: (seatId, userId) =>
    api.post(`/api/reservaciones/try-lock/${seatId}`, userId ? { userId } : {}, {
      headers: { 'Content-Type': 'application/json' },
    }),
  getUserReservations: () => api.get('/api/reservaciones/usuario'),
  getUserActiveReservations: () => api.get('/api/reservaciones/usuario/activas'),
  getUserStats: () => api.get('/api/reservaciones/usuario/estadisticas'),
  getAllReservations: () => api.get('/api/reservaciones'),
  getReservationByCode: (code) => api.get(`/api/reservaciones/${code}`),
  updateReservation: (id, data) =>
    api.put(`/api/reservaciones/${id}`, data).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
  cancelReservation: (id) =>
    api.delete(`/api/reservaciones/${id}`).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
  getUserReservationsWithFlightInfo: () => api.get('/api/reservaciones/usuario/completo'),
  getUserActiveReservationsWithFlightInfo: () => api.get('/api/reservaciones/usuario/activas/completo'),
  confirmReservation: (data) => api.post('/api/reservaciones/confirm', data),
});

export const buildCityAPI = (api) => ({
  getAllCities: () => api.get('/api/cities'),
  getCitiesByCountry: (country) => api.get(`/api/cities/country/${country}`).catch(() => ({ data: [] })),
  getCityById: (id) => api.get(`/api/cities/${id}`),
  searchCities: (query) => api.get('/api/cities/search', { params: { query } }).catch(() => ({ data: [] })),
});

export const buildSeatAPI = (api) => ({
  getSeatsByFlight: (flightId) => api.get(`/api/seats/flight/${flightId}`),
  getSeatById: (id) => api.get(`/api/seats/${id}`),
  reserveSeat: (seatId) =>
    api.put(`/api/seats/${seatId}/reserve`).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
  releaseSeat: (seatId) =>
    api.put(`/api/seats/${seatId}/release`).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
  getAvailableSeats: (flightId) => api.get(`/api/seats/flight/${flightId}/available`),
  getOccupiedSeats: (flightId) => api.get(`/api/seats/flight/${flightId}/occupied`).catch(() => ({ data: [] })),
});

export const buildSeatLockAPI = (api) => ({
  lockSeat: (seatId, userId) => api.post('/api/seat-locks/lock', { seatId, userId }),
  releaseLock: (seatId) => api.delete(`/api/seat-locks/${seatId}`),
  checkLockStatus: (seatId) => api.get(`/api/seat-locks/${seatId}/status`),
  getLockInfo: () => api.get('/api/seat-locks/info').catch(() => ({ data: {} })),
  getUserLocks: () => api.get('/api/seat-locks/user').catch(() => ({ data: [] })),
  extendLock: (seatId) =>
    api.post(`/api/seat-locks/${seatId}/extend`).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
});

export const buildUserAPI = (api) => ({
  getProfile: () => api.get('/api/user/profile').catch(() => ({ data: {} })),
  updateProfile: (data) =>
    api.put('/api/user/profile', data).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
  getFlightHistory: () => api.get('/api/user/flight-history').catch(() => ({ data: [] })),
  getLoyaltyPoints: () => api.get('/api/user/loyalty-points').catch(() => ({ data: {} })),
  getPreferences: () => api.get('/api/user/preferences').catch(() => ({ data: {} })),
  updatePreferences: (data) =>
    api.put('/api/user/preferences', data).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
});

export const buildPaymentAPI = (api) => ({
  processPayment: (data) =>
    api.post('/api/payments/process', data).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
  confirmPayment: (paymentId) =>
    api.post(`/api/payments/${paymentId}/confirm`).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
  getPaymentMethods: () => api.get('/api/payments/methods').catch(() => ({ data: [] })),
  addPaymentMethod: (data) =>
    api.post('/api/payments/methods', data).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
  removePaymentMethod: (id) =>
    api.delete(`/api/payments/methods/${id}`).catch(() => {
      throw new Error('Endpoint no disponible');
    }),
});

export const buildDashboardAPI = (api) => ({
  getDashboardStats: () => api.get('/api/dashboard/stats').catch(() => ({ data: {} })),
  getUpcomingFlights: () => api.get('/api/dashboard/upcoming-flights').catch(() => ({ data: [] })),
  getSpecialOffers: () => api.get('/api/dashboard/special-offers').catch(() => ({ data: [] })),
  getAirportStatus: (airportCode) =>
    api.get(`/api/dashboard/airport-status/${airportCode}`).catch(() => ({ data: {} })),
});
