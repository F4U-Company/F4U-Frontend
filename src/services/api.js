// src/services/api.js
import axios from 'axios';

// URL base del backend - cambiar según el entorno
const getApiBaseUrl = () => {
  // Primero intentar con la variable de entorno de Vite
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Si estamos en producción (hostname contiene azurestaticapps.net)
  if (window.location.hostname.includes('azurestaticapps.net')) {
    return 'https://backend-f4u-cyavghdvh3eyh5bc.brazilsouth-01.azurewebsites.net';
  }
  
  // Por defecto, usar localhost para desarrollo
  return 'http://localhost:8080';
};

const API_BASE_URL = getApiBaseUrl();

// Log para debugging (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:', {
    hostname: window.location.hostname,
    API_BASE_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL
  });
}

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 segundos timeout (aumentado para mejor experiencia)
});

// Interceptor para agregar el token JWT solo a peticiones que lo necesitan
api.interceptors.request.use(
  (config) => {
    // Endpoints públicos que NO necesitan token
    const publicEndpoints = [
      '/api/test',
      '/api/health',
      '/actuator',
      '/api/flights',
      '/api/cities',
      '/api/seats',
      '/api/seat-locks',
      '/api/debug/public'
    ];
    
    // Endpoints que requieren autenticación obligatoria
    const protectedEndpoints = [
      '/api/auth/me',
      '/api/auth/validate-token',
      '/api/auth/roles',
      '/api/reservaciones/usuario',
      '/api/dashboard',
      '/api/user',
      '/api/payments'
    ];
    
    // Verificar si la URL es un endpoint público
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url?.startsWith(endpoint)
    );
    
    // Verificar si la URL es un endpoint protegido
    const isProtectedEndpoint = protectedEndpoints.some(endpoint => 
      config.url?.startsWith(endpoint)
    );
    
    const token = sessionStorage.getItem('accessToken');
    
    // Si es un endpoint protegido y no hay token, rechazar la petición
    if (isProtectedEndpoint && !token) {
      console.error('🚫 Acceso denegado: Endpoint protegido sin token:', config.url);
      const error = new Error('No autorizado: Se requiere autenticación');
      error.response = {
        status: 401,
        data: { message: 'No autorizado: Se requiere autenticación' }
      };
      return Promise.reject(error);
    }
    
    // Solo agregar el token si NO es un endpoint público
    if (!isPublicEndpoint) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        if (import.meta.env.DEV) {
          console.log('🔐 Token agregado a la petición:', config.url);
        }
      } else {
        console.warn('⚠️ No se encontró token para endpoint protegido:', config.url);
      }
    } else if (import.meta.env.DEV) {
      console.log('🌐 Endpoint público (sin token):', config.url);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Error en interceptor de request:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('✅ Respuesta exitosa:', response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    const errorData = {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    };

    console.error('❌ Error en respuesta:', errorData);

    // Solo redirigir al login si es un error 401 en un endpoint protegido
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const publicEndpoints = [
        '/api/test/', 
        '/api/health/', 
        '/actuator/', 
        '/api/flights/', 
        '/api/cities/',
        '/api/reservaciones/',
        '/api/debug/public'
      ];
      const isPublicEndpoint = publicEndpoints.some(endpoint => url.includes(endpoint));
      
      if (import.meta.env.DEV) {
        console.log('🔍 Error 401 detectado:', {
          url,
          isPublicEndpoint,
          hasToken: !!sessionStorage.getItem('accessToken')
        });
      }
      
      // Solo redirigir si NO es un endpoint público
      if (!isPublicEndpoint) {
        console.error('❌ Error 401 en endpoint protegido - Limpiando sesión...');
        sessionStorage.clear();
        // Usar setTimeout para evitar problemas de navegación síncrona
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    } else if (error.response?.status === 403) {
      console.error('🚫 Error 403 - Acceso denegado');
    } else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      console.error('🌐 Error de red - Verifica tu conexión');
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏰ Timeout - La petición tardó demasiado');
    }
    
    return Promise.reject(error);
  }
);

// ============ AUTH ENDPOINTS ============
export const authAPI = {
  // Obtener información del usuario autenticado
  getUserProfile: () => api.get('/api/auth/me'),
  
  // Validar token
  validateToken: () => api.get('/api/auth/validate-token'),
  
  // Obtener roles del usuario
  getUserRoles: () => api.get('/api/auth/roles'),
  
  // Login (si es necesario en el futuro)
  login: (credentials) => api.post('/api/auth/login', credentials),
  
  // Logout (si es necesario en el futuro)
  logout: () => api.post('/api/auth/logout'),
};

// ============ TEST ENDPOINTS ============
export const testAPI = {
  // Health check
  healthCheck: () => api.get('/api/test/health'),
  
  // Estado de la base de datos
  dbStatus: () => api.get('/api/test/db-status'),
  
  // Test de conexión simple
  ping: () => api.get('/api/test/ping'),
};

