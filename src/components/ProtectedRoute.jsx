// src/components/ProtectedRoute.jsx
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { useEffect, useState } from 'react';
import './LoadingSpinner.css';

export const redirectToHome = () => {
  if (typeof window?.location?.assign === 'function') {
    window.location.assign('/');
  } else if (window?.location) {
    window.location.href = '/';
  }
};

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress, accounts, instance } = useMsal();
  const token = sessionStorage.getItem('accessToken');
  const [isChecking, setIsChecking] = useState(true);
  
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

  // Verificar autenticación y redirigir si es necesario
  useEffect(() => {
    const checkAuth = async () => {
      // Esperar un momento para que MSAL termine de inicializar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Si no está autenticado y no hay proceso en curso, redirigir
      if (!isAuthenticated && inProgress === 'none' && !token) {
        console.log('🔒 ProtectedRoute: No autenticado, redirigiendo a home...');
        // Pequeño delay para mostrar mensaje
        setTimeout(() => {
          redirectToHome();
        }, 1500);
      }
      
      setIsChecking(false);
    };

    if (inProgress === 'none') {
      checkAuth();
    }
  }, [isAuthenticated, inProgress, token]);

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

  // Si está verificando la autenticación inicial
  if (isChecking) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verificando sesión...</p>
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

  // Si no está autenticado después de la verificación, mostrar mensaje y redirigir
  if (!isAuthenticated) {
    console.log('🔒 ProtectedRoute: No autenticado, mostrando mensaje de redirección');
    return (
      <div className="loading-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Acceso Restringido</h2>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>
            Debes iniciar sesión para acceder a esta página
          </p>
          <div className="loading-spinner" style={{ margin: '1rem auto' }}></div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Redirigiendo a la página principal...
          </p>
        </div>
      </div>
    );
  }

  // Usuario autenticado correctamente
  console.log('✅ ProtectedRoute: Usuario autenticado, mostrando contenido');
  return children;
};

export default ProtectedRoute;
