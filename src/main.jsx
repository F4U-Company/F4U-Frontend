import React from "react";
import ReactDOM from "react-dom/client";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import App from "./App";
import { msalConfig } from "./authConfig";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";

// Crear instancia de MSAL
const msalInstance = new PublicClientApplication(msalConfig);

// Inicializar MSAL y manejar la respuesta del redirect
msalInstance.initialize().then(() => {
  // Manejar el evento de login exitoso
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS) {
      console.log('✅ Login exitoso:', event);
      const account = event.payload.account;
      msalInstance.setActiveAccount(account);
      
      // Guardar el token del payload si está disponible
      if (event.payload.accessToken) {
        sessionStorage.setItem('accessToken', event.payload.accessToken);
        console.log('✅ Token guardado desde event callback');
      }
    }
    
    if (event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) {
      console.log('✅ Token adquirido:', event);
      if (event.payload.accessToken) {
        sessionStorage.setItem('accessToken', event.payload.accessToken);
        console.log('✅ Token actualizado desde acquire token');
      }
    }
  });

  // Renderizar la aplicación
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
});
