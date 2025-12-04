// ==========================================
//  MSAL CONFIG - VERSION ESTÁTICA (DEBUG)
//  Ignora import.meta.env para probar si el
//  problema es .env.production o el build
// ==========================================

// ⚠️ Estos valores son seguros para frontend (no hay secretos)
const CLIENT_ID = "0758e3c8-a43d-4957-a829-8d92f911ad31";   // Tu SPA Frontend
const AUTHORITY = "https://login.microsoftonline.com/common";
const REDIRECT_URI = "https://d34hoxniq2n0jw.cloudfront.net/";
const POST_LOGOUT_REDIRECT_URI = "https://d34hoxniq2n0jw.cloudfront.net/";

const API_SCOPE = "api://0758e3c8-a43d-4957-a829-8d92f911ad31/access_as_user"; // Scope real de tu backend
const API_BASE_URL = "https://d34hoxniq2n0jw.cloudfront.net"; // Para las llamadas /api


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
    cacheLocation: "sessionStorage",
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
