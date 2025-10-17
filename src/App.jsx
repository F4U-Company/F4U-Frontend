// src/App.jsx
import React, { useMemo, useState, useEffect } from "react";
import FlightMap from "./components/FlightMap";
import FlightMap2D from "./components/FlightMap2D";
import PlaneViewer from "./components/PlaneViewer";
import SeatSelector from "./components/SeatSelector";
import "./index.css";

/* ---------- datos de ejemplo ---------- */
const DATA = {
  "Estados Unidos": [
    { name: "Miami", coords: [-80.1918, 25.7617] },
    { name: "New York", coords: [-74.0060, 40.7128] },
    { name: "Los Angeles", coords: [-118.2437, 34.0522] },
  ],
  "Colombia": [
    { name: "Bogotá", coords: [-74.0721, 4.7110] },
    { name: "Medellín", coords: [-75.5636, 6.2442] },
    { name: "Cali", coords: [-76.5215, 3.4516] },
    { name: "Cartagena", coords: [-75.4794, 10.3910] },
  ],
  "España": [
    { name: "Madrid", coords: [-3.7038, 40.4168] },
    { name: "Barcelona", coords: [2.1734, 41.3851] },
  ],
  "Perú": [{ name: "Lima", coords: [-77.0428, -12.0464] }],
};

const CAROUSEL = [
  { title: "Vuela donde quieras", subtitle: "Rutas rápidas — precios justos", accent: "linear-gradient(135deg,#06b6d4,#0ea5a4)", emoji: "✈️" },
  { title: "Explora el mundo", subtitle: "Mapas, asientos y modelo 3D interactivo", accent: "linear-gradient(135deg,#7c3aed,#a78bfa)", emoji: "🌍" },
  { title: "Reserva con estilo", subtitle: "Interfaz simple, experiencia premium", accent: "linear-gradient(135deg,#fb7185,#fb923c)", emoji: "🎟️" },
];

