// src/components/ProtectedRoute.jsx
import React, { useEffect } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import Login from './Login';
import './LoadingSpinner.css';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress, accounts, instance } = useMsal();
  const token = sessionStorage.getItem('accessToken');
  
  // Debug: Log cada vez que cambie el estado
  useEffect(() => {
    console.log('🛡️ ProtectedRoute Estado:', {
      isAuthenticated,
      inProgress,
      accountsLength: accounts.length,
      hasToken: !!token,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [isAuthenticated, inProgress, accounts.length, token]);

  // Mostrar spinner mientras MSAL está procesando
  if (inProgress === 'login' || inProgress === 'logout' || inProgress === 'acquireToken') {
    console.log('⏳ ProtectedRoute: Mostrando spinner, inProgress =', inProgress);
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Si no está autenticado pero tiene token, esperar
  if (!isAuthenticated && token) {
    console.log('⏳ ProtectedRoute: Tiene token pero no autenticado, esperando...');
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verificando sesión...</p>
      </div>
    );
  }

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    console.log('🔒 ProtectedRoute: No autenticado, mostrando Login');
    return <Login />;
  }

  // Usuario autenticado correctamente
  console.log('✅ ProtectedRoute: Usuario autenticado, mostrando contenido');
  return children;
};

export default ProtectedRoute;
