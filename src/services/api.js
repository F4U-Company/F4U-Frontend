// src/services/api.js
import axios from 'axios';

// URL base del backend - cambiar según el entorno
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT solo a peticiones que lo necesitan
api.interceptors.request.use(
  (config) => {
    // Endpoints públicos que NO necesitan token
    const publicEndpoints = [
      '/api/test/',
      '/api/health/',
      '/actuator/',
      '/api/flights/',
      '/api/reservations/',
      '/api/debug/public'  // Debug público
    ];
    
    // Verificar si la URL es un endpoint público
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url.includes(endpoint)
    );
    
    // Solo agregar el token si NO es un endpoint público
    if (!isPublicEndpoint) {
      const token = sessionStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo redirigir al login si es un error 401 en un endpoint protegido
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const publicEndpoints = ['/api/test/', '/api/health/', '/actuator/', '/api/flights/', '/api/reservations/'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => url.includes(endpoint));
      
      console.log('🔍 Error 401 detectado:', {
        url,
        isPublicEndpoint,
        hasToken: !!sessionStorage.getItem('accessToken'),
        errorMessage: error.message
      });
      
      // Solo redirigir si NO es un endpoint público
      if (!isPublicEndpoint) {
        console.error('❌ Error 401 en endpoint protegido:', url);
        console.error('❌ Limpiando sesión y redirigiendo al login...');
        
        // TEMPORAL: Comentar para debuggear
        // sessionStorage.clear();
        // window.location.href = '/';
      } else {
        console.warn('⚠️ Error 401 en endpoint público (ignorando):', url);
      }
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
};

// ============ TEST ENDPOINTS ============
export const testAPI = {
  // Health check
  healthCheck: () => api.get('/api/test/health'),
  
  // Estado de la base de datos
  dbStatus: () => api.get('/api/test/db-status'),
};

// ============ DEBUG ENDPOINTS ============
export const debugAPI = {
  // Información del token (endpoint protegido)
  getTokenInfo: () => api.get('/api/debug/token-info'),
  
  // Endpoint público de debug
  publicDebug: () => api.get('/api/debug/public'),
};

// ============ FLIGHT ENDPOINTS ============
export const flightAPI = {
  // Obtener todos los vuelos
  getAllFlights: () => api.get('/api/flights'),
  
  // Buscar vuelos
  searchFlights: (params) => api.get('/api/flights/search', { params }),
};

// ============ RESERVATION ENDPOINTS ============
export const reservationAPI = {
  // Crear reserva
  createReservation: (data) => api.post('/api/reservations', data),
  
  // Obtener reservas del usuario
  getUserReservations: () => api.get('/api/reservations/user'),
  
  // Cancelar reserva
  cancelReservation: (id) => api.delete(`/api/reservations/${id}`),
};

export default api;
