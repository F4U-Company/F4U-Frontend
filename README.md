# ✈️ F4U Frontend - Fly For You

<div align="center">

![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.1.10-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-Static_Web_Apps-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-green?style=for-the-badge)

**Sistema de Reservas de Vuelos con Visualización 3D y Autenticación Azure AD**

[Características](#-características-principales) • [Instalación](#-instalación) • [Configuración](#️-configuración) • [Uso](#-uso) • [Arquitectura](#️-arquitectura)

</div>

---

## 📋 Descripción

**F4U Frontend** es una aplicación web moderna y completa para la gestión de reservas de vuelos aéreos. Ofrece una experiencia de usuario excepcional con visualización interactiva de rutas en 3D, selección de asientos en tiempo real, y autenticación segura mediante **Microsoft Azure AD (Entra ID)**.

### 🎯 Propósito del Proyecto

El sistema está diseñado para:
- Facilitar la búsqueda y reserva de vuelos de manera intuitiva
- Proporcionar visualización geográfica de rutas aéreas
- Gestionar la selección de asientos con bloqueo en tiempo real
- Ofrecer servicios adicionales (extras) personalizables
- Garantizar seguridad mediante autenticación empresarial
- Integrar comunicación bidireccional mediante WebSockets

---

## ✨ Características Principales

### 🔐 Autenticación y Seguridad
- **Microsoft Azure AD (Entra ID)** integración completa
- Login social con cuentas Microsoft/organizacionales
- Gestión de tokens JWT para API segura
- Rutas protegidas y control de acceso

### 🗺️ Visualización de Rutas
- **Mapas 3D interactivos** con Globe.GL
- **Mapas 2D** con Leaflet y MapLibre GL
- Visualización de rutas de vuelo en tiempo real
- Geolocalización de ciudades y aeropuertos

### 💺 Sistema de Reservas Completo
- Búsqueda de vuelos (ida simple / ida y vuelta)
- **Selección de asientos** con vista del avión en 3D
- **Bloqueo de asientos en tiempo real** (WebSocket)
- Selección de extras y servicios adicionales
- Proceso de pago integrado

### 🤖 Chatbot Inteligente
- Asistente virtual para consultas
- Respuestas en tiempo real
- Integración con backend

### 📱 Diseño Responsivo
- Compatible con móviles, tablets y desktop
- Interfaz moderna y accesible
- Optimizada para rendimiento

---

## 🚀 Instalación

### Requisitos Previos

- **Node.js** >= 18.x
- **npm** >= 9.x o **yarn**
- **Git**
- Cuenta de **Azure Active Directory** configurada

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/F4U-Company/F4U-Frontend.git
cd F4U-Frontend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno** (ver [Configuración](#️-configuración))

4. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

5. **Compilar para producción**
```bash
npm run build
```

---

## ⚙️ Configuración

### Variables de Entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.local.example .env.local
```

#### Archivo `.env.local`

```env
# URL del Backend
VITE_API_URL=http://localhost:8080

# Azure AD Configuration
VITE_AZURE_CLIENT_ID=tu-client-id-aqui
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/common
```

### Configuración de Azure AD

1. **Crear App Registration** en Azure Portal
   - Portal Azure → Azure Active Directory → App registrations → New registration

2. **Configurar Redirect URIs**
   - Desarrollo: `http://localhost:5173`
   - Producción: `https://tu-dominio.azurestaticapps.net`

3. **Habilitar autenticación implícita**
   - ID tokens
   - Access tokens

4. **Copiar Client ID** al archivo `.env.local`

### Configuración del Backend

Asegúrate de que el backend esté ejecutándose en `http://localhost:8080` o actualiza `VITE_API_URL` según corresponda.

---

## 🎮 Uso

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo
npm run dev

# El servidor estará disponible en http://localhost:5173
```

### Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo con hot-reload |
| `npm run build` | Compila la aplicación para producción |
| `npm run preview` | Previsualiza la build de producción localmente |

### Flujo de Usuario

1. **Acceso y Autenticación**
   - Usuario ingresa a la aplicación
   - Hace clic en "Iniciar Sesión"
   - Autentica con Microsoft Azure AD

2. **Búsqueda de Vuelos**
   - Selecciona origen y destino
   - Elige fechas de viaje
   - Define si es ida simple o ida y vuelta
   - Confirma la ruta

3. **Selección de Vuelo**
   - Visualiza opciones disponibles en mapa 3D/2D
   - Revisa detalles del vuelo
   - Selecciona el vuelo deseado

4. **Selección de Asiento**
   - Visualiza el avión en 3D
   - Elige asiento disponible
   - Sistema bloquea el asiento en tiempo real

5. **Extras y Servicios**
   - Añade equipaje adicional
   - Selecciona comidas especiales
   - Otros servicios premium

6. **Pago y Confirmación**
   - Completa información de pago
   - Confirma la reserva
   - Recibe confirmación por correo

---

## 🏗️ Arquitectura

### Estructura del Proyecto

```
F4U-Frontend/
├── public/                    # Recursos estáticos
│   ├── img/                   # Imágenes del proyecto
│   └── models/                # Modelos 3D (.glb, .gltf)
├── src/
│   ├── assets/                # Assets del proyecto
│   ├── components/            # Componentes React reutilizables
│   │   ├── AuthTest.jsx       # Pruebas de autenticación
│   │   ├── Chatbot.jsx        # Chatbot integrado
│   │   ├── ExtrasSelector.jsx # Selector de extras
│   │   ├── FlightMap.jsx      # Mapa de vuelos 3D
│   │   ├── FlightMap2D.jsx    # Mapa de vuelos 2D
│   │   ├── Login.jsx          # Componente de login
│   │   ├── NavBar.jsx         # Barra de navegación
│   │   ├── PaymentForm.jsx    # Formulario de pago
│   │   ├── PlaneViewer.jsx    # Visualizador 3D del avión
│   │   ├── ProtectedRoute.jsx # HOC para rutas protegidas
│   │   └── SeatSelector.jsx   # Selector de asientos
│   ├── services/              # Servicios y API
│   │   └── api.js             # Configuración de axios y endpoints
│   ├── styles/                # Estilos CSS organizados
│   │   ├── mainStyles/        # Estilos principales
│   │   │   ├── components/    # Estilos de componentes
│   │   │   ├── dashboard/     # Estilos del dashboard
│   │   │   └── sections/      # Estilos por secciones
│   │   ├── reservation-steps/ # Estilos del flujo de reserva
│   │   ├── Chatbot.css
│   │   ├── Login.css
│   │   ├── NavBar.css
│   │   └── PaymentForm.css
│   ├── App.jsx                # Componente principal
│   ├── authConfig.js          # Configuración de Azure MSAL
│   ├── dashboard.jsx          # Dashboard de usuario
│   ├── main.jsx               # Punto de entrada
│   └── index.css              # Estilos globales
├── .env.local                 # Variables de entorno (no en git)
├── .env.local.example         # Ejemplo de variables de entorno
├── .env.production            # Variables para producción
├── index.html                 # HTML principal
├── package.json               # Dependencias y scripts
└── README.md                  # Este archivo
```

### Stack Tecnológico

#### Frontend Framework
- **React 19.2.0** - Biblioteca de UI con hooks modernos
- **Vite 7.1.10** - Build tool ultra-rápido con HMR

#### Visualización y Mapas
- **Globe.GL 2.44.1** - Globo terráqueo 3D interactivo
- **Three.js 0.180.0** - Renderizado 3D para modelos de aviones
- **Leaflet 1.9.4** - Mapas 2D interactivos
- **MapLibre GL 5.9.0** - Mapas vectoriales de alto rendimiento
- **@turf/turf 7.2.0** - Análisis geoespacial

#### Autenticación
- **@azure/msal-browser 4.25.1** - Autenticación Azure AD
- **@azure/msal-react 3.0.20** - Integración React con MSAL

#### Comunicación
- **Axios 1.12.2** - Cliente HTTP para API REST
- **@stomp/stompjs 7.2.1** - WebSocket para tiempo real
- **sockjs-client 1.6.1** - Fallback de WebSocket

#### Routing
- **React Router DOM 7.9.6** - Enrutamiento SPA

---

## 🔌 Integración con Backend

### Endpoints Principales

```javascript
// src/services/api.js

// Autenticación
POST /api/auth/login
POST /api/auth/register

// Ciudades
GET /api/cities

// Vuelos
GET /api/flights/search?origin={origin}&destination={destination}
GET /api/flights/{id}

// Asientos
GET /api/seats/flight/{flightId}
POST /api/seats/lock
POST /api/seats/unlock

// Reservas
POST /api/reservations
GET /api/reservations/user/{userId}

// Chatbot
POST /api/chatbot/message
```

### WebSocket (Tiempo Real)

```javascript
// Suscripción a actualizaciones de asientos
const stompClient = Stomp.over(new SockJS(`${API_URL}/ws`));
stompClient.subscribe('/topic/seats/{flightId}', callback);
```

---

## 🔒 Seguridad

### Medidas Implementadas

- ✅ **Autenticación OAuth 2.0** con Azure AD
- ✅ **Tokens JWT** para autorización de API
- ✅ **HTTPS** obligatorio en producción
- ✅ **CORS** configurado correctamente
- ✅ **Variables de entorno** para secretos
- ✅ **Sanitización** de inputs de usuario
- ✅ **Rutas protegidas** con autenticación obligatoria

### Buenas Prácticas

```javascript
// Ejemplo de ruta protegida
import ProtectedRoute from './components/ProtectedRoute';

<ProtectedRoute>
  <DashboardComponent />
</ProtectedRoute>
```

---

## 🚢 Despliegue

### Azure Static Web Apps

El proyecto está configurado para despliegue automático en **Azure Static Web Apps** mediante GitHub Actions.

#### Configuración de CI/CD

El archivo `.github/workflows/azure-static-web-apps-*.yml` gestiona:
- Build automático en cada push
- Deploy a ambiente de staging
- Deploy a producción en merge a `main`

#### Variables de Entorno en Azure

Configura en Azure Portal → Static Web Apps → Configuration:

```
VITE_API_URL=https://tu-backend.azurewebsites.net
VITE_AZURE_CLIENT_ID=tu-client-id-produccion
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/common
```

### Build Manual

```bash
# Compilar para producción
npm run build

# Los archivos estarán en /dist
# Subir contenido de /dist a tu servidor
```

---

## 🧪 Testing

### Componentes de Prueba

- `AuthTest.jsx` - Verificación de autenticación Azure AD
- Pruebas de integración con backend

### Ejecutar Pruebas

```bash
# Próximamente
npm run test
```

---

## 📦 Dependencias Principales

### Producción

```json
{
  "@azure/msal-browser": "^4.25.1",     // Autenticación Azure
  "@azure/msal-react": "^3.0.20",       // React + Azure AD
  "@stomp/stompjs": "^7.2.1",           // WebSocket STOMP
  "@turf/turf": "^7.2.0",               // Geoespacial
  "axios": "^1.12.2",                    // HTTP client
  "globe.gl": "^2.44.1",                 // Globo 3D
  "leaflet": "^1.9.4",                   // Mapas 2D
  "maplibre-gl": "^5.9.0",               // Mapas vectoriales
  "react": "^19.2.0",                    // UI Framework
  "react-dom": "^19.2.0",                // React DOM
  "react-router-dom": "^7.9.6",          // Routing
  "sockjs-client": "^1.6.1",             // WebSocket fallback
  "three": "^0.180.0"                    // 3D rendering
}
```

### Desarrollo

```json
{
  "@vitejs/plugin-react": "^5.0.4",     // Plugin Vite para React
  "vite": "^7.1.10"                      // Build tool
}
```

---

## 🤝 Contribución

### Workflow de Contribución

1. **Fork** el proyecto
2. Crea una **rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add: Amazing Feature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. Abre un **Pull Request**

### Convenciones de Código

- **ESLint** para linting
- **Prettier** para formato
- Nombres de componentes en **PascalCase**
- Nombres de archivos en **PascalCase.jsx**
- Variables en **camelCase**
- Constantes en **UPPER_SNAKE_CASE**

### Estructura de Commits

```
Add: Nueva funcionalidad
Fix: Corrección de bug
Update: Actualización de código existente
Refactor: Reestructuración sin cambio de funcionalidad
Style: Cambios de formato/estilo
Docs: Documentación
Test: Pruebas
```

---

## 📄 Licencia

Este proyecto está bajo la licencia **ISC**.

---

## 👥 Equipo

**F4U Company** - Fly For You

- 🌐 [GitHub Organization](https://github.com/F4U-Company)
- 📧 Contacto: [contacto@f4u.com](mailto:contacto@f4u.com)

---

## 📞 Soporte

### Reportar Issues

Si encuentras un bug o tienes una sugerencia:
1. Revisa los [issues existentes](https://github.com/F4U-Company/F4U-Frontend/issues)
2. Crea un [nuevo issue](https://github.com/F4U-Company/F4U-Frontend/issues/new) con:
   - Descripción detallada
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots (si aplica)

### FAQs

**Q: ¿Cómo obtengo credenciales de Azure AD?**
A: Necesitas una cuenta de Azure. Ve a Azure Portal → Azure Active Directory → App registrations

**Q: ¿El proyecto funciona sin Azure AD?**
A: No, la autenticación Azure AD es obligatoria. Puedes crear una cuenta gratuita en Azure.

**Q: ¿Cómo actualizo las dependencias?**
A: Ejecuta `npm update` o `npm install <paquete>@latest`

**Q: ¿Puedo usar otro sistema de autenticación?**
A: Sí, pero requiere modificar `authConfig.js` y componentes relacionados.

---

## 🗺️ Roadmap

### Versión Actual (1.0.0)
- ✅ Sistema de autenticación completo
- ✅ Búsqueda y reserva de vuelos
- ✅ Visualización 3D/2D de rutas
- ✅ Selección de asientos en tiempo real
- ✅ Sistema de extras
- ✅ Integración con backend

### Próximas Versiones

#### v1.1.0
- [ ] Sistema de notificaciones push
- [ ] Historial de reservas mejorado
- [ ] Multi-idioma (i18n)
- [ ] Tema oscuro/claro

#### v1.2.0
- [ ] App móvil (React Native)
- [ ] Pagos con múltiples métodos
- [ ] Sistema de recompensas/puntos
- [ ] Integración con calendarios

#### v2.0.0
- [ ] IA para recomendaciones personalizadas
- [ ] Realidad aumentada en asientos
- [ ] Check-in automático
- [ ] Asistente virtual mejorado

---

## 🙏 Agradecimientos

- **React Team** por el increíble framework
- **Microsoft** por Azure AD y servicios cloud
- **Three.js Community** por visualización 3D
- **OpenStreetMap** por datos cartográficos

---

<div align="center">

**[⬆ Volver arriba](#️-f4u-frontend---fly-for-you)**

Hecho con ❤️ por **F4U Company**

</div>
