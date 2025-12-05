// src/components/Login.jsx
import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import '../styles/Login.css';

const Login = () => {
  const { instance } = useMsal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Usar redirect en lugar de popup para mantener la sesión
      await instance.loginRedirect(loginRequest);
      // El redirect llevará al usuario a Microsoft y volverá a esta página
      // No hay código después porque la página se recarga
    } catch (err) {
      console.error('Error durante el login:', err);
      setError('Error al iniciar sesión. Por favor, intenta nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Imagen de fondo */}
      <div 
        className="login-background"
        style={{ backgroundImage: `url(/Login.png)` }}
      />
      
      {/* Overlay oscuro para mejorar legibilidad */}
      <div className="login-overlay" />
      
      {/* Contenido del login (segundo tercio horizontal) */}
      <div className="login-content">
        <div className="login-card">
          {/* Logo o título */}
          <div className="login-header">
            <h1 className="login-title">F4U Airlines</h1>
            <p className="login-subtitle">Sistema de Reservas de Vuelos</p>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="login-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Botón de login */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="login-button"
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <svg className="microsoft-icon" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                <span>Iniciar sesión con Microsoft</span>
              </>
            )}
          </button>

          {/* Información adicional */}
          <div className="login-info">
            <p className="info-text">
              🔒 Autenticación segura mediante Microsoft Entra ID
            </p>
            <p className="info-text-small">
              Al iniciar sesión, aceptas nuestros términos y condiciones
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>© 2025 F4U Airlines. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
