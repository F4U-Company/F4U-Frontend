import React, { useState, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { reservationAPI, authAPI, flightAPI, cityAPI } from "./services/api";
import ProtectedRoute from "./components/ProtectedRoute";
import Chatbot from "./components/Chatbot";
import "./styles/mainStyles/dashboard/index.css";

export default function Dashboard() {
  const { accounts, instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
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
  const [routeData, setRouteData] = useState({
    userLocation: null,
    airportLocation: null,
    distance: null,
    duration: null,
    loading: false
  });

  // Verificar autenticación inmediatamente
  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!isAuthenticated && !token) {
      console.log('🚫 No autenticado - Redirigiendo a home');
      window.location.href = '/';
      return;
    }
  }, [isAuthenticated]);

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

  // Función para obtener ubicación del usuario por IP
  const getUserLocationByIP = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city,
        country: data.country_name
      };
    } catch (error) {
      console.error('Error getting user location:', error);
      return null;
    }
  };

  // Función para obtener coordenadas del aeropuerto principal
  const getAirportCoordinates = async (cityName) => {
    // Mapeo de aeropuertos principales de Colombia
    const airportMap = {
      'Bogotá': { lat: 4.7016, lng: -74.1469, name: 'El Dorado' },
      'Medellín': { lat: 6.1645, lng: -75.4231, name: 'José María Córdova' },
      'Cali': { lat: 3.5432, lng: -76.3816, name: 'Alfonso Bonilla Aragón' },
      'Cartagena': { lat: 10.4424, lng: -75.5130, name: 'Rafael Núñez' },
      'Barranquilla': { lat: 10.8896, lng: -74.7806, name: 'Ernesto Cortissoz' },
      'Santa Marta': { lat: 11.1196, lng: -74.2306, name: 'Simón Bolívar' },
      'Pereira': { lat: 4.8127, lng: -75.7395, name: 'Matecaña' },
      'Bucaramanga': { lat: 7.1265, lng: -73.1848, name: 'Palo Negro' }
    };

    // Buscar el aeropuerto en el mapa
    const airport = airportMap[cityName];
    if (airport) {
      return airport;
    }

    // Si no está en el mapa, intentar obtenerlo del API de ciudades
    try {
      const response = await cityAPI.getCityByName(cityName);
      if (response.data) {
        return {
          lat: response.data.latitude,
          lng: response.data.longitude,
          name: `Aeropuerto de ${cityName}`
        };
      }
    } catch (error) {
      console.error('Error getting airport coordinates:', error);
    }
    
    return null;
  };

  // Función para calcular distancia y tiempo estimado (fórmula de Haversine)
  const calculateRoute = (userLoc, airportLoc) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (airportLoc.lat - userLoc.lat) * Math.PI / 180;
    const dLng = (airportLoc.lng - userLoc.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(airportLoc.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Estimar tiempo (asumiendo velocidad promedio de 12 km/h en ciudad)
    const duration = Math.round((distance / 12) * 60); // en minutos
    
    return {
      distance: distance.toFixed(1),
      duration
    };
  };

  // Actualizar clima cuando hay reservas
  useEffect(() => {
    if (userReservations.length > 0) {
      const firstReservation = userReservations[0];
      
      // Obtener ciudades desde fromCity y toCity que ya están formateadas
      const originCityName = firstReservation.fromCity;
      const destinationCityName = firstReservation.toCity;
      
      console.log("Obteniendo clima para:", originCityName, "y", destinationCityName);
      
      if (originCityName && originCityName !== "Ciudad no disponible") {
        fetchWeatherData(originCityName).then(data => {
          if (data) {
            console.log("Clima origen obtenido:", data);
            setWeatherData(prev => ({ ...prev, origin: data }));
          }
        });
      }
      
      if (destinationCityName && destinationCityName !== "Ciudad no disponible") {
        fetchWeatherData(destinationCityName).then(data => {
          if (data) {
            console.log("Clima destino obtenido:", data);
            setWeatherData(prev => ({ ...prev, destination: data }));
          }
        });
      }
    }
  }, [userReservations]);

  // Obtener ruta al aeropuerto cuando hay reservas
  useEffect(() => {
    const fetchRouteData = async () => {
      if (userReservations.length > 0) {
        setRouteData(prev => ({ ...prev, loading: true }));
        
        const firstReservation = userReservations[0];
        const originCity = firstReservation.fromCity;
        
        console.log("Calculando ruta al aeropuerto de:", originCity);
        
        // Obtener ubicación del usuario
        const userLoc = await getUserLocationByIP();
        if (!userLoc) {
          console.error("No se pudo obtener la ubicación del usuario");
          setRouteData(prev => ({ ...prev, loading: false }));
          return;
        }
        
        // Obtener coordenadas del aeropuerto
        const airportLoc = await getAirportCoordinates(originCity);
        if (!airportLoc) {
          console.error("No se pudo obtener las coordenadas del aeropuerto");
          setRouteData(prev => ({ ...prev, loading: false }));
          return;
        }
        
        // Calcular distancia y tiempo
        const route = calculateRoute(userLoc, airportLoc);
        
        console.log("Ruta calculada:", route);
        
        setRouteData({
          userLocation: userLoc,
          airportLocation: airportLoc,
          distance: route.distance,
          duration: route.duration,
          loading: false
        });
      }
    };
    
    fetchRouteData();
  }, [userReservations]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(prev => ({ ...prev, endpointsTested: [] }));
      
      console.log("Iniciando carga de datos del usuario...");
      
      // Verificar que el usuario esté autenticado antes de hacer peticiones
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        console.error("No hay token de autenticación");
        setError("No estás autenticado. Redirigiendo...");
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        setLoading(false);
        return;
      }
      
      // TEST 1: Verificar autenticación
      try {
        console.log("Test 1 - Verificando autenticación...");
        const authResponse = await authAPI.validateToken();
        console.log("Token válido:", authResponse.data);
        addDebugInfo("/api/auth/validate-token");
      } catch (authError) {
        console.error("Error de autenticación:", authError);
        if (authError.response?.status === 401 || authError.message?.includes('No autorizado')) {
          setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
          sessionStorage.clear();
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else {
          setError("Error de autenticación. Por favor, inicia sesión nuevamente.");
        }
        setLoading(false);
        return;
      }

      // TEST 2: Obtener perfil de usuario
      try {
        console.log("Test 2 - Obteniendo perfil de usuario...");
        const userProfile = await authAPI.getUserProfile();
        const userEmail = userProfile.data.email || userProfile.data.azureObjectId;
        console.log("Perfil obtenido:", userProfile.data);
        setDebugInfo(prev => ({ 
          ...prev, 
          userEmail,
          endpointsTested: [...prev.endpointsTested, "/api/auth/me"]
        }));
      } catch (profileError) {
        console.error("Error obteniendo perfil:", profileError);
        addDebugInfo("/api/auth/me");
      }

      // TEST 3: Obtener estadísticas del usuario
      let statsData = { totalReservations: 0, activeReservations: 0, accumulatedMiles: 0, level: "Bronce" };
      try {
        console.log("Test 3 - Obteniendo estadísticas...");
        const statsResponse = await reservationAPI.getUserStats();
        statsData = statsResponse.data;
        console.log("Estadísticas obtenidas:", statsData);
        addDebugInfo("/api/reservaciones/usuario/estadisticas");
      } catch (statsError) {
        console.error("Error obteniendo estadísticas:", statsError);
        addDebugInfo("/api/reservaciones/usuario/estadisticas");
      }

      // TEST 4: Obtener reservas del usuario
      let reservations = [];
      try {
        console.log("Test 4 - Obteniendo reservas del usuario...");
        const reservationsResponse = await reservationAPI.getUserReservations();
        reservations = reservationsResponse.data;
        console.log("Reservas obtenidas:", reservations);
        setDebugInfo(prev => ({ 
          ...prev, 
          reservationsCount: reservations.length,
          endpointsTested: [...prev.endpointsTested, "/api/reservaciones/usuario"]
        }));
        
        if (!reservations || reservations.length === 0) {
          console.log("No hay reservas encontradas");
          setUserReservations([]);
          setLoading(false);
          return;
        }
      } catch (reservationsError) {
        console.error("Error obteniendo reservas:", reservationsError);
        addDebugInfo("/api/reservaciones/usuario");
        
        // Intentar con endpoint alternativo
        try {
          console.log("Intentando con endpoint alternativo...");
          const allReservationsResponse = await reservationAPI.getAllReservations();
          const allReservations = allReservationsResponse.data;
          console.log("Todas las reservas:", allReservations);
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
          console.error("Error obteniendo todas las reservas:", allReservationsError);
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
        addDebugInfo("Reservas enriquecidas con vuelos");
        
        // Calcular estadísticas basadas en las reservas reales
        const totalReservations = reservations.length;
        const activeReservations = reservations.filter(r => 
          r.estado === "CONFIRMADA" || r.estado === "PAGADA"
        ).length;
        const accumulatedMiles = totalReservations * 1000;
        let level = "Bronce";
        if (totalReservations >= 10) {
          level = "Oro";
        } else if (totalReservations >= 5) {
          level = "Plata";
        }
        
        console.log("📊 Estadísticas calculadas localmente:", {
          totalReservations,
          activeReservations,
          accumulatedMiles,
          level
        });
        
        // Actualizar estadísticas con valores reales
        setStats({
          totalReservations: totalReservations.toString(),
          activeReservations: activeReservations.toString(),
          accumulatedMiles: accumulatedMiles.toLocaleString(),
          level: level
        });
        
      } catch (enrichError) {
        console.error("Error enriqueciendo reservas:", enrichError);
        // Usar reservas básicas si falla el enriquecimiento
        const formattedReservations = formatReservationsData(reservations);
        setUserReservations(formattedReservations);
        addDebugInfo("⚠️ Reservas básicas (sin enriquecimiento)");
        
        // Calcular estadísticas incluso si falla el enriquecimiento
        const totalReservations = reservations.length;
        const activeReservations = reservations.filter(r => 
          r.estado === "CONFIRMADA" || r.estado === "PAGADA"
        ).length;
        const accumulatedMiles = totalReservations * 1000;
        let level = "Bronce";
        if (totalReservations >= 10) {
          level = "Oro";
        } else if (totalReservations >= 5) {
          level = "Plata";
        }
        
        setStats({
          totalReservations: totalReservations.toString(),
          activeReservations: activeReservations.toString(),
          accumulatedMiles: accumulatedMiles.toLocaleString(),
          level: level
        });
      }
      
    } catch (err) {
      console.error("Error general fetching user data:", err);
      
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
          console.log(`Obteniendo info del vuelo ${reservation.vueloId} para reserva ${reservation.id}`);
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
        console.error(`Error obteniendo vuelo ${reservation.vueloId}:`, flightError);
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
        console.error("Error formateando reserva:", error, reservation);
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
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      ), 
      color: "#0056b3" 
    },
    { 
      label: "Reservas Activas", 
      value: stats.activeReservations, 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ), 
      color: "#003d82" 
    },
    { 
      label: "Millas Acumuladas", 
      value: stats.accumulatedMiles, 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ), 
      color: "#0056b3" 
    },
    { 
      label: "Nivel", 
      value: stats.level, 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      ), 
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
INFORMACIÓN DE DEBUG

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
    
    console.log("Debug Info:", debugText);
    alert(debugText);
  };

  // No mostrar nada si no está autenticado
  const token = sessionStorage.getItem('accessToken');
  if (!isAuthenticated && !token) {
    return null;
  }

  if (loading) {
    return (
      <ProtectedRoute>
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
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
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
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="dashboard-container" style={{ paddingTop: '70px' }}>
        {/* Header */}
        <header className="site-header visible">
          <div className="header-inner">
            <a href="/" className="logo-link" aria-label="F4U Airlines">
              <div className="logo-container">
                <span className="logo-text">F4U</span>
              </div>
            </a>

            <nav className="main-nav" aria-label="Main navigation">
              <a href="/#products">Servicios</a>
              <a href="/#cdt-mechanics-2">Cómo reservar</a>
              <a href="/#contact">Contacto</a>
              <a href="/dashboard">Mis Reservas</a>
            </nav>

            {/* Usuario en el header */}
            <div className="header-user">
              <div className="user-info" onClick={() => {
                const showMenu = document.querySelector('.header-dropdown-menu');
                if (showMenu) {
                  showMenu.style.display = showMenu.style.display === 'none' ? 'block' : 'none';
                }
              }}>
                <div className="user-avatar">
                  {accounts[0]?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="user-details">
                  <span className="user-name">{accounts[0]?.name || 'Usuario'}</span>
                </div>
                <svg 
                  className="dropdown-icon"
                  width="16" 
                  height="16" 
                  viewBox="0 0 16 16" 
                  fill="currentColor"
                >
                  <path d="M4 6l4 4 4-4z"/>
                </svg>
              </div>

              {/* Menú desplegable */}
              <div className="header-dropdown-menu" style={{ display: 'none' }}>
                <div className="menu-header">
                  <div className="menu-user-avatar">
                    {accounts[0]?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="menu-user-info">
                    <div className="menu-user-name">{accounts[0]?.name || 'Usuario'}</div>
                    <div className="menu-user-email">{accounts[0]?.username || ''}</div>
                  </div>
                </div>
                
                <div className="menu-divider" />
                
                <button className="menu-item" onClick={() => alert('Perfil - En desarrollo')}>
                  <span>Mi Perfil</span>
                </button>
                
                <button className="menu-item" onClick={() => window.location.href = '/dashboard'}>
                  <span>Mis Reservas</span>
                </button>
                
                <div className="menu-divider" />
                
                <button className="menu-item logout" onClick={handleLogout}>
                  <span>Cerrar Sesión</span>
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
                    {/* Columna izquierda: Info básica del vuelo */}
                    <div className="flight-info-left">
                      <div className="flight-number">{reservation.flightNumber}</div>
                      <div className={`flight-status ${reservation.status.toLowerCase()}`}>{reservation.status}</div>
                      <div className="flight-duration">
                        <span className="duration-label">Duración:</span>
                        <span className="duration-value">{reservation.duration}</span>
                      </div>
                      <div className="reservation-code-small">Reserva: {reservation.reservationCode}</div>
                    </div>

                    {/* Columna central: Ruta del vuelo */}
                    <div className="flight-route">
                      <div className="flight-time">
                        <div className="time-value">{reservation.departure}</div>
                        <div className="city-name">{reservation.fromCity}</div>
                        <div className="airport-code">{reservation.from}</div>
                      </div>

                      <div className="flight-path">
                        <div className="path-line"></div>
                        <div className="plane-icon">✈</div>
                      </div>

                      <div className="flight-time">
                        <div className="time-value">{reservation.arrival}</div>
                        <div className="city-name">{reservation.toCity}</div>
                        <div className="airport-code">{reservation.to}</div>
                      </div>
                    </div>

                    {/* Columna derecha: Info del pasajero y acciones */}
                    <div className="flight-prices">
                      <div className="price-option">
                        <div>
                          <div className="price-class">{reservation.travelClass}</div>
                          <div className="price-seats">{reservation.passengerName}</div>
                        </div>
                        <div className="price-amount">{reservation.price}</div>
                      </div>
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
                <div className="no-flights-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 1 3-1v-2l3-3 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.1z"/>
                  </svg>
                </div>
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
                <h3>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', marginRight: '8px', verticalAlign: 'middle'}}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Estado del Aeropuerto
                </h3>
                <div className="airport-status">
                  {/* Imagen del aeropuerto */}
                  {userReservations[0]?.fromCity && (
                    <div className="airport-image-container">
                      <img 
                        src={
                          userReservations[0].fromCity.toLowerCase().includes('bogotá') || userReservations[0].fromCity.toLowerCase().includes('bogota')
                            ? 'https://files.visitbogota.co/sites/default/files/2024-04/Aeropuerto-Internacional-El-Dorado-Bogota-Colombia-0.jpg'
                            : userReservations[0].fromCity.toLowerCase().includes('medellín') || userReservations[0].fromCity.toLowerCase().includes('medellin')
                            ? 'https://imagenes2.eltiempo.com/files/image_1200_535/uploads/2022/02/20/621244798c079.jpeg'
                            : 'https://files.visitbogota.co/sites/default/files/2024-04/Aeropuerto-Internacional-El-Dorado-Bogota-Colombia-0.jpg'
                        }
                        alt={`Aeropuerto de ${userReservations[0].fromCity}`}
                        className="airport-image"
                      />
                    </div>
                  )}
                  
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
              <h3>Acciones Rápidas</h3>
              <div className="quick-actions">
                <button className="quick-btn" onClick={() => window.location.href = '/'}>
                  <span className="btn-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                  </span>
                  <span>Nueva Reserva</span>
                </button>
                <button className="quick-btn" onClick={fetchUserData}>
                  <span className="btn-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                  </span>
                  <span>Actualizar</span>
                </button>
                <button className="quick-btn" onClick={handleDebugInfo}>
                  <span className="btn-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/>
                      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6Z"/>
                      <path d="M12 20v-9m-4 3h8m-8 4h8"/>
                    </svg>
                  </span>
                  <span>Debug Info</span>
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className="sidebar-card info-card">
              <div className="info-content">
                <h3>Información del Sistema</h3>
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
                <h3>Clima de tu Viaje</h3>
                
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

            {/* Route to Airport Card */}
            {routeData.userLocation && routeData.airportLocation && !routeData.loading && (
              <div className="sidebar-card route-card">
                <h3>Ruta al Aeropuerto</h3>
                
                <div className="route-section">
                  {/* Mini mapa visual de la ruta */}
                  <div className="route-map-container">
                    <iframe
                      width="100%"
                      height="200"
                      frameBorder="0"
                      style={{ border: 0 }}
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${routeData.userLocation.lat},${routeData.userLocation.lng}&destination=${routeData.airportLocation.lat},${routeData.airportLocation.lng}&mode=driving`}
                      allowFullScreen
                    />
                  </div>
                  
                  <div className="route-locations">
                    <div className="location-point">
                      <div className="location-icon origin">📍</div>
                      <div className="location-info">
                        <span className="location-label">Tu ubicación</span>
                        <span className="location-name">
                          {routeData.userLocation.city}, {routeData.userLocation.country}
                        </span>
                      </div>
                    </div>
                    
                    <div className="route-line-container">
                      <div className="route-dashed-line"></div>
                      <div className="route-arrow">✈️</div>
                    </div>
                    
                    <div className="location-point">
                      <div className="location-icon destination">🏢</div>
                      <div className="location-info">
                        <span className="location-label">Aeropuerto</span>
                        <span className="location-name">{routeData.airportLocation.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="route-stats">
                    <div className="route-stat-item">
                      <div className="stat-icon">📏</div>
                      <div className="stat-content">
                        <span className="stat-label">Distancia</span>
                        <span className="stat-value">{routeData.distance} km</span>
                      </div>
                    </div>
                    <div className="route-stat-item">
                      <div className="stat-icon">⏱️</div>
                      <div className="stat-content">
                        <span className="stat-label">Tiempo estimado</span>
                        <span className="stat-value">{routeData.duration} min</span>
                      </div>
                    </div>
                  </div>
                  
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&origin=${routeData.userLocation.lat},${routeData.userLocation.lng}&destination=${routeData.airportLocation.lat},${routeData.airportLocation.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="open-maps-btn"
                  >
                    Abrir en Google Maps
                  </a>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
      
      {/* Chatbot flotante */}
      <Chatbot />
      </div>
    </ProtectedRoute>
  );
}