// ============ DEBUG ENDPOINTS ============
export const debugAPI = {
  // Información del token (endpoint protegido)
  getTokenInfo: () => api.get('/api/debug/token-info'),
  
  // Endpoint público de debug
  publicDebug: () => api.get('/api/debug/public'),
  
  // Información de la sesión
  getSessionInfo: () => api.get('/api/debug/session-info'),
};

// ============ FLIGHT ENDPOINTS ============
export const flightAPI = {
  // Obtener todos los vuelos
  getAllFlights: () => api.get('/api/flights'),
  
  // Buscar vuelos
  searchFlights: (params) => api.get('/api/flights/search', { params }),
  
  // Obtener vuelo por ID
  getFlightById: (id) => api.get(`/api/flights/${id}`),
  
  // Obtener vuelos disponibles (si existe el endpoint)
  getAvailableFlights: () => api.get('/api/flights/available').catch(() => ({ data: [] })),
  
  // Obtener información de aeropuertos (si existe el endpoint)
  getAirports: () => api.get('/api/flights/airports').catch(() => ({ data: [] })),
};

// ============ RESERVATION ENDPOINTS ============
export const reservationAPI = {
  // Crear reserva (tabla 'reservaciones')
  createReservation: (data) => api.post('/api/reservaciones', data),
  
  // Intentar (re)bloquear asiento justo antes de confirmar
  tryLock: (seatId, userId) => api.post(`/api/reservaciones/try-lock/${seatId}`, userId ? { userId } : {}, {
    headers: { 'Content-Type': 'application/json' }
  }),
  
  // Obtener reservas del usuario
  getUserReservations: () => api.get('/api/reservaciones/usuario'),
  
  // Obtener reservas activas del usuario
  getUserActiveReservations: () => api.get('/api/reservaciones/usuario/activas'),
  
  // Obtener estadísticas del usuario
  getUserStats: () => api.get('/api/reservaciones/usuario/estadisticas'),
  
  // Obtener todas las reservas (admin)
  getAllReservations: () => api.get('/api/reservaciones'),
  
  // Obtener reserva por código
  getReservationByCode: (code) => api.get(`/api/reservaciones/${code}`),
  
  // Actualizar reserva (si existe el endpoint)
  updateReservation: (id, data) => api.put(`/api/reservaciones/${id}`, data).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
  
  // Cancelar reserva (si existe el endpoint)
  cancelReservation: (id) => api.delete(`/api/reservaciones/${id}`).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
  
  // Obtener reservas del usuario con información completa de vuelos
  getUserReservationsWithFlightInfo: () => api.get('/api/reservaciones/usuario/completo'),
  
  // Obtener reservas activas con información completa de vuelos
  getUserActiveReservationsWithFlightInfo: () => api.get('/api/reservaciones/usuario/activas/completo'),
  
  // Confirmar reserva (endpoint existente)
  confirmReservation: (data) => api.post('/api/reservaciones/confirm', data),
};

// ============ CITY ENDPOINTS ============
export const cityAPI = {
  // Obtener todas las ciudades activas
  getAllCities: () => api.get('/api/cities'),
  
  // Obtener ciudades por país (si existe el endpoint)
  getCitiesByCountry: (country) => api.get(`/api/cities/country/${country}`).catch(() => ({ data: [] })),
  
  // Obtener ciudad por ID
  getCityById: (id) => api.get(`/api/cities/${id}`),
  
  // Buscar ciudades (si existe el endpoint)
  searchCities: (query) => api.get('/api/cities/search', { params: { query } }).catch(() => ({ data: [] })),
};

// ============ SEAT ENDPOINTS ============
export const seatAPI = {
  // Obtener todos los asientos de un vuelo
  getSeatsByFlight: (flightId) => api.get(`/api/seats/flight/${flightId}`),
  
  // Obtener asiento por ID
  getSeatById: (id) => api.get(`/api/seats/${id}`),
  
  // Reservar un asiento (si existe el endpoint)
  reserveSeat: (seatId) => api.put(`/api/seats/${seatId}/reserve`).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
  
  // Liberar un asiento (si existe el endpoint)
  releaseSeat: (seatId) => api.put(`/api/seats/${seatId}/release`).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
  
  // Obtener asientos disponibles por vuelo
  getAvailableSeats: (flightId) => api.get(`/api/seats/flight/${flightId}/available`),
  
  // Obtener asientos ocupados por vuelo (si existe el endpoint)
  getOccupiedSeats: (flightId) => api.get(`/api/seats/flight/${flightId}/occupied`).catch(() => ({ data: [] })),
};

