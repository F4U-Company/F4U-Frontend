// src/authConfig.js
// Configuración MSAL para una SPA con Vite (import.meta.env)
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID, // Frontend SPA app (F4U-Airlines)
    authority: import.meta.env.VITE_AZURE_AUTHORITY, // https://login.microsoftonline.com/{TENANT_ID}
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI, // CloudFront o localhost en dev
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_POST_LOGOUT_REDIRECT_URI
  },
  cache: {
    cacheLocation: "sessionStorage", // recomendado para SPA; usar localStorage si quieres persistencia entre pestañas
    storeAuthStateInCookie: false,
  },
  system: {
    // opcional: evita logs muy verbosos en prod
    loggerOptions: {
      loggerCallback: (level, message) => {
        // console.log(level, message);
      },
      piiLoggingEnabled: false
    }
  }
};

// Request para login (abrir sesión)
export const loginRequest = {
  // Se piden scopes de signin + el scope de la API backend
  scopes: ["openid", "profile", "offline_access", import.meta.env.VITE_AZURE_API_SCOPE]
};

// Request para obtener access token (para llamar al backend)
export const tokenRequest = {
  scopes: [import.meta.env.VITE_AZURE_API_SCOPE]
};
