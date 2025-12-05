// ==========================================
//  MSAL CONFIG - DINÁMICO (LOCAL/PRODUCCIÓN)
// ==========================================

// Detectar si estamos en local o en producción
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ⚠️ Estos valores son seguros para frontend (no hay secretos)
const CLIENT_ID = "0758e3c8-a43d-4957-a829-8d92f911ad31";   // Tu SPA Frontend
const AUTHORITY = "https://login.microsoftonline.com/common";

// URLs dinámicas según el entorno
const REDIRECT_URI = isLocal 
  ? "http://localhost:5173/" 
  : "https://d34hoxniq2n0jw.cloudfront.net/";

const POST_LOGOUT_REDIRECT_URI = isLocal 
  ? "http://localhost:5173/" 
  : "https://d34hoxniq2n0jw.cloudfront.net/";

const API_SCOPE = "api://0758e3c8-a43d-4957-a829-8d92f911ad31/access_as_user"; // Scope real de tu backend

// Backend URL según el entorno
const API_BASE_URL = isLocal 
  ? "http://localhost:8080" 
  : "https://d34hoxniq2n0jw.cloudfront.net";

console.log('🌍 Entorno detectado:', isLocal ? 'LOCAL' : 'PRODUCCIÓN');
console.log('🔗 Redirect URI:', REDIRECT_URI);
console.log('🔗 API Base URL:', API_BASE_URL);


// ==========================================
//  EXPORT: CONFIGURACIÓN MSAL
// ==========================================
export const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: AUTHORITY,
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        // console.log(message);
      },
      piiLoggingEnabled: false,
    },
  },
};


// ==========================================
//  REQUEST PARA LOGIN
// ==========================================
export const loginRequest = {
  scopes: ["openid", "profile", "offline_access", API_SCOPE],
};


// ==========================================
//  REQUEST PARA TOKEN (API BACKEND)
// ==========================================
export const tokenRequest = {
  scopes: [API_SCOPE],
};


// ==========================================
//  (Opcional) CONFIG PARA TU API
// ==========================================
export const apiConfig = {
  baseUrl: API_BASE_URL,
  validateTokenUrl: `${API_BASE_URL}/api/auth/validate-token`,
};