// ============ SEAT LOCK ENDPOINTS ============
export const seatLockAPI = {
  // Bloquear un asiento por 15 minutos
  lockSeat: (seatId, userId) => api.post('/api/seat-locks/lock', { seatId, userId }),
  
  // Liberar el bloqueo de un asiento
  releaseLock: (seatId) => api.delete(`/api/seat-locks/${seatId}`),
  
  // Verificar estado de bloqueo de un asiento
  checkLockStatus: (seatId) => api.get(`/api/seat-locks/${seatId}/status`),
  
  // Obtener información general de bloqueos (si existe el endpoint)
  getLockInfo: () => api.get('/api/seat-locks/info').catch(() => ({ data: {} })),
  
  // Obtener bloqueos del usuario actual (si existe el endpoint)
  getUserLocks: () => api.get('/api/seat-locks/user').catch(() => ({ data: [] })),
  
  // Extender bloqueo (si existe el endpoint)
  extendLock: (seatId) => api.post(`/api/seat-locks/${seatId}/extend`).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
};

// ============ USER PROFILE ENDPOINTS ============
export const userAPI = {
  // Obtener perfil del usuario (si existe el endpoint)
  getProfile: () => api.get('/api/user/profile').catch(() => ({ data: {} })),
  
  // Actualizar perfil (si existe el endpoint)
  updateProfile: (data) => api.put('/api/user/profile', data).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
  
  // Obtener historial de vuelos (si existe el endpoint)
  getFlightHistory: () => api.get('/api/user/flight-history').catch(() => ({ data: [] })),
  
  // Obtener millas y puntos (si existe el endpoint)
  getLoyaltyPoints: () => api.get('/api/user/loyalty-points').catch(() => ({ data: {} })),
  
  // Obtener preferencias (si existe el endpoint)
  getPreferences: () => api.get('/api/user/preferences').catch(() => ({ data: {} })),
  
  // Actualizar preferencias (si existe el endpoint)
  updatePreferences: (data) => api.put('/api/user/preferences', data).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
};

// ============ PAYMENT ENDPOINTS ============
export const paymentAPI = {
  // Procesar pago (si existe el endpoint)
  processPayment: (data) => api.post('/api/payments/process', data).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
  
  // Confirmar pago (si existe el endpoint)
  confirmPayment: (paymentId) => api.post(`/api/payments/${paymentId}/confirm`).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
  
  // Obtener métodos de pago guardados (si existe el endpoint)
  getPaymentMethods: () => api.get('/api/payments/methods').catch(() => ({ data: [] })),
  
  // Agregar método de pago (si existe el endpoint)
  addPaymentMethod: (data) => api.post('/api/payments/methods', data).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
  
  // Eliminar método de pago (si existe el endpoint)
  removePaymentMethod: (id) => api.delete(`/api/payments/methods/${id}`).catch(() => { 
    throw new Error('Endpoint no disponible') 
  }),
};

// ============ DASHBOARD ENDPOINTS ============
export const dashboardAPI = {
  // Obtener estadísticas del dashboard (si existe el endpoint)
  getDashboardStats: () => api.get('/api/dashboard/stats').catch(() => ({ data: {} })),
  
  // Obtener vuelos próximos (si existe el endpoint)
  getUpcomingFlights: () => api.get('/api/dashboard/upcoming-flights').catch(() => ({ data: [] })),
  
  // Obtener ofertas especiales (si existe el endpoint)
  getSpecialOffers: () => api.get('/api/dashboard/special-offers').catch(() => ({ data: [] })),
  
  // Obtener estado de aeropuertos (si existe el endpoint)
  getAirportStatus: (airportCode) => api.get(`/api/dashboard/airport-status/${airportCode}`).catch(() => ({ data: {} })),
};

// ============ UTILITY FUNCTIONS ============
export const apiUtils = {
  // Verificar si el backend está disponible
  isBackendAvailable: async () => {
    try {
      await testAPI.healthCheck();
      return true;
    } catch (error) {
      console.error('Backend no disponible:', error);
      return false;
    }
  },
  
  // Verificar autenticación
  isAuthenticated: () => {
    return !!sessionStorage.getItem('accessToken');
  },
  
  // Obtener información del token
  getTokenInfo: () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        userId: payload.sub || payload.userId,
        email: payload.email || payload.preferred_username,
        name: payload.name || payload.given_name,
        exp: payload.exp,
        roles: payload.roles || [],
        azureObjectId: payload.oid
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },
  
  // Limpiar autenticación
  clearAuth: () => {
    sessionStorage.clear();
    localStorage.removeItem('msal-account');
  },
  
  // Obtener email del usuario desde el token
  getUserEmail: () => {
    const tokenInfo = apiUtils.getTokenInfo();
    return tokenInfo?.email || null;
  },
  
  // Verificar si el token está expirado
  isTokenExpired: () => {
    const tokenInfo = apiUtils.getTokenInfo();
    if (!tokenInfo || !tokenInfo.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return tokenInfo.exp < now;
  }
};

// Exportar instancia base de axios por si se necesita
export { api, API_BASE_URL };

export default api;