export default function App() {
  const countryOptions = Object.keys(DATA);
  
  // CAMPOS VACÍOS POR DEFECTO
  const [originCountry, setOriginCountry] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [destCountry, setDestCountry] = useState("");
  const [destCity, setDestCity] = useState("");

  // Fechas vacías por defecto
  const [roundTrip, setRoundTrip] = useState(false);
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");

  const originCities = useMemo(() => 
    originCountry ? DATA[originCountry] : [], 
    [originCountry]
  );
  
  const destCities = useMemo(() => 
    destCountry ? DATA[destCountry] : [], 
    [destCountry]
  );

  const originCoords = useMemo(
    () => originCities.find((c) => c.name === originCity)?.coords ?? null,
    [originCities, originCity]
  );
  
  const destCoords = useMemo(
    () => destCities.find((c) => c.name === destCity)?.coords ?? null,
    [destCities, destCity]
  );

  const samePlace = originCountry === destCountry && originCity === destCity;
  const [selectedSeat, setSelectedSeat] = useState(null);

  // Carrusel automático cada 4s
  const [currentCard, setCurrentCard] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCurrentCard((p) => (p + 1) % CAROUSEL.length), 4000);
    return () => clearInterval(id);
  }, []);

  /* Validación simple - solo verifica que estén llenos los campos básicos */
  const firstCompleted = Boolean(
    originCountry &&
    originCity &&
    destCountry &&
    destCity &&
    !samePlace &&
    departureDate &&
    departureTime
  );

  /* Tabs state */
  const [activeTab, setActiveTab] = useState(0);
  const [routeConfirmed, setRouteConfirmed] = useState(false);

  // Función para obtener clase CSS basada en si el campo está lleno o vacío
  const getInputClass = (value) => value ? "input-valid" : "input-invalid";

  // control de apertura de pestañas
  const tryOpenTab = (tabIndex) => {
    if (tabIndex === 0) { 
      setActiveTab(0); 
      return; 
    }
    if (tabIndex === 1) {
      if (!firstCompleted) {
        alert("Por favor completa todos los campos de origen y destino primero");
        return;
      }
      setActiveTab(1);
      return;
    }
    if (tabIndex === 2) {
      if (!routeConfirmed) {
        setActiveTab(1);
        return;
      }
      setActiveTab(2);
    }
  };

  const firstStatusText = firstCompleted ? "Completado" : samePlace ? "Origen y destino iguales" : "Completa los campos requeridos";
  const secondStatusText = routeConfirmed ? "Ruta confirmada" : "Confirma la ruta para continuar";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">✈️</div>
          <div>
            <h1 className="brand-title">F4U Flights</h1>
            <div className="brand-sub">Reserva tu asiento — Demo interactiva</div>
          </div>
        </div>

        <div className="header-cta">
          <button className="btn-ghost">Ayuda</button>
          <button className="btn-primary">Iniciar reserva</button>
        </div>
      </header>

      <main className="main-content">
        {/* Carrusel */}
        <section className="carousel">
          <div className="carousel-card" style={{ background: CAROUSEL[currentCard].accent }} aria-live="polite">
            <div className="carousel-content">
              <div className="emoji">{CAROUSEL[currentCard].emoji}</div>
              <h2>{CAROUSEL[currentCard].title}</h2>
              <p>{CAROUSEL[currentCard].subtitle}</p>
            </div>
          </div>

          <div className="carousel-dots" aria-hidden>
            {CAROUSEL.map((_, i) => (
              <button key={i} className={`dot ${i === currentCard ? "active" : ""}`} onClick={() => setCurrentCard(i)} aria-label={`Mostrar ${i + 1}`} />
            ))}
          </div>
        </section>

        {/* TAB NAV */}
        <section className="tabs-shell" style={{ maxWidth: 1120, margin: "0 auto 18px", padding: "0 8px" }}>
          <div className="tabs">
            <button className={`tab ${activeTab === 0 ? "active" : ""}`} onClick={() => tryOpenTab(0)}>
              <div className="tab-title">1. Origen & Destino</div>
              <div className="tab-meta">{firstStatusText} {firstCompleted && <span className="tab-check">✓</span>}</div>
            </button>

            <button className={`tab ${activeTab === 1 ? "active" : ""} ${!firstCompleted ? "locked" : ""}`} onClick={() => tryOpenTab(1)}>
              <div className="tab-title">2. Mapas</div>
              <div className="tab-meta">{secondStatusText} {!routeConfirmed && <span className="tab-lock">🔒</span>}</div>
            </button>

            <button className={`tab ${activeTab === 2 ? "active" : ""} ${!routeConfirmed ? "locked" : ""}`} onClick={() => tryOpenTab(2)}>
              <div className="tab-title">3. Asientos</div>
              <div className="tab-meta">{selectedSeat ? `Asiento: ${selectedSeat.id}` : (routeConfirmed ? "Selecciona un asiento" : "Bloqueado")} {!routeConfirmed && <span className="tab-lock">🔒</span>}</div>
            </button>
          </div>
        </section>

        {/* TAB CONTENT */}
        <section className="tab-content" style={{ maxWidth: 1120, margin: "0 auto" }}>
          {/* TAB 0 - CONTROLES */}
          {activeTab === 0 && (
            <div className="card controls-card" style={{ marginBottom: 18 }}>
              <div className="controls-inner">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, gridColumn: "1 / -1" }}>
                  <div>
                    <h3 className="card-title" style={{ margin: 0 }}>Origen & destino</h3>
                    <div className="muted" style={{ marginTop: 6 }}>Completa estos campos para desbloquear los mapas.</div>
                  </div>
                </div>

                <div
                  className="controls-grid-inner"
                  style={{
                    marginTop: 12,
                    gridColumn: "1 / -1",
                    display: "grid",
                    gridTemplateColumns: "1fr 64px 1fr",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  {/* ORIGEN */}
                  <div style={{ gridColumn: "1 / 2", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="form-group">
                      <label htmlFor="origin-country">Origen — País</label>
                      <select 
                        id="origin-country" 
                        className={`form-select ${getInputClass(originCountry)}`}
                        value={originCountry} 
                        onChange={(e) => { 
                          const c = e.target.value; 
                          setOriginCountry(c); 
                          setOriginCity(""); // Resetear ciudad cuando cambia país
                        }}
                      >
                        <option value="">Selecciona un país</option>
                        {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="origin-city">Origen — Ciudad</label>
                      <select 
                        id="origin-city" 
                        className={`form-select ${getInputClass(originCity)}`}
                        value={originCity} 
                        onChange={(e) => setOriginCity(e.target.value)}
                        disabled={!originCountry}
                      >
                        <option value="">Selecciona una ciudad</option>
                        {originCities.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
                      </select>
                    </div>

                    {/* Fecha / Hora de salida */}
                    <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <label htmlFor="departure-date" style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Fecha de salida</label>
                        <input 
                          id="departure-date" 
                          className={`form-input ${getInputClass(departureDate)}`}
                          type="date" 
                          value={departureDate} 
                          onChange={(e) => setDepartureDate(e.target.value)} 
                        />
                      </div>
                      <div style={{ width: 110 }}>
                        <label htmlFor="departure-time" style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Hora</label>
                        <input 
                          id="departure-time" 
                          className={`form-input ${getInputClass(departureTime)}`}
                          type="time" 
                          value={departureTime} 
                          onChange={(e) => setDepartureTime(e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* DIVISOR */}
                  <div style={{ gridColumn: "2 / 3", display: "flex", justifyContent: "center", alignItems: "center" }} aria-hidden>
                    <div style={{
                      width: 46,
                      height: 46,
                      borderRadius: 9999,
                      background: "linear-gradient(180deg,#0ea5a4,#059669)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 20px rgba(2,6,23,0.08)",
                    }} title="Ruta">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="#fff"/>
                      </svg>
                    </div>
                  </div>

                  {/* DESTINO */}
                  <div style={{ gridColumn: "3 / 4", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="form-group">
                      <label htmlFor="dest-country">Destino — País</label>
                      <select 
                        id="dest-country" 
                        className={`form-select ${getInputClass(destCountry)}`}
                        value={destCountry} 
                        onChange={(e) => { 
                          const c = e.target.value; 
                          setDestCountry(c); 
                          setDestCity(""); // Resetear ciudad cuando cambia país
                        }}
                      >
                        <option value="">Selecciona un país</option>
                        {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="dest-city">Destino — Ciudad</label>
                      <select 
                        id="dest-city" 
                        className={`form-select ${getInputClass(destCity)}`}
                        value={destCity} 
                        onChange={(e) => setDestCity(e.target.value)}
                        disabled={!destCountry}
                      >
                        <option value="">Selecciona una ciudad</option>
                        {destCities.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
                      </select>
                    </div>

                    {/* Fecha / Hora de regreso */}
                    <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <label htmlFor="return-date" style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Fecha de regreso</label>
                        <input 
                          id="return-date" 
                          className={`form-input ${getInputClass(returnDate)}`}
                          type="date" 
                          value={returnDate} 
                          onChange={(e) => setReturnDate(e.target.value)} 
                          disabled={!roundTrip} 
                        />
                      </div>
                      <div style={{ width: 110 }}>
                        <label htmlFor="return-time" style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Hora</label>
                        <input 
                          id="return-time" 
                          className={`form-input ${getInputClass(returnTime)}`}
                          type="time" 
                          value={returnTime} 
                          onChange={(e) => setReturnTime(e.target.value)} 
                          disabled={!roundTrip} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checkbox */}
                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <input id="roundTrip" type="checkbox" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
                    <label htmlFor="roundTrip" style={{ margin: 0, fontWeight: 600 }}>Ida y vuelta</label>
                  </div>

                  <div className="form-info" style={{ gridColumn: "1 / -1", marginTop: 6 }}>
                    <div className={`badge ${samePlace ? "badge-warn" : (firstCompleted ? "badge-ok" : "badge-warn")}`}>
                      {samePlace ? "Origen = Destino" : (firstCompleted ? "Todo listo" : "Faltan campos requeridos")}
                    </div>
                  </div>
                </div>

                {/* BOTONES */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, gridColumn: "1 / -1" }}>
                  <button className="btn-secondary" onClick={() => {
                    setOriginCountry("");
                    setOriginCity("");
                    setDestCountry("");
                    setDestCity("");
                    setRoundTrip(false);
                    setDepartureDate("");
                    setDepartureTime("");
                    setReturnDate("");
                    setReturnTime("");
                  }}>Limpiar todo</button>

                  <button
                    className="btn-cta"
                    disabled={!firstCompleted}
                    onClick={() => {
                      setRouteConfirmed(true);
                      setActiveTab(1);
                    }}
                  >
                    Confirmar ruta →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1 - MAPAS */}
          {activeTab === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 18 }}>
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
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, gap: 8 }}>
                <button className="btn-secondary" onClick={() => setActiveTab(0)}>Volver</button>
                <button
                  className="btn-cta"
                  onClick={() => {
                    setRouteConfirmed(true);
                    setActiveTab(2);
                  }}
                >
                  Confirmar y desbloquear asientos →
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
                <SeatSelector onSelect={(s) => setSelectedSeat(s)} />
              </div>

              {/* BOTONES ASIENTOS */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button className="btn-secondary" onClick={() => setActiveTab(1)}>Volver a mapas</button>
                <button className="btn-cta" disabled={!selectedSeat} onClick={() => alert(`Has reservado (demo) el asiento ${selectedSeat.id}`)}>
                  Continuar →
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer" style={{ marginTop: 18, textAlign: "center" }}>
        <div>© {new Date().getFullYear()} F4U Flights — Demo</div>
        <div className="muted">Diseño y demo — interfaz frontend</div>
      </footer>
    </div>
  );
}