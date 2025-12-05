// src/services/api.js
import axios from 'axios';
import {
  buildAuthAPI,
  buildCityAPI,
  buildDashboardAPI,
  buildDebugAPI,
  buildFlightAPI,
  buildPaymentAPI,
  buildReservationAPI,
  buildSeatAPI,
  buildSeatLockAPI,
  buildTestAPI,
  buildUserAPI,
} from './apiEndpoints';

// URL base del backend - cambiar según el entorno
export const getApiBaseUrl = (env = import.meta.env, location = window.location) => {
  // Primero intentar con la variable de entorno de Vite
  if (env?.VITE_API_URL) {
    return env.VITE_API_URL;
  }
  
  // Si estamos en producción (hostname contiene azurestaticapps.net)
  if (location?.hostname?.includes('azurestaticapps.net')) {
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
    
    const token = localStorage.getItem('accessToken');
    
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
        '/api/test', 
        '/api/health', 
        '/actuator', 
        '/api/flights', 
        '/api/cities',
        '/api/reservaciones',
        '/api/debug/public'
      ];
      const isPublicEndpoint = publicEndpoints.some(endpoint => url.startsWith(endpoint));
      
      if (import.meta.env.DEV) {
        console.log('🔍 Error 401 detectado:', {
          url,
          isPublicEndpoint,
          hasToken: !!localStorage.getItem('accessToken')
        });
      }
      
      // Solo redirigir si NO es un endpoint público
      if (!isPublicEndpoint) {
        console.error('❌ Error 401 en endpoint protegido - Limpiando sesión...');
        localStorage.removeItem('accessToken');
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

// ============ ENDPOINT COLLECTIONS ============
export const authAPI = buildAuthAPI(api);
export const testAPI = buildTestAPI(api);
export const debugAPI = buildDebugAPI(api);
export const flightAPI = buildFlightAPI(api);
export const reservationAPI = buildReservationAPI(api);
export const cityAPI = buildCityAPI(api);
export const seatAPI = buildSeatAPI(api);
export const seatLockAPI = buildSeatLockAPI(api);
export const userAPI = buildUserAPI(api);
export const paymentAPI = buildPaymentAPI(api);
export const dashboardAPI = buildDashboardAPI(api);

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
    return !!localStorage.getItem('accessToken');
  },
  
  // Obtener información del token
  getTokenInfo: () => {
    const token = localStorage.getItem('accessToken');
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
    localStorage.removeItem('accessToken');
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