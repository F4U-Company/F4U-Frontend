// src/authConfig.js
// Configuración MSAL para el frontend (Vite + MSAL.js)
// Usa variables de entorno VITE_* en producción; tiene valores por defecto para CloudFront / desarrollo.

export const msalConfig = {
  auth: {
    // CLIENT ID del App Registration "F4U-Airlines"
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "0758e3c8-a43d-4957-a829-8d92f911ad31",

    // Authority: si tienes tenant específico, setéalo en VITE_AZURE_TENANT_ID (recomendado).
    // Si no, se usa "common" (multitenant + cuentas personales).
    authority: import.meta.env.VITE_AZURE_AUTHORITY
      || (import.meta.env.VITE_AZURE_TENANT_ID
          ? `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}/v2.0`
          : `https://login.microsoftonline.com/common/v2.0`
        ),

    // REDIRECT URI:
    // - En producción: preferible definir VITE_AZURE_REDIRECT_URI en tu workflow/.env
    // - Si no está, usamos la URL CloudFront (con barra final para coincidir con Azure).
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || "https://d34hoxniq2n0jw.cloudfront.net/",

    // URI donde redirigir después del logout (opcional pero recomendado)
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_POST_LOGOUT_REDIRECT_URI || "https://d34hoxniq2n0jw.cloudfront.net/",
  },

  cache: {
    // sessionStorage evita persistencia entre pestañas. Cambia a localStorage si lo necesitas.
    cacheLocation: "sessionStorage",
    // MSAL cookie toggle; no suele ser necesario para SPAs modernas con PKCE.
    storeAuthStateInCookie: false,
  },

  system: {
    loggerOptions: {
      // Deshabilita logs sensibles en producción
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (import.meta.env.DEV) console.log(level, message);
      },
      piiLoggingEnabled: false,
    },
  },
};

// ---------------- Scopes ----------------
// **IMPORTANTE**: usar EXACTAMENTE el scope expuesto en Azure: "api://f4u-api/access"
// (esto debe coincidir con "Expose an API" del App Registration del backend)
export const loginRequest = {
  scopes: [
    "api://f4u-api/access"
  ],
};

// Para peticiones al backend (obtener token con ese scope antes de llamar al API)
export const tokenRequest = {
  scopes: [
    "api://f4u-api/access"
  ],
};
