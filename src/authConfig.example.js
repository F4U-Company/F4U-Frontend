// src/authConfig.js
// INSTRUCCIONES: 
// 1. Crea una App Registration en Azure Portal
// 2. Copia el Client ID y Tenant ID 
// 3. Reemplaza los valores de abajo
// 4. Configura las Redirect URIs en Azure: http://localhost:5173

export const msalConfig = {
  auth: {
    // TODO: Reemplazar con tu Application (client) ID de Azure
    // Ejemplo: "12345678-1234-1234-1234-123456789abc"
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "TU_CLIENT_ID_AQUI",
    
    // TODO: Reemplazar con tu Directory (tenant) ID de Azure
    // Ejemplo: "https://login.microsoftonline.com/87654321-4321-4321-4321-cba987654321"
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "TU_TENANT_ID_AQUI"}`,
    
    // URL donde Azure redirige después del login
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage", // Usar sessionStorage en lugar de localStorage
    storeAuthStateInCookie: false,
  },
};

// Scopes que solicitaremos a Azure AD
export const loginRequest = {
  scopes: ["User.Read"], // Scope básico para leer perfil del usuario
};

// Configuración del token para el backend (opcional si necesitas acceso a tu API)
export const tokenRequest = {
  scopes: [`api://${msalConfig.auth.clientId}/access_as_user`],
};
