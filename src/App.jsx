import React, { useRef, useState, useEffect, useMemo } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import AuthTest from "./components/AuthTest";
import FlightMap from "./components/FlightMap";
import FlightMap2D from "./components/FlightMap2D";
import PlaneViewer from "./components/PlaneViewer";
import SeatSelector from "./components/SeatSelector";
import ExtrasSelector from "./components/ExtrasSelector";
import PaymentForm from "./components/PaymentForm";
import { cityAPI, flightAPI } from "./services/api";
import "./styles/mainStyles/index.css";

export default function App() {
  const [email, setEmail] = useState("");
  const [openIndex, setOpenIndex] = useState(null);
  const carouselRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [heroCurrentImage, setHeroCurrentImage] = useState(0);
  
  // ESTADOS PARA EL SISTEMA DE RESERVA - ACTUALIZADOS CON LA NUEVA ESTRUCTURA
  const [activeTab, setActiveTab] = useState(0);
  const [originCity, setOriginCity] = useState("");
  const [destCity, setDestCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [lockedSeatId, setLockedSeatId] = useState(null); // ID del asiento bloqueado
  const [selectedExtras, setSelectedExtras] = useState(null); // Extras seleccionados

  // Referencia para la sección de booking
  const bookingSectionRef = useRef(null);

  // Estados para ciudades desde la base de datos
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);

  // Estados para vuelos
  const [flights, setFlights] = useState([]);
  const [loadingFlights, setLoadingFlights] = useState(false);

  // Estados para autenticación
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  // CORRECCIÓN: Eliminamos el estado tokenSaved y usamos una referencia
  const tokenSavedRef = useRef(false);

  // Cargar ciudades desde la API
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        const response = await cityAPI.getAllCities();
        setCities(response.data);
      } catch (error) {
        console.error('Error al cargar ciudades:', error);
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  // Obtener coordenadas de las ciudades seleccionadas
  const originCoords = useMemo(() => {
    const city = cities.find(c => c.id === Number(originCity));
    // Aproximación: usar coordenadas basadas en la ciudad (esto debería venir de la BD)
    // Por ahora, retornamos null y lo manejaremos después
    return city ? getCoordsForCity(city.nombre) : null;
  }, [originCity, cities]);
  
  const destCoords = useMemo(() => {
    const city = cities.find(c => c.id === Number(destCity));
    return city ? getCoordsForCity(city.nombre) : null;
  }, [destCity, cities]);

  const samePlace = originCity === destCity;

  // Función auxiliar para obtener coordenadas (temporal - idealmente esto debe venir de la BD)
  function getCoordsForCity(cityName) {
    const coordsMap = {
      'Bogotá': [-74.0721, 4.7110],
      'Medellín': [-75.5636, 6.2442],
      'Cali': [-76.5215, 3.4516],
      'Cartagena': [-75.4794, 10.3910],
      'Madrid': [-3.7038, 40.4168],
      'Barcelona': [2.1734, 41.3851],
      'Nueva York': [-74.0060, 40.7128],
      'Los Ángeles': [-118.2437, 34.0522],
      'Miami': [-80.1918, 25.7617],
      'Ciudad de México': [-99.1332, 19.4326],
      'Cancún': [-86.8515, 21.1619],
      'Londres': [-0.1276, 51.5074],
      'París': [2.3522, 48.8566],
      'São Paulo': [-46.6333, -23.5505],
      'Buenos Aires': [-58.3816, -34.6037]
    };
    return coordsMap[cityName] || null;
  }

  /* Validación simple - solo verifica que estén llenos los campos básicos */
  const firstCompleted = Boolean(
    originCity &&
    destCity &&
    !samePlace &&
    departureDate
  );

  // Función para obtener clase CSS basada en si el campo está lleno o vacío
  const getInputClass = (value) => value ? "filled" : "";

  // Función para buscar vuelos
  const searchFlights = async () => {
    if (!originCity || !destCity || !departureDate) {
      alert("Por favor completa origen, destino y fecha de salida");
      return;
    }

    try {
      setLoadingFlights(true);
      const response = await flightAPI.searchFlights({
        origin: originCity,
        destination: destCity,
        date: departureDate
      });
      setFlights(response.data);
      
      if (response.data.length === 0) {
        alert("No se encontraron vuelos para esta ruta y fecha");
      }
    } catch (error) {
      console.error('Error al buscar vuelos:', error);
      alert("Error al buscar vuelos. Por favor intenta de nuevo.");
      setFlights([]);
    } finally {
      setLoadingFlights(false);
    }
  };

  // Función para hacer scroll a la sección de booking
  const scrollToBooking = () => {
    if (bookingSectionRef.current) {
      const headerOffset = 100; // Offset para el header
      const elementPosition = bookingSectionRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // control de apertura de pestañas
  const tryOpenTab = (tabIndex) => {
    if (tabIndex === 0) { 
      setActiveTab(0);
      scrollToBooking();
      return; 
    }
    if (tabIndex === 1) {
      if (!firstCompleted) {
        alert("Por favor completa todos los campos de origen y destino primero");
        return;
      }
      // Buscar vuelos automáticamente al abrir la pestaña de vuelos
      searchFlights();
      setActiveTab(1);
      scrollToBooking();
      return;
    }
    if (tabIndex === 2) {
      if (!selectedFlight) {
        alert("Por favor selecciona un vuelo primero");
        return;
      }
      setActiveTab(2);
      scrollToBooking();
      return;
    }
    if (tabIndex === 3) {
      if (!selectedSeat) {
        alert("Por favor selecciona un asiento primero");
        return;
      }
      setActiveTab(3);
      scrollToBooking();
      return;
    }
    if (tabIndex === 4) {
      if (!selectedExtras) {
        alert("Por favor confirma tus extras primero");
        return;
      }
      setActiveTab(4);
      scrollToBooking();
      return;
    }
    if (tabIndex === 5) {
      if (!selectedExtras) {
        alert("Por favor completa todos los pasos previos");
        return;
      }
      setActiveTab(5);
      scrollToBooking();
    }
  };

  const firstStatusText = firstCompleted ? "Completado" : samePlace ? "Origen y destino iguales" : "Completa los campos requeridos";
  const secondStatusText = selectedFlight ? `Vuelo: ${selectedFlight.numeroVuelo}` : "Selecciona un vuelo";
  const thirdStatusText = selectedSeat ? "Asiento confirmado" : "Selecciona tu asiento";
  const fourthStatusText = selectedExtras ? "Extras confirmados" : "Configura tus extras";
  const fifthStatusText = "Ver ruta en el mapa";
  const sixthStatusText = "Completa el pago";

  // Funciones existentes de la website
  function submit(e) {
    e.preventDefault();
    alert(`¡Gracias por tu interés en F4U! Te contactaremos pronto al: ${email || "(correo no proporcionado)"}`);
  }

  function toggleAccordion(i) {
    setOpenIndex(openIndex === i ? null : i);
  }

  function scrollCarousel(delta) {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: delta, behavior: "smooth" });
  }

  // Control del header al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide header
        setIsHeaderVisible(false);
      } else {
        // Scrolling up - show header
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Carrusel automático de destinos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % destinationFeatures.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Efecto para desplazar el carrusel cuando cambia currentSlide
  useEffect(() => {
    if (carouselRef.current) {
      const cardWidth = 480;
      carouselRef.current.scrollTo({
        left: currentSlide * cardWidth,
        behavior: 'smooth'
      });
    }
  }, [currentSlide]);

  // Carrusel automático del hero
  useEffect(() => {
    const heroInterval = setInterval(() => {
      setHeroCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(heroInterval);
  }, []);

  // Efecto para autenticación - CORREGIDO
  useEffect(() => {
    console.log('📱 App.jsx useEffect ejecutado:', {
      isAuthenticated,
      accountsLength: accounts.length,
      hasToken: !!localStorage.getItem('accessToken'),
      timestamp: new Date().toLocaleTimeString()
    });

    // Guardar el token JWT cuando el usuario se autentica
    const saveAccessToken = async () => {
      // Si ya hay token, no hacer nada
      if (localStorage.getItem('accessToken')) {
        console.log('✅ Token ya existe en localStorage');
        return;
      }
      
      if (accounts.length > 0 && !tokenSavedRef.current) {
        console.log('🔑 App.jsx: Intentando obtener token silenciosamente...');
        try {
          const response = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0]
          });
          
          if (response && response.accessToken) {
            console.log('✅ App.jsx: Token obtenido silenciosamente:', {
              hasAccessToken: !!response.accessToken,
              expiresOn: response.expiresOn,
              account: response.account.username
            });
            localStorage.setItem('accessToken', response.accessToken);
            tokenSavedRef.current = true;
            console.log('✅ Token guardado en useEffect');
          }
        } catch (error) {
          console.error('⚠️ Error al obtener token silenciosamente:', error.message);
          // Si falla silently, NO intentar con popup automáticamente para evitar bucles
          // El popup solo debe abrirse cuando el usuario hace clic en "Iniciar Sesión"
        }
      }
    };

    if (isAuthenticated) {
      saveAccessToken();
    }
  }, [isAuthenticated, accounts, instance]); // ¡IMPORTANTE: Sin tokenSaved en las dependencias!

  // Nota: El asiento bloqueado permanece bloqueado por 15 minutos
  // Se liberará automáticamente en el backend o al completar el pago

  // Imágenes para el carrusel del hero
  const heroImages = [
    {
      id: 1,
      src: "/img/A1.png",
      alt: "Hermosa playa tropical con aguas cristalinas",
      title: "Descubre Paraísos Tropicales"
    },
    {
      id: 2,
      src: "/img/A5.png",
      alt: "Ciudad moderna con rascacielos iluminados",
      title: "Explora Ciudades Vibrantes"
    },
    {
      id: 3,
      src: "/img/A2.png",
      alt: "Montañas nevadas al atardecer",
      title: "Aventura en la Naturaleza"
    }
  ];

  const accordionItems = [
    {
      title: "Atención personalizada 24/7",
      body: "Nuestros expertos en viajes están disponibles para ayudarte en cualquier momento del día.",
    },
    {
      title: "Sin complicaciones",
      body: "Reserva tus vuelos en minutos, sin trámites complicados ni esperas innecesarias.",
    },
    {
      title: "Precios transparentes",
      body: "Sin cargos ocultos. Sabrás exactamente lo que pagas desde el primer momento.",
    },
    {
      title: "Viaja con tranquilidad",
      body: "Contamos con los mejores seguros y asistencia durante todo tu viaje.",
    },
    {
      title: "Millas y recompensas",
      body: "Acumula millas en cada viaje y canjéalas por vuelos, upgrades y más beneficios.",
    },
    {
      title: "Experiencia premium",
      body: "Disfruta de comodidades exclusivas, desde check-in prioritario hasta lounges en aeropuertos.",
    },
  ];

  // SERVICIOS ACTUALIZADOS CON ICONOS MÁS FORMALES
  const productCards = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 1 3-1v-2l3-3 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.1z"/>
        </svg>
      ),
      title: "Vuelos Internacionales",
      desc: "Descubre destinos increíbles alrededor del mundo con nuestras rutas globales",
      features: ["Más de 14 destinos", "Clase ejecutiva premium", "Asistencia multilingüe"]
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3m16 0v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9m16 0H4m8-6v4m-4-4v4m8-4v4"/>
        </svg>
      ),
      title: "Asistencia Inteligente de Viaje",
      desc: "Tu copiloto de IA en cada escala: descubre qué hacer mientras esperas tu próximo vuelo.",
      features: ["Sugerencias instantáneas según tu escala", "Alertas inteligentes y recordatorios de embarque", "Gestiona tu itinerario con un solo clic"]
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ),
      title: "Vuelos Nacionales",
      desc: "Conectamos las principales ciudades con la mejor frecuencia y comodidad",
      features: ["Vuelos diarios", "Tarifas flexibles", "Programa de millas"]
    }
  ];

  // NUEVA SECCIÓN DE PASOS MEJORADA - MÁS COMPACTA
  const bookingSteps = [
    {
      number: "01",
      title: "Elige origen y destino",
      description: "Selecciona desde dónde y hacia dónde quieres viajar",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      color: "var(--blue)"
    },
    {
      number: "02",
      title: "Confirma tu trayecto",
      description: "Revisa fechas, horarios y confirma tu itinerario",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      color: "var(--teal)"
    },
    {
      number: "03",
      title: "Elige tu asiento",
      description: "Selecciona tu asiento preferido en el avión",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      ),
      color: "var(--purple)"
    },
    {
      number: "04",
      title: "¡Vuela con F4U!",
      description: "Disfruta de tu viaje con la mejor aerolínea",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 1 3-1v-2l3-3 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.1z"/>
        </svg>
      ),
      color: "var(--orange)"
    }
  ];

  const destinationFeatures = [
    {
      title: "Nueva York",
      subtitle: "La ciudad que nunca duerme",
      img: "/img/newyork.png",
    },
    {
      title: "París",
      subtitle: "La ciudad del amor y la luz",
      img: "/img/Paris.png",
    },
    {
      title: "Londres",
      subtitle: "Historia y modernidad en cada rincón",
      img: "/img/LONDON.png",
    },
    {
      title: "Sídney",
      subtitle: "La joya de Australia",
      img: "/img/SYD.png",
    },
    {
      title: "Río de Janeiro",
      subtitle: "Carnaval y playas espectaculares",
      img: "/img/RIO.png",
    },
    {
      title: "Madrid",
      subtitle: "Cultura, gastronomía y diversión",
      img: "/img/Madrid.png",
    },
    {
      title: "Los Ángeles",
      subtitle: "Sol, playas y Hollywood",
      img: "/img/LOS.png",
    },
    {
      title: "Buenos Aires",
      subtitle: "El tango y la pasión argentina",
      img: "/img/BA.png",
    },
    {
      title: "Bogotá",
      subtitle: "La capital vibrante de Colombia",
      img: "/img/BOGOTA.png",
    },
    {
      title: "Medellín",
      subtitle: "La ciudad de la eterna primavera",
      img: "/img/MEDALLO.png",
    },
    {
      title: "Santiago",
      subtitle: "Entre montañas y modernidad",
      img: "/img/SANTIAGO.png",
    },
    {
      title: "Ottawa",
      subtitle: "Capital canadiense llena de encanto",
      img: "/img/OTTAWA.png",
    },
    {
      title: "Marruecos",
      subtitle: "Misterio y cultura milenaria",
      img: "/img/Mrroco.png",
    },
    {
      title: "Beyin",
      subtitle: "Destino exótico por descubrir",
      img: "/img/BEYIN.png",
    }
  ];

  // CORRECCIÓN: Solo mostrar log en desarrollo
  if (import.meta.env.DEV) {
    console.log('🎨 App.jsx Render:', { 
      isAuthenticated, 
      accounts: accounts.length,
      timestamp: new Date().toLocaleTimeString() 
    });
  }

  return (
    <div className="site-root" style={{ paddingTop: '70px' }}>
        {/* HEADER MEJORADO Y DINÁMICO */}
        <header className={`site-header ${isHeaderVisible ? 'visible' : 'hidden'}`}>
          <div className="header-inner">
            <a href="/" className="logo-link" aria-label="F4U Airlines">
              <div className="logo-container">
                <span className="logo-text">F4U</span>
              </div>
            </a>

            <nav className="main-nav" aria-label="Main navigation">
              <a href="#products">Servicios</a>
              <a href="#cdt-mechanics-2">Cómo reservar</a>
              <a href="#contact">Contacto</a>
              <a href="/dashboard" onClick={(e) => {
                if (!isAuthenticated) {
                  e.preventDefault();
                  instance.loginPopup(loginRequest)
                    .then(() => {
                      window.location.href = '/dashboard';
                    })
                    .catch(err => {
                      console.error('Login failed:', err);
                      alert('Error al iniciar sesión. Por favor intenta de nuevo.');
                    });
                }
              }}>Mis Reservas</a>
            </nav>

            {/* Usuario o Login en el header */}
            {accounts.length > 0 ? (
              <div className="header-user">
                <div className="user-info" onClick={() => {
                  const showMenu = document.querySelector('.header-dropdown-menu');
                  if (showMenu) {
                    showMenu.style.display = showMenu.style.display === 'none' ? 'block' : 'none';
                  }
                }}>
                  <div className="user-avatar">
                    {accounts[0].name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="user-details">
                    <span className="user-name">{accounts[0].name || 'Usuario'}</span>
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
                      {accounts[0].name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="menu-user-info">
                      <div className="menu-user-name">{accounts[0].name || 'Usuario'}</div>
                      <div className="menu-user-email">{accounts[0].username || ''}</div>
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
                  
                  <button className="menu-item logout" onClick={() => {
                    localStorage.removeItem('accessToken');
                    sessionStorage.clear();
                    instance.logoutPopup({ mainWindowRedirectUri: '/' });
                  }}>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="header-login">
                <button 
                  className="login-btn"
                  onClick={() => {
                    instance.loginPopup(loginRequest)
                      .catch(err => {
                        console.error('Login failed:', err);
                        alert('Error al iniciar sesión. Por favor intenta de nuevo.');
                      });
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Iniciar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* MAIN */}
        <main id="main-content">
          {/* HERO SECTION CON CARRUSEL */}
          <section className="hero full-hero">
            <div className="hero-picture">
              <div className="hero-carousel">
                {heroImages.map((image, index) => (
                  <div 
                    key={image.id}
                    className={`hero-slide ${index === heroCurrentImage ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${image.src})` }}
                  >
                    <div className="slide-overlay"></div>
                    <div className="slide-content">
                      <h2>{image.title}</h2>
                      <p>Tu próximo destino te espera</p>
                    </div>
                  </div>
                ))}
                
                {/* Indicadores del carrusel hero */}
                <div className="hero-carousel-indicators">
                  {heroImages.map((_, index) => (
                    <button
                      key={index}
                      className={`hero-indicator ${heroCurrentImage === index ? 'active' : ''}`}
                      onClick={() => setHeroCurrentImage(index)}
                      aria-label={`Ir a imagen ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Controles de navegación */}
                <button 
                  className="hero-carousel-prev"
                  onClick={() => setHeroCurrentImage(prev => prev === 0 ? heroImages.length - 1 : prev - 1)}
                  aria-label="Imagen anterior"
                >
                  ‹
                </button>
                <button 
                  className="hero-carousel-next"
                  onClick={() => setHeroCurrentImage(prev => (prev + 1) % heroImages.length)}
                  aria-label="Siguiente imagen"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="hero-form-area">
              <div className="hero-text">
                <h1 className="hero-title" data-testid="hero-title">
                  Viaja con<span className="hero-span">F4U</span>
                </h1>
                <h2 className="hero-subtitle" data-testid="hero-subtitle">
                  Descubre el mundo con la aerolínea que pone tus sueños en vuelo. 
                  Reserva fácil y vuela con la mejor experiencia.
                </h2>

                <div className="hero-cta">
                  <button className="learn-btn">Descubre destinos</button>
                </div>
              </div>

              <aside className="signup-card" aria-label="Formulario de contacto">
                <form className="signup-form" onSubmit={submit}>
                  <h3>¡Ofertas exclusivas!</h3>
                  <p>Suscríbete y recibe las mejores promociones</p>
                  <label htmlFor="email-hero" className="sr-only">Correo electrónico</label>
                  <input
                    id="email-hero"
                    type="email"
                    placeholder="Escribe tu correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-email"
                    required
                  />
                  <div className="cta-row">
                    <button className="apply-btn" type="submit">
                      Recibir ofertas
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="btn-arrow">
                        <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </button>
                  </div>
                  <p className="small-note">Sin spam. Solo las mejores ofertas de viajes.</p>
                </form>
              </aside>
            </div>
          </section>

          {/* SECCIÓN DE RESERVA TU VUELO - REDISEÑO PROFESIONAL TIPO AVIANCA/LATAM */}
          <section ref={bookingSectionRef} className="booking-tabs-section" style={{ marginTop: '80px', marginBottom: '40px' }}>
            <div className="booking-tabs-inner">
              {/* TÍTULO DE LA SECCIÓN - REDISEÑADO */}
              <div className="booking-tabs-header">
                <div className="booking-header-badge">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                  <span>SISTEMA DE RESERVAS</span>
                </div>
                <h2 className="booking-main-title">
                  Reserva tu vuelo con <span className="title-highlight">F4U Airlines</span>
                </h2>
                <p className="booking-subtitle">
                  Completa el proceso de reserva en 5 pasos simples. Selecciona tu ruta, elige tu vuelo perfecto y personaliza tu experiencia de viaje.
                </p>
              </div>

              {/* CONTENEDOR PRINCIPAL CON TABS A LA IZQUIERDA */}
              <div className="tabs-layout-container">
                {/* TAB NAV - VERTICAL A LA IZQUIERDA */}
                <div className="tabs-shell tabs-vertical">
                  <div className="tabs">
                    <button 
                      className={`tab ${activeTab === 0 ? "active" : ""} ${firstCompleted ? "completed" : ""}`} 
                      onClick={() => tryOpenTab(0)}
                      data-step="1"
                    >
                      <div className="tab-title">Origen & Destino</div>
                      <div className="tab-meta">{firstStatusText}</div>
                    </button>

                    <button 
                      className={`tab ${activeTab === 1 ? "active" : ""} ${!firstCompleted ? "locked" : ""} ${selectedFlight ? "completed" : ""}`} 
                      onClick={() => tryOpenTab(1)}
                      data-step="2"
                    >
                      <div className="tab-title">Vuelos</div>
                      <div className="tab-meta">{secondStatusText}</div>
                    </button>

                    <button 
                      className={`tab ${activeTab === 2 ? "active" : ""} ${!selectedFlight ? "locked" : ""} ${selectedSeat ? "completed" : ""}`} 
                      onClick={() => tryOpenTab(2)}
                      data-step="3"
                    >
                      <div className="tab-title">Asientos</div>
                      <div className="tab-meta">{thirdStatusText}</div>
                    </button>

                    <button 
                      className={`tab ${activeTab === 3 ? "active" : ""} ${!selectedSeat ? "locked" : ""} ${selectedExtras ? "completed" : ""}`} 
                      onClick={() => tryOpenTab(3)}
                      data-step="4"
                    >
                      <div className="tab-title">Extras</div>
                      <div className="tab-meta">{fourthStatusText}</div>
                    </button>

                    <button 
                      className={`tab ${activeTab === 4 ? "active" : ""} ${!selectedExtras ? "locked" : ""}`} 
                      onClick={() => tryOpenTab(4)}
                      data-step="5"
                    >
                      <div className="tab-title">Mapas</div>
                      <div className="tab-meta">{fifthStatusText}</div>
                    </button>

                    <button 
                      className={`tab ${activeTab === 5 ? "active" : ""} ${!selectedExtras ? "locked" : ""}`} 
                      onClick={() => tryOpenTab(5)}
                      data-step="6"
                    >
                      <div className="tab-title">Pago</div>
                      <div className="tab-meta">{sixthStatusText}</div>
                    </button>
                  </div>
                </div>

                {/* TAB CONTENT */}
                <div className="tab-content" style={{ flex: 1 }}>
                {/* TAB 0 - CONTROLES */}
                {activeTab === 0 && (
                  <div className="card controls-card">
                    <div className="controls-inner">
                      <div className="controls-header">
                        <div>
                          <h3 className="card-title">Origen & destino</h3>
                          <div className="muted">Completa estos campos para desbloquear los mapas.</div>
                        </div>
                      </div>

                      <div className="controls-grid-inner">
                        {/* ORIGEN */}
                        <div className="origin-section">
                          <div className="form-group">
                            <label htmlFor="origin-city">Origen</label>
                            <select 
                              id="origin-city" 
                              className={`form-select ${getInputClass(originCity)}`}
                              value={originCity} 
                              onChange={(e) => setOriginCity(e.target.value)}
                              disabled={loadingCities}
                            >
                              <option value="">
                                {loadingCities ? 'Cargando ciudades...' : 'Selecciona un origen'}
                              </option>
                              {cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                  {city.nombre} ({city.codigoIata}) - {city.pais}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Fecha de salida */}
                          <div className="form-group">
                            <label htmlFor="departure-date">Fecha de salida</label>
                            <input 
                              id="departure-date" 
                              className={`form-input ${getInputClass(departureDate)}`}
                              type="date" 
                              value={departureDate} 
                              onChange={(e) => setDepartureDate(e.target.value)} 
                            />
                          </div>
                        </div>

                        {/* DIVISOR */}
                        <div className="route-divider" aria-hidden>
                          <div className="route-icon" title="Ruta">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="#fff"/>
                            </svg>
                          </div>
                        </div>

                        {/* DESTINO */}
                        <div className="destination-section">
                          <div className="form-group">
                            <label htmlFor="dest-city">Destino</label>
                            <select 
                              id="dest-city" 
                              className={`form-select ${getInputClass(destCity)}`}
                              value={destCity} 
                              onChange={(e) => setDestCity(e.target.value)}
                              disabled={loadingCities}
                            >
                              <option value="">
                                {loadingCities ? 'Cargando ciudades...' : 'Selecciona un destino'}
                              </option>
                              {cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                  {city.nombre} ({city.codigoIata}) - {city.pais}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Fecha de regreso */}
                          <div className="form-group">
                            <label htmlFor="return-date">Fecha de regreso</label>
                            <input 
                              id="return-date" 
                              className={`form-input ${getInputClass(returnDate)}`}
                              type="date" 
                              value={returnDate} 
                              onChange={(e) => setReturnDate(e.target.value)} 
                              disabled={!roundTrip} 
                            />
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div className="roundtrip-checkbox">
                          <input id="roundTrip" type="checkbox" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
                          <label htmlFor="roundTrip">Ida y vuelta</label>
                        </div>

                        {/* Badge y Botones en la misma fila */}
                        <div className="form-info-with-actions">
                          <div className={`badge ${samePlace ? "badge-warn" : (firstCompleted ? "badge-ok" : "badge-warn")}`}>
                            {samePlace ? "Origen = Destino" : (firstCompleted ? "Todo listo" : "Faltan campos requeridos")}
                          </div>
                          
                          <div className="controls-actions">
                            <button className="btn-secondary" onClick={() => {
                              setOriginCity("");
                              setDestCity("");
                              setRoundTrip(false);
                              setDepartureDate("");
                              setReturnDate("");
                            }}>Limpiar todo</button>

                            <button
                              className="btn-cta"
                              disabled={!firstCompleted}
                              onClick={() => {
                                searchFlights();
                                setActiveTab(1);
                              }}
                            >
                              Buscar vuelos →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 1 - VUELOS */}
                {activeTab === 1 && (
                  <div className="card flights-card">
                    <div className="flights-header">
                      <div>
                        <h3 className="card-title">Vuelos disponibles</h3>
                        <div className="muted">
                          {cities.find(c => c.id === Number(originCity))?.nombre} → {cities.find(c => c.id === Number(destCity))?.nombre} | {departureDate}
                        </div>
                      </div>
                    </div>

                    {loadingFlights ? (
                      <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div className="spinner"></div>
                        <p>Buscando vuelos...</p>
                      </div>
                    ) : flights.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        <p>No se encontraron vuelos para esta ruta y fecha</p>
                        <button className="btn-secondary" onClick={() => setActiveTab(0)}>
                          Cambiar búsqueda
                        </button>
                      </div>
                    ) : (
                      <div className="flights-list">
                        {flights.map((flight) => (
                          <div 
                            key={flight.id} 
                            className={`flight-card ${selectedFlight?.id === flight.id ? 'selected' : ''}`}
                            onClick={() => setSelectedFlight(flight)}
                          >
                            {/* Columna izquierda: Info básica del vuelo */}
                            <div className="flight-info-left">
                              <div className="flight-number">{flight.numeroVuelo}</div>
                              <div className="flight-status">{flight.estado}</div>
                              <div className="flight-duration">
                                <span className="duration-label">Duración:</span>
                                <span className="duration-value">{Math.floor(flight.duracionMinutos / 60)}h {flight.duracionMinutos % 60}m</span>
                              </div>
                            </div>

                            {/* Columna central: Ruta del vuelo */}
                            <div className="flight-route">
                              <div className="flight-time">
                                <div className="time-value">{new Date(flight.fechaSalida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="city-name">{flight.ciudadOrigen.nombre}</div>
                              </div>

                              <div className="flight-path">
                                <div className="path-line"></div>
                                <div className="plane-icon">✈</div>
                              </div>

                              <div className="flight-time">
                                <div className="time-value">{new Date(flight.fechaLlegada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="city-name">{flight.ciudadDestino.nombre}</div>
                              </div>
                            </div>

                            {/* Columna derecha: Precios */}
                            <div className="flight-prices">
                              <div className="price-option">
                                <div>
                                  <div className="price-class">Económica</div>
                                  <div className="price-seats">{flight.asientosDisponiblesEconomica} disponibles</div>
                                </div>
                                <div className="price-amount">${flight.precioEconomica.toLocaleString()}</div>
                              </div>
                              <div className="price-option">
                                <div>
                                  <div className="price-class">Ejecutiva</div>
                                  <div className="price-seats">{flight.asientosDisponiblesEjecutiva} disponibles</div>
                                </div>
                                <div className="price-amount">${flight.precioEjecutiva.toLocaleString()}</div>
                              </div>
                              <div className="price-option">
                                <div>
                                  <div className="price-class">Primera Clase</div>
                                  <div className="price-seats">{flight.asientosDisponiblesPrimeraClase} disponibles</div>
                                </div>
                                <div className="price-amount">${flight.precioPrimeraClase.toLocaleString()}</div>
                              </div>
                            </div>

                            {selectedFlight?.id === flight.id && (
                              <div className="flight-selected-badge">
                                ✓ Seleccionado
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, gap: 8 }}>
                      <button className="btn-secondary" onClick={() => setActiveTab(0)}>Volver</button>
                      <button
                        className="btn-cta"
                        disabled={!selectedFlight}
                        onClick={() => setActiveTab(2)}
                      >
                        Continuar a asientos →
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2 - ASIENTOS */}
                {activeTab === 2 && (
                  <div className="card seats-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h3 className="card-title" style={{ margin: 0 }}>Mapa de asientos</h3>
                        <div className="muted" style={{ marginTop: 6 }}>Selecciona tu asiento</div>
                      </div>
                      <div className="seat-legend" aria-hidden>
                        <div><span className="legend-box available" /> Disponible</div>
                        <div><span className="legend-box selected" /> Seleccionado</div>
                        <div><span className="legend-box occupied" /> Ocupado</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <SeatSelector 
                        onSelect={(s) => setSelectedSeat(s)} 
                        flightId={selectedFlight?.id}
                      />
                    </div>

                    {/* BOTONES ASIENTOS */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                      <button className="btn-secondary" onClick={() => {
                        // Nota: No desbloqueamos el asiento - permanece reservado por 15 minutos
                        setActiveTab(1);
                      }}>Volver a vuelos</button>
                      <button className="btn-cta" disabled={!selectedSeat} onClick={async () => {
                        // Bloquear el asiento al continuar a extras
                        if (selectedSeat && selectedSeat.dbId) {
                          try {
                            const { seatLockAPI } = await import('./services/api');
                            // Usar ID temporal de sessionStorage
                            const userId = sessionStorage.getItem('userSessionId') || 
                                          'user-' + Math.random().toString(36).substr(2, 9);
                            
                            // Guardar el userId para usarlo en el pago
                            sessionStorage.setItem('userSessionId', userId);
                            
                            const response = await seatLockAPI.lockSeat(selectedSeat.dbId, userId);
                            if (response.data.success) {
                              setLockedSeatId(selectedSeat.dbId);
                              setActiveTab(3);
                              console.log('✅ Asiento bloqueado por 15 minutos para', userId);
                            } else {
                              alert('Este asiento está siendo seleccionado por otro usuario. Por favor regresa y elige otro asiento.');
                            }
                          } catch (error) {
                            console.error('Error al bloquear asiento:', error);
                            alert('No se pudo bloquear el asiento. Por favor intenta de nuevo.');
                          }
                        } else {
                          setActiveTab(3);
                        }
                      }}>
                        Continuar a extras →
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3 - EXTRAS */}
                {activeTab === 3 && (
                  <div className="card extras-card">
                    <ExtrasSelector 
                      selectedSeat={selectedSeat}
                      onExtrasChange={(extras) => setSelectedExtras(extras)}
                    />

                    {/* BOTONES EXTRAS */}
                    <div className="extras-actions">
                      <button className="btn-secondary" onClick={() => {
                        setActiveTab(2);
                      }}>Volver a asientos</button>
                      <button className="btn-cta" onClick={() => {
                        setRouteConfirmed(true);
                        setActiveTab(4);
                      }}>
                        Continuar a mapas →
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4 - MAPAS */}
                {activeTab === 4 && (
                  <div className="maps-container">
                    <div className="card map2d-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ margin: 0 }}>Mapa 2D</h4>
                        <div className="muted">Arrastra o haz zoom para inspeccionar la ruta</div>
                      </div>

                      <div className="map-inner" style={{ marginTop: 8 }}>
                        {originCoords && destCoords ? (
                          <FlightMap2D
                            origin={originCoords}
                            destination={destCoords}
                            drawSpeed={8}
                            planeSpeed={2.4}
                            steps={240}
                            strokeColor="#0ea5a4"
                            strokeWidth={4}
                            height="260px"
                            key={`2d_${originCoords.join(",")}_${destCoords.join(",")}`}
                          />
                        ) : (
                          <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
                            Completa los campos de origen y destino para ver el mapa
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="maps-grid">
                      <div className="card map-card">
                        <h4 style={{ margin: 0, marginBottom: 8 }}>Mapa de recorrido</h4>
                        <div className="map-inner" style={{ height: 220 }}>
                          {originCoords && destCoords ? (
                            <FlightMap
                              origin={originCoords}
                              destination={destCoords}
                              drawSpeed={12}
                              planeSpeed={3}
                              particlesCount={18}
                              startPlaneBeforeComplete={false}
                              key={`${originCoords.join(",")}_${destCoords.join(",")}`}
                            />
                          ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
                              Completa los campos de origen y destino para ver el mapa 3D
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="card viewer-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h4 style={{ margin: 0 }}>Avión 3D</h4>
                          <div className="muted">Interactúa con el modelo</div>
                        </div>
                        <div className="viewer-body" style={{ marginTop: 8 }}>
                          <PlaneViewer modelPath="/models/boeing787.glb" envPath="/models/env.hdr" height="220px" />
                        </div>
                      </div>
                    </div>

                    {/* BOTONES MAPAS */}
                    <div className="map-actions">
                      <button className="btn-secondary" onClick={async () => {
                        setActiveTab(3);
                      }}>Volver a extras</button>
                      <button className="btn-cta" onClick={() => {
                        // Solo avanzar al tab de pagos, NO crear la reserva aquí
                        if (!selectedFlight || !selectedSeat) {
                          alert('Por favor selecciona un vuelo y un asiento');
                          return;
                        }
                        setActiveTab(5); // Ir a Pagos
                      }}>
                        Continuar a pago →
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 5 - PAGOS */}
                {activeTab === 5 && (
                  <div className="tab-content">
                    {/* Helper para calcular precio de extras según clase */}
                    {(() => {})()}
                    <PaymentForm
                      selectedFlight={selectedFlight}
                      selectedSeat={selectedSeat}
                      extrasSeleccionados={selectedExtras}
                      precioTotal={(() => {
                        const base = Number(selectedSeat?.precio || 0);
                        const clase = selectedSeat?.clase;
                        const ex = selectedExtras || {};
                        if (clase === 'PRIMERA_CLASE') return base; // todos incluidos
                        let extras = 0;
                        if (ex.maletaCabina) extras += 25000;
                        if (ex.maletaBodega && clase !== 'EJECUTIVA') extras += 45000; // en ejecutiva incluido
                        if (ex.seguro50) extras += 35000;
                        if (ex.seguro100) extras += 60000;
                        if (ex.asistenciaEspecial) extras += 50000;
                        return base + extras;
                      })()}
                      onConfirmPayment={async (paymentData) => {
                        try {
                          const { reservationAPI } = await import('./services/api');
                          // Obtener el userId que se usó para bloquear el asiento
                          const lockUserId = sessionStorage.getItem('userSessionId');
                          
                          // Preparar datos completos de la reserva
                          // Calcular precioExtras con reglas de clase
                          const calcPrecioExtras = (() => {
                            const clase = selectedSeat.clase;
                            const ex = selectedExtras || {};
                            if (clase === 'PRIMERA_CLASE') return 0;
                            let extras = 0;
                            if (ex.maletaCabina) extras += 25000;
                            if (ex.maletaBodega && clase !== 'EJECUTIVA') extras += 45000;
                            if (ex.seguro50) extras += 35000;
                            if (ex.seguro100) extras += 60000;
                            if (ex.asistenciaEspecial) extras += 50000;
                            return extras;
                          })();

                          const reservationData = {
                            vueloId: selectedFlight.id,
                            asientoId: selectedSeat.dbId,
                            lockUserId: lockUserId, // Enviar el ID usado para bloquear
                            pasajeroNombre: paymentData.nombre,
                            pasajeroApellido: paymentData.apellido,
                            pasajeroEmail: paymentData.email,
                            pasajeroTelefono: paymentData.telefono,
                            pasajeroDocumentoTipo: paymentData.documentoTipo,
                            pasajeroDocumentoNumero: paymentData.documentoNumero,
                            pasajeroFechaNacimiento: paymentData.fechaNacimiento,
                            clase: selectedSeat.clase,
                            precioAsiento: selectedSeat.precio,
                            precioExtras: calcPrecioExtras,
                            precioTotal: Number(selectedSeat?.precio || 0) + calcPrecioExtras,
                            extraMaletaCabina: selectedSeat.clase === 'PRIMERA_CLASE' ? true : (selectedExtras?.maletaCabina || false),
                            extraMaletaBodega: selectedSeat.clase === 'PRIMERA_CLASE' || selectedSeat.clase === 'EJECUTIVA' ? true : (selectedExtras?.maletaBodega || false),
                            extraSeguro50: selectedSeat.clase === 'PRIMERA_CLASE' ? true : (selectedExtras?.seguro50 || false),
                            extraSeguro100: selectedSeat.clase === 'PRIMERA_CLASE' ? true : (selectedExtras?.seguro100 || false),
                            extraAsistenciaEspecial: selectedSeat.clase === 'PRIMERA_CLASE' ? true : (selectedExtras?.asistenciaEspecial || false),
                            metodoPago: paymentData.metodoPago,
                            estadoPago: 'APROBADO',
                            estado: 'CONFIRMADA'
                          };

                          console.log('📤 Enviando reserva completa:', reservationData);
                          console.log('🔍 DEBUG FRONTEND:');
                          console.log('   - lockUserId enviado:', lockUserId);
                          console.log('   - pasajeroEmail enviado:', paymentData.email);
                          console.log('   - userSessionId en storage:', sessionStorage.getItem('userSessionId'));
                          
                          // Crear la reserva (esto marca el asiento como ocupado en la BD)
                          const response = await reservationAPI.createReservation(reservationData);
                          
                          console.log('✅ Reserva creada exitosamente:', response.data);
                          
                          // El asiento ahora está ocupado permanentemente en la BD
                          
                          // Mostrar confirmación
                          const originCityName = cities.find(c => c.id === Number(originCity))?.nombre || 'origen';
                          const destCityName = cities.find(c => c.id === Number(destCity))?.nombre || 'destino';
                          alert(`¡Reserva confirmada exitosamente! 🎉\n\nCódigo de reserva: ${response.data.codigoReservacion || 'Generando...'}\nVuelo: ${selectedFlight.numeroVuelo}\nAsiento: ${selectedSeat.id}\nRuta: ${originCityName} → ${destCityName}\n\nRecibirás un correo de confirmación en: ${paymentData.email}`);
                          
                          // Resetear el formulario
                          setActiveTab(0);
                          setSelectedFlight(null);
                          setSelectedSeat(null);
                          setSelectedExtras(null);
                          setLockedSeatId(null);
                          setOriginCity("");
                          setDestCity("");
                          setDepartureDate("");
                          setReturnDate("");
                          setRouteConfirmed(false);
                          
                        } catch (error) {
                          console.error('❌ Error al confirmar reserva:', error);
                          const msg = typeof error.response?.data === 'string' ? error.response.data : error.response?.data?.message;
                          if (error.response?.status === 409) {
                            alert(`No se pudo confirmar: ${msg || 'el asiento no está disponible en este momento.'}`);
                          } else if (error.response?.status === 400) {
                            alert(`Error: ${msg || 'El asiento ya está ocupado o no está bloqueado.'}`);
                          } else {
                            alert('Ocurrió un error al confirmar la reserva. Por favor intenta nuevamente.');
                          }
                          throw error;
                        }
                      }}
                      onBack={() => setActiveTab(4)}
                    />
                  </div>
                )}

              </div>
              {/* Cierre del contenedor flex principal */}
            </div>
            </div>
          </section>

          {/* NUEVA SECCIÓN DE PASOS MEJORADA - COMPACTA - AHORA JUSTO DEBAJO DE RESERVA TU VUELO */}
          <section id="cdt-mechanics-2" className="booking-steps-section">
            <div className="booking-steps-inner">
              <div className="booking-steps-header">
                <p className="tiny">Proceso de reserva</p>
                <h2 className="booking-steps-title">Reserva tu vuelo en 4 simples pasos</h2>
                <p className="booking-steps-subtitle">
                  Un proceso sencillo y seguro para que tu próxima aventura comience sin complicaciones
                </p>
              </div>

              <div className="booking-steps-container">
                {bookingSteps.map((step, index) => (
                  <div className="booking-step" key={index}>
                    <div className="step-visual">
                      <div className="step-number" style={{ backgroundColor: step.color }}>
                        {step.number}
                      </div>
                      <div className="step-icon-container" style={{ borderColor: step.color }}>
                        {step.icon}
                      </div>
                    </div>
                    
                    <div className="step-content">
                      <h3 className="step-title">{step.title}</h3>
                      <p className="step-description">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="booking-cta">
                <button className="booking-button" onClick={() => setActiveTab(0)}>
                  Comenzar reserva
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
                <p className="booking-note">Reserva en menos de 5 minutos • Sin cargos ocultos</p>
              </div>
            </div>
          </section>

          {/* SERVICIOS MEJORADOS */}
          <section id="products" className="products-section new-products">
            <div className="products-inner">
              <p className="tiny">Nuestros servicios</p>
              <h2 className="products-title">Experiencias de viaje excepcionales</h2>
              <p className="products-subtitle">Descubre nuestra gama completa de servicios diseñados para hacer de tu viaje una experiencia inolvidable</p>

              <div className="product-cards">
                {productCards.map((p, idx) => (
                  <article className="product-card" key={idx}>
                    <div className="product-card-header">
                      <div className="product-icon">
                        {p.icon}
                      </div>
                      <p className="product-name">{p.title}</p>
                    </div>
                    
                    <div className="product-card-body">
                      <h3 className="product-desc">{p.desc}</h3>
                      
                      <div className="product-features">
                        {p.features.map((feature, i) => (
                          <div className="product-feature" key={i}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="product-card-footer">
                      <div className="product-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Disponible
                      </div>
                      <button className="product-more" aria-label={`Ver ${p.title}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* DESTINATIONS CAROUSEL */}
          <section className="features-section">
            <div className="features-inner">
              <p className="tiny">Por qué elegirnos</p>
              <h2 className="features-title">Vuela con la mejor experiencia</h2>

              <div className="carousel-wrap">
                <button className="carousel-arrow left" onClick={() => scrollCarousel(-480)} aria-label="Anterior">‹</button>

                <div className="carousel" ref={carouselRef}>
                  {destinationFeatures.map((f, i) => (
                    <div className="feature-card" key={i}>
                      <div 
                        className="feature-media" 
                        style={{backgroundImage: `url(${f.img})`}}
                      />
                      <div className="feature-overlay"></div>
                      <div className="feature-content">
                        <strong className="feature-chip">{f.title}</strong>
                        <p className="feature-sub">{f.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="carousel-arrow right" onClick={() => scrollCarousel(480)} aria-label="Siguiente">›</button>
              </div>

              {/* Indicadores del carrusel */}
              <div className="carousel-indicators">
                {destinationFeatures.map((_, index) => (
                  <button
                    key={index}
                    className={`indicator ${currentSlide === index ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Ir a slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* SECCIÓN MEJORADA - AL ELEGIR F4U CON 6 ELEMENTOS */}
          <section className="f4u-benefits-section">
            <div className="f4u-benefits-inner">
              <div className="benefits-header">
                <p className="tiny">Ventajas exclusivas</p>
                <h2 className="benefits-title">
                  Al elegir <span className="f4u-gradient">F4U</span>, eliges
                </h2>
                <p className="benefits-subtitle">
                  Descubre todas las ventajas que hacen de tu experiencia de vuelo algo extraordinario
                </p>
              </div>

              <div className="benefits-grid">
                {accordionItems.map((it, i) => (
                  <div 
                    className={`benefit-card ${openIndex === i ? "active" : ""}`}
                    key={i}
                    onClick={() => toggleAccordion(i)}
                  >
                    <div className="benefit-card-header">
                      <div className="benefit-icon-wrapper">
                        <div className="benefit-icon">
                          {i === 0 && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                          )}
                          {i === 1 && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          )}
                          {i === 2 && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                          )}
                          {i === 3 && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                          )}
                          {i === 4 && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                              <line x1="7" y1="7" x2="7.01" y2="7"/>
                            </svg>
                          )}
                          {i === 5 && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          )}
                        </div>
                      </div>
                      
                      <div className="benefit-content">
                        <h3 className="benefit-title">{it.title}</h3>
                        <div className={`benefit-body ${openIndex === i ? "show" : ""}`}>
                          <p>{it.body}</p>
                        </div>
                      </div>

                      <div className="benefit-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points={openIndex === i ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
                        </svg>
                      </div>
                    </div>
                    
                    <div className="benefit-background"></div>
                  </div>
                ))}
              </div>

              <div className="benefits-cta">
                <button className="benefits-button" onClick={() => setActiveTab(0)}>
                  Comenzar a volar
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </section>

          {/* FOOTER MEJORADO */}
          <footer id="contact" className="site-footer">
            <div className="footer-wave">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" className="shape-fill"></path>
                <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" className="shape-fill"></path>
                <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" className="shape-fill"></path>
              </svg>
            </div>
            
            <div className="footer-inner">
              <div className="footer-main">
                <div className="footer-brand">
                  <div className="footer-logo">
                    <span className="logo-text">F4U</span>
                  </div>
                  <p className="footer-desc">
                    Tu aerolínea de confianza para descubrir el mundo. Conectamos destinos 
                    con excelencia, seguridad y el mejor servicio.
                  </p>
                  <div className="footer-social">
                    <a href="#" aria-label="Facebook" className="social-link">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                    <a href="#" aria-label="Twitter" className="social-link">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                    <a href="#" aria-label="Instagram" className="social-link">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                    <a href="#" aria-label="LinkedIn" className="social-link">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  </div>
                </div>

                <div className="footer-links">
                  <div className="footer-column">
                    <h4>Servicios</h4>
                    <ul>
                      <li><a href="#products">Vuelos Internacionales</a></li>
                      <li><a href="#products">Vuelos Nacionales</a></li>
                      <li><a href="#products">Paquetes Vacacionales</a></li>
                      <li><a href="#products">Clase Ejecutiva</a></li>
                    </ul>
                  </div>

                  <div className="footer-column">
                    <h4>Compañía</h4>
                    <ul>
                      <li><a href="#">Sobre Nosotros</a></li>
                      <li><a href="#">Carreras</a></li>
                      <li><a href="#">Prensa</a></li>
                      <li><a href="#">Sostenibilidad</a></li>
                    </ul>
                  </div>

                  <div className="footer-column">
                    <h4>Ayuda</h4>
                    <ul>
                      <li><a href="#">Centro de Ayuda</a></li>
                      <li><a href="#">Estado de Vuelos</a></li>
                      <li><a href="#">Política de Equipaje</a></li>
                      <li><a href="#">Documentación</a></li>
                    </ul>
                  </div>

                  <div className="footer-column">
                    <h4>Contacto</h4>
                    <div className="contact-info">
                      <div className="contact-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                        <span>reservas@flyforyou.com</span>
                      </div>
                      <div className="contact-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                        </svg>
                        <span>+57 1 123 4567</span>
                      </div>
                      <div className="contact-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        <span>Aeropuerto Internacional, Terminal 4, Bogotá, CO</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="footer-bottom">
                <div className="footer-bottom-content">
                  <div className="copyright">
                    <p>&copy; 2024 Fly For You Airlines (F4U). Todos los derechos reservados.</p>
                  </div>
                  <div className="footer-legal">
                    <a href="#">Términos y Condiciones</a>
                    <a href="#">Política de Privacidad</a>
                    <a href="#">Cookies</a>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </main>
        
        {/* Panel de pruebas - solo en desarrollo */}
        {import.meta.env.DEV && <AuthTest />}
      </div>
    );
  }