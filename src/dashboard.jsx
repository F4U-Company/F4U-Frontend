import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { reservationAPI, authAPI, flightAPI, cityAPI } from "./services/api";
import "./styles/mainStyles/dashboard/index.css";

export default function Dashboard() {
  const { accounts, instance } = useMsal();
  const [userReservations, setUserReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalReservations: "0",
    activeReservations: "0", 
    accumulatedMiles: "0",
    level: "Bronce"
  });
  const [debugInfo, setDebugInfo] = useState({
    endpointsTested: [],
    userEmail: null,
    reservationsCount: 0
  });
  const [weatherData, setWeatherData] = useState({
    origin: null,
    destination: null
  });

  useEffect(() => {
    if (accounts[0]?.localAccountId) {
      fetchUserData();
    }
  }, [accounts[0]?.localAccountId]);

  // Función para obtener el clima de una ciudad
  const fetchWeatherData = async (cityName) => {
    try {
      const API_KEY = '895284fb2d2c50a520ea537456963d9c'; // API key de OpenWeatherMap
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${API_KEY}&units=metric&lang=es`
      );
      const data = await response.json();
      
      if (data.cod === 200) {
        return {
          temp: Math.round(data.main.temp),
          description: data.weather[0].description,
          humidity: data.main.humidity,
          icon: data.weather[0].icon,
          city: data.name
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  };

  // Actualizar clima cuando hay reservas
  useEffect(() => {
    if (userReservations.length > 0) {
      const firstReservation = userReservations[0];
      
      // Obtener ciudades desde fromCity y toCity que ya están formateadas
      const originCityName = firstReservation.fromCity;
      const destinationCityName = firstReservation.toCity;
      
      console.log("🌤️ Obteniendo clima para:", originCityName, "y", destinationCityName);
      
      if (originCityName && originCityName !== "Ciudad no disponible") {
        fetchWeatherData(originCityName).then(data => {
          if (data) {
            console.log("✅ Clima origen obtenido:", data);
            setWeatherData(prev => ({ ...prev, origin: data }));
          }
        });
      }
      
      if (destinationCityName && destinationCityName !== "Ciudad no disponible") {
        fetchWeatherData(destinationCityName).then(data => {
          if (data) {
            console.log("✅ Clima destino obtenido:", data);
            setWeatherData(prev => ({ ...prev, destination: data }));
          }
        });
      }
    }
  }, [userReservations]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(prev => ({ ...prev, endpointsTested: [] }));
      
      console.log("🔄 Iniciando carga de datos del usuario...");
      
      // TEST 1: Verificar autenticación
      try {
        console.log("🔐 Test 1 - Verificando autenticación...");
        const authResponse = await authAPI.validateToken();
        console.log("✅ Token válido:", authResponse.data);
        addDebugInfo("✅ /api/auth/validate-token");
      } catch (authError) {
        console.error("❌ Error de autenticación:", authError);
        setError("Error de autenticación. Por favor, inicia sesión nuevamente.");
        setLoading(false);
        return;
      }

      // TEST 2: Obtener perfil de usuario
      try {
        console.log("👤 Test 2 - Obteniendo perfil de usuario...");
        const userProfile = await authAPI.getUserProfile();
        const userEmail = userProfile.data.email || userProfile.data.azureObjectId;
        console.log("✅ Perfil obtenido:", userProfile.data);
        setDebugInfo(prev => ({ 
          ...prev, 
          userEmail,
          endpointsTested: [...prev.endpointsTested, "✅ /api/auth/me"]
        }));
      } catch (profileError) {
        console.error("❌ Error obteniendo perfil:", profileError);
        addDebugInfo("❌ /api/auth/me");
      }

      // TEST 3: Obtener estadísticas del usuario
      let statsData = { totalReservations: 0, activeReservations: 0, accumulatedMiles: 0, level: "Bronce" };
      try {
        console.log("📊 Test 3 - Obteniendo estadísticas...");
        const statsResponse = await reservationAPI.getUserStats();
        statsData = statsResponse.data;
        console.log("📊 Estadísticas obtenidas:", statsData);
        addDebugInfo("✅ /api/reservaciones/usuario/estadisticas");
      } catch (statsError) {
        console.error("❌ Error obteniendo estadísticas:", statsError);
        addDebugInfo("❌ /api/reservaciones/usuario/estadisticas");
      }
      
      setStats({
        totalReservations: statsData.totalReservations?.toString() || "0",
        activeReservations: statsData.activeReservations?.toString() || "0",
        accumulatedMiles: statsData.accumulatedMiles?.toLocaleString() || "0",
        level: statsData.level || "Bronce"
      });

      // TEST 4: Obtener reservas del usuario
      let reservations = [];
      try {
        console.log("📋 Test 4 - Obteniendo reservas del usuario...");
        const reservationsResponse = await reservationAPI.getUserReservations();
        reservations = reservationsResponse.data;
        console.log("📋 Reservas obtenidas:", reservations);
        setDebugInfo(prev => ({ 
          ...prev, 
          reservationsCount: reservations.length,
          endpointsTested: [...prev.endpointsTested, "✅ /api/reservaciones/usuario"]
        }));
        
        if (!reservations || reservations.length === 0) {
          console.log("📭 No hay reservas encontradas");
          setUserReservations([]);
          setLoading(false);
          return;
        }
      } catch (reservationsError) {
        console.error("❌ Error obteniendo reservas:", reservationsError);
        addDebugInfo("❌ /api/reservaciones/usuario");
        
        // Intentar con endpoint alternativo
        try {
          console.log("🔄 Intentando con endpoint alternativo...");
          const allReservationsResponse = await reservationAPI.getAllReservations();
          const allReservations = allReservationsResponse.data;
          console.log("📋 Todas las reservas:", allReservations);
          addDebugInfo("⚠️ /api/reservaciones (todas)");
          
          // Filtrar por email del usuario si es posible
          const userEmail = debugInfo.userEmail || accounts[0]?.username;
          if (userEmail) {
            reservations = allReservations.filter(res => 
              res.pasajeroEmail === userEmail
            );
            console.log("👤 Reservas filtradas por email:", reservations);
          } else {
            reservations = allReservations;
          }
        } catch (allReservationsError) {
          console.error("❌ Error obteniendo todas las reservas:", allReservationsError);
          setError("No se pudieron cargar las reservas. Verifica la conexión con el servidor.");
          setLoading(false);
          return;
        }
      }

      // TEST 5: Enriquecer reservas con información de vuelos
      try {
        console.log("✈️ Test 5 - Enriqueciendo reservas con info de vuelos...");
        const enrichedReservations = await enrichReservationsWithFlightData(reservations);
        console.log("🎫 Reservas enriquecidas:", enrichedReservations);
        
        const formattedReservations = formatReservationsData(enrichedReservations);
        setUserReservations(formattedReservations);
        addDebugInfo("✅ Reservas enriquecidas con vuelos");
      } catch (enrichError) {
        console.error("❌ Error enriqueciendo reservas:", enrichError);
        // Usar reservas básicas si falla el enriquecimiento
        const formattedReservations = formatReservationsData(reservations);
        setUserReservations(formattedReservations);
        addDebugInfo("⚠️ Reservas básicas (sin enriquecimiento)");
      }
      
    } catch (err) {
      console.error("❌ Error general fetching user data:", err);
      
      if (err.response?.status === 401) {
        setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
        sessionStorage.clear();
        setTimeout(() => window.location.href = '/', 2000);
      } else if (err.response?.status === 404) {
        setError("El servicio no está disponible temporalmente.");
      } else if (err.code === 'NETWORK_ERROR') {
        setError("Error de conexión. Verifica tu internet.");
      } else {
        setError("No se pudieron cargar los datos. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const addDebugInfo = (endpointInfo) => {
    setDebugInfo(prev => ({
      ...prev,
      endpointsTested: [...prev.endpointsTested, endpointInfo]
    }));
  };

  const enrichReservationsWithFlightData = async (reservations) => {
    if (!reservations || reservations.length === 0) return reservations;

    const enrichedReservations = [];
    
    for (const reservation of reservations) {
      try {
        if (reservation.vueloId) {
          console.log(`🔄 Obteniendo info del vuelo ${reservation.vueloId} para reserva ${reservation.id}`);
          const flightResponse = await flightAPI.getFlightById(reservation.vueloId);
          const flight = flightResponse.data;
          
          // Enriquecer con información de ciudades si está disponible
          if (flight.ciudadOrigenId) {
            try {
              const originCityResponse = await cityAPI.getCityById(flight.ciudadOrigenId);
              flight.ciudadOrigen = originCityResponse.data;
            } catch (cityError) {
              console.warn(`⚠️ No se pudo obtener ciudad origen ${flight.ciudadOrigenId}`);
            }
          }
          
          if (flight.ciudadDestinoId) {
            try {
              const destCityResponse = await cityAPI.getCityById(flight.ciudadDestinoId);
              flight.ciudadDestino = destCityResponse.data;
            } catch (cityError) {
              console.warn(`⚠️ No se pudo obtener ciudad destino ${flight.ciudadDestinoId}`);
            }
          }
          
          enrichedReservations.push({
            ...reservation,
            vuelo: flight
          });
        } else {
          enrichedReservations.push(reservation);
        }
      } catch (flightError) {
        console.error(`❌ Error obteniendo vuelo ${reservation.vueloId}:`, flightError);
        enrichedReservations.push(reservation);
      }
    }
    
    return enrichedReservations;
  };

  const formatReservationsData = (reservations) => {
    if (!reservations || reservations.length === 0) {
      return [];
    }

    return reservations.map((reservation) => {
      try {
        console.log("📝 Procesando reserva:", reservation);

        // Mapear estado de la reserva según tu backend
        const statusMap = {
          'CONFIRMADA': 'Confirmado',
          'PENDIENTE_PAGO': 'Pendiente',
          'CANCELADA': 'Cancelado',
          'COMPLETADA': 'Completado'
        };

        // Formatear precio - tu backend usa COP
        const formatPrice = (price) => {
          if (!price) return 'Precio no disponible';
          try {
            const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
            return `$${numericPrice.toLocaleString('es-CO')} COP`;
          } catch (e) {
            return 'Precio no disponible';
          }
        };

        // Obtener información REAL del vuelo desde la reserva
        const getFlightInfo = (reservation) => {
          // Si tenemos información del vuelo en la reserva, usarla
          if (reservation.vuelo) {
            const flight = reservation.vuelo;
            const originCity = flight.ciudadOrigen;
            const destinationCity = flight.ciudadDestino;
            
            return {
              from: originCity?.codigoIata || "Código no disponible",
              to: destinationCity?.codigoIata || "Código no disponible",
              fromCity: originCity?.nombre || "Ciudad no disponible",
              toCity: destinationCity?.nombre || "Ciudad no disponible",
              flightNumber: flight.numeroVuelo || `Vuelo-${reservation.vueloId}`,
              terminal: flight.terminal || "No disponible",
              gate: flight.puertaEmbarque || "No disponible",
              departureTime: flight.fechaSalida,
              arrivalTime: flight.fechaLlegada,
              duration: flight.duracionMinutos ? 
                `${Math.floor(flight.duracionMinutos / 60)}h ${flight.duracionMinutos % 60}m` : 
                "Duración no disponible"
            };
          }
          
          // Si no hay información del vuelo, usar solo datos básicos de la reserva
          return {
            from: "Origen no disponible",
            to: "Destino no disponible", 
            fromCity: "Ciudad origen no disponible",
            toCity: "Ciudad destino no disponible",
            flightNumber: reservation.codigoReservacion || `Reserva-${reservation.id}`,
            terminal: "No disponible",
            gate: "No disponible",
            duration: "Duración no disponible"
          };
        };

        const flightInfo = getFlightInfo(reservation);

        return {
          id: reservation.id,
          reservationCode: reservation.codigoReservacion || `RSV-${reservation.id}`,
          from: flightInfo.from,
          to: flightInfo.to,
          fromCity: flightInfo.fromCity,
          toCity: flightInfo.toCity,
          departure: formatTime(flightInfo.departureTime || reservation.fechaReservacion),
          arrival: formatTime(flightInfo.arrivalTime),
          date: formatDate(flightInfo.departureTime || reservation.fechaReservacion),
          price: formatPrice(reservation.precioTotal),
          status: statusMap[reservation.estado] || reservation.estado || "Estado no disponible",
          flightNumber: flightInfo.flightNumber,
          duration: flightInfo.duration,
          terminal: flightInfo.terminal,
          gate: flightInfo.gate,
          reservationData: reservation,
          // Información adicional del pasajero
          passengerName: `${reservation.pasajeroNombre || ''} ${reservation.pasajeroApellido || ''}`.trim() || 'Nombre no disponible',
          passengerEmail: reservation.pasajeroEmail || 'Email no disponible',
          travelClass: getTravelClassDisplay(reservation.clase)
        };
      } catch (error) {
        console.error("❌ Error formateando reserva:", error, reservation);
        return null;
      }
    }).filter(reservation => reservation !== null);
  };

  // Función para mostrar la clase de viaje de forma amigable
  const getTravelClassDisplay = (travelClass) => {
    if (!travelClass) return 'Clase no disponible';
    
    const classMap = {
      'ECONOMICA': 'Económica',
      'EJECUTIVA': 'Ejecutiva',
      'PRIMERA_CLASE': 'Primera Clase'
    };
    return classMap[travelClass] || travelClass;
  };

  // Funciones de utilidad
  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (e) {
      return '--:--';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return 'Fecha no disponible';
    }
  };

  // Estadísticas con colores corporativos azules
  const quickStats = [
    { 
      label: "Reservas Totales", 
      value: stats.totalReservations, 
      icon: "📋", 
      color: "#0056b3" 
    },
    { 
      label: "Reservas Activas", 
      value: stats.activeReservations, 
      icon: "✅", 
      color: "#003d82" 
    },
    { 
      label: "Millas Acumuladas", 
      value: stats.accumulatedMiles, 
      icon: "⭐", 
      color: "#0056b3" 
    },
    { 
      label: "Nivel", 
      value: stats.level, 
      icon: "🏆", 
      color: "#003d82" 
    }
  ];

  const handleLogout = () => {
    sessionStorage.clear();
    instance.logoutPopup({ 
      postLogoutRedirectUri: "/",
      mainWindowRedirectUri: "/"
    });
  };

  const handleCheckIn = async (reservationId) => {
    try {
      alert(`Check-in para reserva ${reservationId} - Funcionalidad en desarrollo`);
    } catch (error) {
      console.error("Error durante check-in:", error);
      alert("Error durante el check-in. Intenta nuevamente.");
    }
  };

  const handleViewDetails = (reservation) => {
    console.log("Detalles de reserva:", reservation);
    // Mostrar información detallada de la reserva
    const details = `
Código: ${reservation.reservationCode}
Pasajero: ${reservation.passengerName}
Email: ${reservation.passengerEmail}
Vuelo: ${reservation.flightNumber}
Ruta: ${reservation.fromCity} (${reservation.from}) → ${reservation.toCity} (${reservation.to})
Clase: ${reservation.travelClass}
Salida: ${reservation.departure} - ${reservation.date}
Terminal: ${reservation.terminal}
Puerta: ${reservation.gate}
Duración: ${reservation.duration}
Precio: ${reservation.price}
Estado: ${reservation.status}
    `.trim();
    
    alert(details);
  };

  const handleDebugInfo = () => {
    const debugText = `
🔍 INFORMACIÓN DE DEBUG

Endpoints probados:
${debugInfo.endpointsTested.join('\n')}

Usuario: ${debugInfo.userEmail || 'No disponible'}
Reservas encontradas: ${debugInfo.reservationsCount}
Reservas mostradas: ${userReservations.length}

Datos de ejemplo desde BD:
${userReservations.length > 0 ? 
  JSON.stringify(userReservations[0].reservationData, null, 2) : 
  'No hay reservas'}
    `.trim();
    
    console.log("🔍 Debug Info:", debugText);
    alert(debugText);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando tu información de reservas...</p>
          <div className="debug-info">
            <button onClick={handleDebugInfo} className="debug-btn">
              Ver Info Debug
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error al cargar los datos</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchUserData} className="retry-btn">
              Reintentar
            </button>
            <button onClick={handleDebugInfo} className="debug-btn">
              Ver Debug
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-brand">
            <div className="logo" onClick={() => window.location.href = '/'}>
              <span className="logo-text">F4U</span>
            </div>
            <h1>Mi Dashboard</h1>
          </div>
          
          <div className="header-actions">
            <div className="user-info">
              <div className="user-avatar">
                {accounts[0]?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <span className="user-name">{accounts[0]?.name || 'Usuario'}</span>
                <span className="user-tier">Miembro {stats.level}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Welcome Banner */}
        <section className="welcome-banner">
          <div className="welcome-content">
            <h2>¡Bienvenido de vuelta, {accounts[0]?.name?.split(' ')[0] || 'Viajero'}!</h2>
            <p>
              {userReservations.length > 0 
                ? `Tienes ${userReservations.length} reserva${userReservations.length > 1 ? 's' : ''} activa${userReservations.length > 1 ? 's' : ''}. ¡Todo listo para despegar!`
                : 'No tienes reservas activas. ¡Reserva tu próxima aventura!'
              }
            </p>
          </div>
          <div className="welcome-illustration">
            <span></span>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="stats-grid">
          {quickStats.map((stat, index) => (
            <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
              <div className="stat-icon" style={{ backgroundColor: stat.color }}>
                {stat.icon}
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </section>

        <div className="dashboard-content">
          {/* Reservas Section */}
          <section className="flights-section">
            <div className="section-header">
              <h2>
                {userReservations.length > 0 ? 'Tus Reservas' : 'No tienes reservas'}
              </h2>
              <div className="section-actions">
                <button className="view-all-btn" onClick={() => window.location.href = '/'}>
                  {userReservations.length > 0 ? 'Nueva Reserva' : 'Reservar Vuelo'}
                </button>
                <button className="debug-btn small" onClick={handleDebugInfo}>
                  Debug
                </button>
              </div>
            </div>
            
            {userReservations.length > 0 ? (
              <div className="flights-grid">
                {userReservations.map(reservation => (
                <div key={reservation.id} className="flight-card">
                    {/* Flight Header - Franja azul superior */}
                    <div className="flight-header">
                    <span className="reservation-code">{reservation.reservationCode}</span>
                    <div className={`flight-badge ${reservation.status.toLowerCase()}`}>
                        {reservation.status}
                    </div>
                    </div>
                    
                    <div className="flight-content">
                    {/* Sección de Ruta y Horario */}
                    <div className="flight-route">
                        <div className="route-info">
                        <span className="airport-code">{reservation.from}</span>
                        <span className="city-name">{reservation.fromCity}</span>
                        <span className="time-display">{reservation.departure}</span>
                        <span className="date-display">{reservation.date}</span>
                        </div>
                        
                        <div className="route-line">
                        <div className="route-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <div className="plane-icon">✈️</div>
                        <span className="flight-duration">{reservation.duration}</span>
                        </div>
                        
                        <div className="route-info">
                        <span className="airport-code">{reservation.to}</span>
                        <span className="city-name">{reservation.toCity}</span>
                        <span className="time-display">{reservation.arrival}</span>
                        <span className="date-display">{reservation.date}</span>
                        </div>
                    </div>
                    
                    {/* Información del Pasajero */}
                    <div className="passenger-info">
                        <span className="passenger-name">{reservation.passengerName}</span>
                        <span className="passenger-email">{reservation.passengerEmail}</span>
                        <span className="travel-class">{reservation.travelClass}</span>
                    </div>
                    
                    {/* Detalles del Vuelo */}
                    <div className="flight-details">
                        <span className="flight-number">{reservation.flightNumber}</span>
                        <div className="detail-item">
                        <span className="detail-label">Terminal</span>
                        <span className="detail-value">{reservation.terminal}</span>
                        </div>
                        <div className="detail-item">
                        <span className="detail-label">Puerta</span>
                        <span className="detail-value">{reservation.gate}</span>
                        </div>
                    </div>
                    </div>
                    
                    <div className="flight-footer">
                    <span className="flight-price">{reservation.price}</span>
                    <div className="flight-actions">
                        <button 
                        className="action-btn secondary"
                        onClick={() => handleViewDetails(reservation)}
                        >
                        Detalles
                        </button>
                        <button 
                        className="action-btn primary"
                        onClick={() => handleCheckIn(reservation.id)}
                        >
                        Check-in
                        </button>
                    </div>
                    </div>
                </div>
                ))}
              </div>
            ) : (
              <div className="no-flights">
                <div className="no-flights-icon">✈️</div>
                <h3>No tienes reservas activas</h3>
                <p>Comienza tu próxima aventura reservando un vuelo</p>
                <div className="no-flights-actions">
                  <button 
                    className="view-all-btn"
                    onClick={() => window.location.href = '/'}
                  >
                    Reservar Ahora
                  </button>
                  <button 
                    className="debug-btn"
                    onClick={handleDebugInfo}
                  >
                    Ver Info Debug
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="dashboard-sidebar">
            {/* Airport Status - Solo si tenemos datos reales */}
            {userReservations.length > 0 && (
              <div className="sidebar-card">
                <h3>📍 Estado del Aeropuerto</h3>
                <div className="airport-status">
                  <div className="airport-info">
                    <h4>
                      {userReservations[0]?.fromCity ? 
                        `${userReservations[0].fromCity} (${userReservations[0].from})` : 
                        'Aeropuerto no disponible'
                      }
                    </h4>
                    <p className="update-time">Información en tiempo real</p>
                    <div className="status-grid">
                      <div className="status-item">
                        <span className="status-label">Estado</span>
                        <span className="status-badge normal">Operativo</span>
                      </div>
                      <div className="status-item">
                        <span className="status-label">Tu vuelo</span>
                        <span className="status-value">{userReservations[0]?.flightNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="sidebar-card">
              <h3>🚀 Acciones Rápidas</h3>
              <div className="quick-actions">
                <button className="quick-btn" onClick={() => window.location.href = '/'}>
                  <span className="btn-icon">🎫</span>
                  <span>Nueva Reserva</span>
                </button>
                <button className="quick-btn" onClick={fetchUserData}>
                  <span className="btn-icon">🔄</span>
                  <span>Actualizar</span>
                </button>
                <button className="quick-btn" onClick={handleDebugInfo}>
                  <span className="btn-icon">🐛</span>
                  <span>Debug Info</span>
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className="sidebar-card info-card">
              <div className="info-content">
                <h3>ℹ️ Información del Sistema</h3>
                <div className="info-stats">
                  <div className="info-item">
                    <span>Endpoints probados:</span>
                    <span>{debugInfo.endpointsTested.length}</span>
                  </div>
                  <div className="info-item">
                    <span>Reservas cargadas:</span>
                    <span>{userReservations.length}</span>
                  </div>
                  <div className="info-item">
                    <span>Usuario:</span>
                    <span>{debugInfo.userEmail ? 'Conectado' : 'No detectado'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Card */}
            {(weatherData.origin || weatherData.destination) && (
              <div className="sidebar-card weather-card">
                <h3>🌤️ Clima de tu Viaje</h3>
                
                {weatherData.origin && (
                  <div className="weather-section">
                    <div className="weather-header">
                      <span className="weather-label">Origen</span>
                      <span className="weather-city">{weatherData.origin.city}</span>
                    </div>
                    <div className="weather-content">
                      <div className="weather-icon">
                        <img 
                          src={`https://openweathermap.org/img/wn/${weatherData.origin.icon}@2x.png`}
                          alt={weatherData.origin.description}
                        />
                      </div>
                      <div className="weather-details">
                        <div className="weather-temp">{weatherData.origin.temp}°C</div>
                        <div className="weather-desc">{weatherData.origin.description}</div>
                        <div className="weather-humidity">💧 {weatherData.origin.humidity}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {weatherData.destination && (
                  <div className="weather-section">
                    <div className="weather-header">
                      <span className="weather-label">Destino</span>
                      <span className="weather-city">{weatherData.destination.city}</span>
                    </div>
                    <div className="weather-content">
                      <div className="weather-icon">
                        <img 
                          src={`https://openweathermap.org/img/wn/${weatherData.destination.icon}@2x.png`}
                          alt={weatherData.destination.description}
                        />
                      </div>
                      <div className="weather-details">
                        <div className="weather-temp">{weatherData.destination.temp}°C</div>
                        <div className="weather-desc">{weatherData.destination.description}</div>
                        <div className="weather-humidity">💧 {weatherData.destination.humidity}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}