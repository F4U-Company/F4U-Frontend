// src/authConfig.js
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "TU_CLIENT_ID_AQUI", // Reemplazar con tu Application (client) ID de Azure
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "TU_TENANT_ID_AQUI"}`, // Reemplazar con tu Tenant ID
    redirectUri: window.location.origin, // URL donde Azure redirige después del login
  },
  cache: {
    cacheLocation: "sessionStorage", // Usar sessionStorage en lugar de localStorage
    storeAuthStateInCookie: false, // No necesario si no usas IE11
  },
};

// Scopes que solicitaremos a Azure AD
export const loginRequest = {
  scopes: [
    `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access`
  ],
};

// Configuración del token para el backend (mismo scope que loginRequest)
export const tokenRequest = {
  scopes: [
    `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access`
  ],
};
