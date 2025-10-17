// FlightGlobe.jsx
import React, { useEffect, useRef } from "react";
import Globe from "globe.gl";

/** Utils */
const lerpCoords = (a, b, t) => [ a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t ];

/**
 * buildArcFast: construye N puntos interpolados entre origin y destination.
 * NOTA: devuelve un array de [lng, lat] (como en tu original).
 */
const buildArcFast = (origin, destination, steps = 200) => {
  const arc = new Array(steps + 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    arc[i] = lerpCoords(origin, destination, t); // [lng, lat]
  }
  return arc;
};

const FlightGlobe = ({
  origin = [-80.1918, 25.7617],
  destination = [-74.0721, 4.711],
  steps = 240,
  drawSpeed = 6,
  planeSpeed = 1.2,
  height = "var(--map-height)",
  arcWidth = 1.5,
}) => {
  const globeRef = useRef(null);
  const globeInstance = useRef(null);
  const animRef = useRef(null);
  const resizeObs = useRef(null);

  useEffect(() => {
    if (!origin || !destination || !globeRef.current) return;

    // destruir instancia anterior (si existe)
    if (globeInstance.current) {
      try { globeInstance.current._destructor(); } catch (e) {}
      globeInstance.current = null;
    }

    // crear nueva instancia
    const g = Globe()(globeRef.current)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .arcDashLength(0.4)
      .arcDashGap(2)
      .arcDashAnimateTime(4000)
      // altitude será función de t -> curva más natural (pico en el medio)
      .arcAltitude(({ t = 0.5 } = {}) => 0.30) // default, pero controlaremos altitude por objeto si queremos
      .arcStroke(arcWidth)
      // color inicial suave (evita flash de color)
      .arcColor(() => ["#38bdf8", "#1e3a8a"]);
    globeInstance.current = g;

    // reducir pixel ratio para pantallas retina si es necesario
    try {
      const renderer = g.renderer();
      renderer.setPixelRatio(1);
    } catch (e) {}

    // controls auto rotate
    const controls = g.controls?.();
    if (controls) { controls.autoRotate = true; controls.autoRotateSpeed = 0.5; }

    // forzar que canvas esté dentro del contenedor con estilos correctos
    const renderer = g.renderer();
    const canvas = renderer && renderer.domElement;
    if (canvas && globeRef.current && canvas.parentElement !== globeRef.current) {
      Object.assign(canvas.style, { position: "absolute", top:0, left:0, width:"100%", height:"100%", display:"block" });
      globeRef.current.appendChild(canvas);
    }

    // resize helper
    const resize = () => {
      const w = globeRef.current?.clientWidth || 300;
      const h = globeRef.current?.clientHeight || 300;
      try {
        renderer.setSize(w, h, false);
        renderer.setPixelRatio(1);
      } catch (e) {}
    };
    resize();
    if (typeof ResizeObserver !== "undefined") {
      resizeObs.current = new ResizeObserver(resize);
      resizeObs.current.observe(globeRef.current);
    } else {
      window.addEventListener("resize", resize);
    }

    // --- Preparar arco (puntos interpolados) ---
    const arcCoords = buildArcFast(origin, destination, steps); // [[lng, lat], ...]
    // --- Crear "segmentos" entre pares consecutivos para evitar arcos degenerados ---
    // cada segment será { startLat, startLng, endLat, endLng, t } donde t ~ posición relativa (0..1)
    const segments = [];
    for (let i = 1; i < arcCoords.length; i++) {
      const [prevLng, prevLat] = arcCoords[i - 1];
      const [lng, lat] = arcCoords[i];
      const t = i / (arcCoords.length - 1); // posición relativa en la curva
      // altitude más alta en el medio => función (ej. sin(pi * t))
      const altitude = Math.sin(Math.PI * t) * 0.35; // ajusta 0.35 como máximo
      segments.push({
        startLat: prevLat,
        startLng: prevLng,
        endLat: lat,
        endLng: lng,
        altitude, // campo arbitrario para usar si quieres .arcAltitude(d => d.altitude)
        t,
      });
    }

    // Ajustar arcAltitude para usar valor precomputado si está presente
    g.arcAltitude((d) => d.altitude ?? 0.30);

    // Animación: iremos "mostrando" segmentos sucesivos (no puntos sueltos).
    let drawIndex = 0;
    let planeIndex = 0;
    let isDrawing = true;

    const drawStep = () => {
      if (!globeInstance.current) return;

      const upto = Math.min(drawIndex + drawSpeed, segments.length);
      // slice de segmentos (cada elemento es un segmento válido prev->cur)
      globeInstance.current.arcsData(segments.slice(0, upto));
      drawIndex = upto;

      if (drawIndex >= segments.length) {
        // dibujo completo -> iniciar animación del avión
        isDrawing = false;
        // arrancar plane (no cancelamos aquí, solo lanzamos)
        animRef.current = requestAnimationFrame(runPlane);
        return;
      }

      animRef.current = requestAnimationFrame(drawStep);
    };

    const runPlane = () => {
      if (!globeInstance.current) return;

      // planeIndex avanza sobre "puntos" (no segmentos) para posicionar avión suavemente
      if (planeIndex >= arcCoords.length - 1) {
        // al llegar al final, colocar el avión en destino y detener animación
        globeInstance.current.arcsData([{
          startLat: origin[1], startLng: origin[0],
          endLat: arcCoords[arcCoords.length - 1][1],
          endLng: arcCoords[arcCoords.length - 1][0],
        }]);
        return;
      }

      // posición intermedia entre puntos i y i+1
      const idx = Math.floor(planeIndex);
      const frac = planeIndex - idx;
      const [lngA, latA] = arcCoords[idx];
      const [lngB, latB] = arcCoords[Math.min(idx + 1, arcCoords.length - 1)];
      const posLng = lngA + (lngB - lngA) * frac;
      const posLat = latA + (latB - latA) * frac;

      // mostrar un solo arco desde origen a la posición actual del avión (efecto "avance")
      globeInstance.current.arcsData([{
        startLat: origin[1], startLng: origin[0],
        endLat: posLat, endLng: posLng,
        altitude: Math.sin(Math.PI * (planeIndex / (arcCoords.length - 1))) * 0.35
      }]);

      planeIndex += planeSpeed;
      animRef.current = requestAnimationFrame(runPlane);
    };

    // iniciar dibujo
    animRef.current = requestAnimationFrame(drawStep);

    // cleanup
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (resizeObs.current) {
        try { resizeObs.current.disconnect(); } catch(e) {}
        resizeObs.current = null;
      } else {
        window.removeEventListener("resize", resize);
      }
      try { if (globeInstance.current) globeInstance.current._destructor(); } catch(e) {}
      globeInstance.current = null;
    };
  }, [origin, destination, steps, drawSpeed, planeSpeed, arcWidth, height]);

  return (
    <div
      ref={globeRef}
      className="globe-container"
      style={{ width: "100%", height, borderRadius: "15px", overflow: "hidden" }}
    />
  );
};

export default FlightGlobe;
