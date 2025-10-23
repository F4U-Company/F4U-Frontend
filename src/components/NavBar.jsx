// src/components/NavBar.jsx
import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { authAPI } from '../services/api';
import '../styles/NavBar.css';

const NavBar = () => {
  const { instance, accounts } = useMsal();
  const [userProfile, setUserProfile] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    // Obtener información del usuario del backend
    const fetchUserProfile = async () => {
      try {
        const response = await authAPI.getUserProfile();
        setUserProfile(response.data);
      } catch (error) {
        console.error('Error al obtener perfil:', error);
        // Usar datos de MSAL como fallback
        if (accounts[0]) {
          setUserProfile({
            displayName: accounts[0].name,
            email: accounts[0].username,
            roles: ['USUARIO']
          });
        }
      }
    };

    if (accounts[0]) {
      fetchUserProfile();
    }
  }, [accounts]);

  const handleLogout = () => {
    sessionStorage.clear();
    instance.logoutPopup({
      mainWindowRedirectUri: '/'
    });
  };

  const userName = userProfile?.displayName || accounts[0]?.name || 'Usuario';
  const userEmail = userProfile?.email || accounts[0]?.username || '';
  const userRole = userProfile?.roles?.[0] || 'USUARIO'; // Tomar el primer rol del array

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <span className="brand-icon">✈️</span>
          <span className="brand-text">F4U Airlines</span>
        </div>

        {/* Usuario y menú */}
        <div className="navbar-user">
          <div className="user-info" onClick={() => setShowMenu(!showMenu)}>
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{userName}</span>
              <span className="user-role">{userRole}</span>
            </div>
            <svg 
              className={`dropdown-icon ${showMenu ? 'open' : ''}`}
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="currentColor"
            >
              <path d="M4 6l4 4 4-4z"/>
            </svg>
          </div>

          {/* Menú desplegable */}
          {showMenu && (
            <>
              <div className="menu-overlay" onClick={() => setShowMenu(false)} />
              <div className="dropdown-menu">
                <div className="menu-header">
                  <div className="menu-user-avatar">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="menu-user-info">
                    <div className="menu-user-name">{userName}</div>
                    <div className="menu-user-email">{userEmail}</div>
                  </div>
                </div>
                
                <div className="menu-divider" />
                
                <button className="menu-item" onClick={() => alert('Perfil - En desarrollo')}>
                  <span className="menu-icon">👤</span>
                  <span>Mi Perfil</span>
                </button>
                
                <button className="menu-item" onClick={() => alert('Reservas - En desarrollo')}>
                  <span className="menu-icon">🎫</span>
                  <span>Mis Reservas</span>
                </button>
                
                <div className="menu-divider" />
                
                <button className="menu-item logout" onClick={handleLogout}>
                  <span className="menu-icon">🚪</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
