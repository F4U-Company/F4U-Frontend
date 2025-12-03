// src/authConfig.js
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,  
    authority: import.meta.env.VITE_AZURE_AUTHORITY, 
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI, 
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_POST_LOGOUT_REDIRECT_URI
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Solicitud estándar de login
export const loginRequest = {
  scopes: [import.meta.env.VITE_AZURE_API_SCOPE],
};

// Solicitar token para consumir el backend
export const tokenRequest = {
  scopes: [import.meta.env.VITE_AZURE_API_SCOPE],
};
