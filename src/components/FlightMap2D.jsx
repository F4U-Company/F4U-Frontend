import React, { useEffect, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";

// Memoizar el cálculo del arco
const useFlightArc = (origin, destination, steps) => {
  return useMemo(() => {
    if (!origin || !destination) return [];
    
    try {
      const baseLine = turf.lineString([origin, destination]);
      const length = turf.length(baseLine, { units: "kilometers" });
      const arc = new Array(steps + 1);
      
      for (let i = 0; i <= steps; i++) {
        const pt = turf.along(baseLine, (i / steps) * length, { units: "kilometers" });
        arc[i] = pt.geometry.coordinates;
      }
      
      return arc.map(([lng, lat]) => [lat, lng]);
    } catch (error) {
      console.warn('Error calculating flight arc:', error);
      return [];
    }
  }, [origin, destination, steps]);
};

// Hook para calcular bearing entre puntos
const useBearingCalculator = () => {
  return useCallback((pointA, pointB) => {
    try {
      // turf.bearing espera [lng, lat] y devuelve grados desde el norte (0° = norte, 90° = este)
      return turf.bearing(
        [pointA[1], pointA[0]], // Convertir [lat, lng] a [lng, lat]
        [pointB[1], pointB[0]]
      );
    } catch (error) {
      console.warn('Error calculating bearing:', error);
      return 0;
    }
  }, []);
};

// Memoizar el icono del avión con tu imagen PLANE2.svg
const usePlaneIcon = () => {
  return useMemo(() => {
    // Usar tu archivo PLANE2.svg desde la carpeta public
    return L.divIcon({
      className: "plane-icon-wrapper",
      html: `
        <div class="plane-icon" style="
          transform-origin: center center;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <img 
            src="/models/PLANE2.svg" 
            style="
              width: 100%;
              height: 100%;
              display: block;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            " 
            alt="Avión"
          />
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }, []);
};

// Función para aplicar rotación al marcador
const applyRotationToMarker = (marker, bearing) => {
  try {
    const el = marker.getElement();
    if (el) {
      const planeDiv = el.querySelector(".plane-icon");
      if (planeDiv) {
        // Ajustar la rotación para que la nariz del avión apunte en la dirección correcta
        // El bearing de turf es 0°=Norte, 90°=Este, 180°=Sur, 270°=Oeste
        // Si tu icono PLANE2.svg tiene la nariz hacia arriba (Norte), entonces está correcto
        planeDiv.style.transform = `rotate(${bearing}deg)`;
      }
    }
  } catch (e) {
    console.warn('Error applying rotation to marker:', e);
  }
};

export default function FlightMap2D({
  origin = [-80.1918, 25.7617],
  destination = [-74.0721, 4.711],
  steps = 200,
  drawSpeed = 4,
  planeSpeed = 1.6,
  height = "var(--map-height)",
  strokeColor = "#ff1a1a",
  strokeWidth = 4,
  zoomPadding = 0.15,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const planeMarkerRef = useRef(null);
  const rafRef = useRef(null);
  const animationRef = useRef({ 
    drawIndex: 0, 
    planeIndex: 0, 
    isDrawing: true,
    lastBearing: 0 // Guardar el último bearing calculado
  });

  // Memoizar cálculos
  const arcLatLng = useFlightArc(origin, destination, steps);
  const planeIcon = usePlaneIcon();
  const calculateBearing = useBearingCalculator();
  
  const originLatLng = useMemo(() => [origin[1], origin[0]], [origin]);
  const bounds = useMemo(() => {
    try {
      return L.latLngBounds([originLatLng, [destination[1], destination[0]]]);
    } catch (e) {
      return null;
    }
  }, [originLatLng, destination]);

  // Configuración inicial del mapa (solo una vez)
  const initializeMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      attributionControl: false,
      zoomControl: true,
      preferCanvas: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      detectRetina: true,
    }).addTo(map);

    // Polyline inicial vacía
    const polyline = L.polyline([], {
      color: strokeColor,
      weight: strokeWidth,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    polylineRef.current = polyline;

    // Marcador del avión
    const marker = L.marker(originLatLng, { 
      icon: planeIcon, 
      interactive: false 
    }).addTo(map);
    planeMarkerRef.current = marker;

    return map;
  }, [strokeColor, strokeWidth, planeIcon, originLatLng]);

  // Animación optimizada con rotación correcta
  const startAnimation = useCallback((map) => {
    if (!map || !arcLatLng.length) return;

    // Limpiar animación anterior
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Resetear estado de animación
    animationRef.current = { 
      drawIndex: 0, 
      planeIndex: 0, 
      isDrawing: true,
      lastBearing: 0
    };
    polylineRef.current.setLatLngs([]);

    const animate = () => {
      const state = animationRef.current;
      
      if (state.isDrawing) {
        // Fase de dibujo de la ruta
        const nextIndex = Math.min(state.drawIndex + drawSpeed, arcLatLng.length);
        polylineRef.current.setLatLngs(arcLatLng.slice(0, nextIndex));
        state.drawIndex = nextIndex;
        
        if (state.drawIndex >= arcLatLng.length - 1) {
          state.isDrawing = false;
          polylineRef.current.setLatLngs(arcLatLng);
        }
      } else {
        // Fase de movimiento del avión
        if (state.planeIndex < arcLatLng.length - 1) {
          const currentIdx = Math.floor(state.planeIndex);
          const nextIdx = Math.min(currentIdx + 1, arcLatLng.length - 1);
          
          const currentPoint = arcLatLng[currentIdx];
          const nextPoint = arcLatLng[nextIdx];

          // Mover el avión a la posición actual
          planeMarkerRef.current.setLatLng(currentPoint);

          // Calcular y aplicar la rotación SOLO si tenemos un punto siguiente válido
          if (nextIdx > currentIdx) {
            const bearing = calculateBearing(currentPoint, nextPoint);
            state.lastBearing = bearing; // Guardar el bearing actual
            applyRotationToMarker(planeMarkerRef.current, bearing);
          }

          state.planeIndex += planeSpeed;
        } else {
          // Llegó al destino - mantener última posición y rotación
          const finalPoint = arcLatLng[arcLatLng.length - 1];
          planeMarkerRef.current.setLatLng(finalPoint);
          applyRotationToMarker(planeMarkerRef.current, state.lastBearing);
          return; // Detener animación
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    // Iniciar animación con pequeño delay
    setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, 100);
  }, [arcLatLng, drawSpeed, planeSpeed, calculateBearing]);

  useEffect(() => {
    const map = initializeMap();
    if (!map) return;

    // Ajustar vista del mapa
    if (bounds) {
      map.fitBounds(bounds.pad(zoomPadding));
    } else {
      map.setView([
        (origin[1] + destination[1]) / 2,
        (origin[0] + destination[0]) / 2
      ], 3);
    }

    // Iniciar animación con pequeño delay
    const animationTimer = setTimeout(() => {
      startAnimation(map);
    }, 300);

    // Observer para resize
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      clearTimeout(animationTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [initializeMap, bounds, zoomPadding, origin, destination, startAnimation]);

  // Efecto separado para actualizaciones de ruta
  useEffect(() => {
    if (!mapRef.current || !bounds || !arcLatLng.length) return;

    // Actualizar bounds
    mapRef.current.fitBounds(bounds.pad(zoomPadding));
    
    // Reiniciar animación con la nueva ruta
    setTimeout(() => {
      startAnimation(mapRef.current);
    }, 100);
  }, [arcLatLng, bounds, zoomPadding, startAnimation]);

  return (
    <div
      className="map2d-container"
      style={{
        width: "100%",
        height,
        background: "#ffffff",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 6px 18px rgba(2,6,23,0.04)",
      }}
    >
      <div 
        ref={containerRef} 
        style={{ 
          width: "100%", 
          height: "100%",
          opacity: arcLatLng.length ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }} 
      />
    </div>
  );
}