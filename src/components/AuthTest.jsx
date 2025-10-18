// src/components/AuthTest.jsx
import React, { useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { authAPI, testAPI, debugAPI } from '../services/api';

const AuthTest = () => {
  const { accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [backendProfile, setBackendProfile] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [errors, setErrors] = useState({});
  const [tokenExists, setTokenExists] = useState(false);

  useEffect(() => {
    // Verificar si el token está guardado
    const checkToken = () => {
      const token = sessionStorage.getItem('accessToken');
      setTokenExists(!!token);
      if (token) {
        console.log('🔑 Token encontrado:', token.substring(0, 20) + '...');
      }
    };

    checkToken();
    // Verificar cada segundo si hay cambios
    const interval = setInterval(checkToken, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const testConnections = async () => {
      console.log('🧪 AuthTest: Iniciando pruebas de conexión...');
      
      // Test 1: Backend health (sin autenticación)
      try {
        const health = await testAPI.healthCheck();
        console.log('✅ AuthTest: Health check exitoso:', health.data);
        setBackendHealth(health.data);
        setErrors(prev => ({ ...prev, health: null }));
      } catch (error) {
        console.error('❌ AuthTest: Error en health check:', error.message);
        setErrors(prev => ({ ...prev, health: error.message }));
      }

      // Test 2: Backend auth endpoint (con autenticación)
      // SOLO intentar si está autenticado Y tiene token
      if (isAuthenticated && tokenExists) {
        console.log('🔐 AuthTest: Usuario autenticado con token, probando endpoint protegido...');
        try {
          const profile = await authAPI.getUserProfile();
          console.log('✅ AuthTest: Perfil obtenido:', profile.data);
          setBackendProfile(profile.data);
          setErrors(prev => ({ ...prev, profile: null }));
        } catch (error) {
          console.error('❌ AuthTest: Error obteniendo perfil (NO redirigir):', error.message);
          // NO hacer nada más, el interceptor ya manejó el error
          setErrors(prev => ({ ...prev, profile: error.message }));
        }

        // Test 3: Debug endpoint (con token)
        try {
          const debugResponse = await debugAPI.getTokenInfo();
          console.log('🔍 AuthTest: Debug info obtenida:', debugResponse.data);
          setDebugInfo(debugResponse.data);
          setErrors(prev => ({ ...prev, debug: null }));
        } catch (error) {
          console.error('❌ AuthTest: Error obteniendo debug info:', error.message);
          setErrors(prev => ({ ...prev, debug: error.message }));
        }
      } else {
        console.log('⏭️ AuthTest: Saltando prueba de perfil (no autenticado o sin token)');
      }
    };

    testConnections();
  }, [isAuthenticated, tokenExists]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🔧 Auth Test Panel</h4>
      
      {/* Estado de autenticación */}
      <div style={{ marginBottom: '8px' }}>
        <strong>Autenticado:</strong> {isAuthenticated ? '✅ Sí' : '❌ No'}
      </div>

      {/* Información de MSAL */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <strong>Usuario MSAL:</strong><br/>
          {accounts[0].name}<br/>
          <small>{accounts[0].username}</small>
        </div>
      )}

      {/* Token guardado */}
      <div style={{ marginBottom: '8px' }}>
        <strong>Token guardado:</strong> {tokenExists ? '✅ Sí' : '❌ No'}
        {tokenExists && (
          <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px' }}>
            Token activo en sessionStorage
          </div>
        )}
      </div>

      {/* Backend health */}
      <div style={{ marginBottom: '8px' }}>
        <strong>Backend health:</strong> {backendHealth ? '✅ OK' : errors.health ? '❌ Error' : '⏳ Cargando...'}
        {errors.health && <div style={{ color: 'red', fontSize: '10px' }}>{errors.health}</div>}
      </div>

      {/* Backend auth */}
      <div style={{ marginBottom: '8px' }}>
        <strong>Backend auth:</strong> {backendProfile ? '✅ OK' : errors.profile ? '❌ Error' : '⏳ Cargando...'}
        {backendProfile && (
          <div style={{ fontSize: '10px', marginTop: '4px' }}>
            <strong>Rol:</strong> {backendProfile.roles?.join(', ') || 'No asignado'}
          </div>
        )}
        {errors.profile && <div style={{ color: 'red', fontSize: '10px' }}>{errors.profile}</div>}
      </div>

      {/* Debug info - Mostrar detalles del token */}
      {debugInfo && (
        <details style={{ marginBottom: '8px', fontSize: '10px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
            🔍 Token Debug Info
          </summary>
          <div style={{ marginTop: '4px', paddingLeft: '8px' }}>
            <div><strong>Authenticated:</strong> {debugInfo.authenticated ? '✅' : '❌'}</div>
            {debugInfo.jwtClaims && (
              <>
                <div><strong>Subject:</strong> {debugInfo.jwtClaims.subject}</div>
                <div><strong>Issuer:</strong> {debugInfo.jwtClaims.issuer}</div>
                <div><strong>Audience:</strong> {JSON.stringify(debugInfo.jwtClaims.audience)}</div>
              </>
            )}
            {errors.debug && <div style={{ color: 'red' }}>{errors.debug}</div>}
          </div>
        </details>
      )}

      <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
        💡 Este panel es solo para desarrollo
      </div>
    </div>
  );
};

export default AuthTest;
