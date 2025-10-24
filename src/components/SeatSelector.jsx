import React, { useMemo, useState, useEffect, useRef } from "react";
import { seatAPI } from "../services/api";

const BUSINESS_ROWS = { from: 1, to: 6 };
const ECONOMY_ROWS = { from: 7, to: 30 };
const BUSINESS_BLOCKS = [["A", "B"], ["C", "D"], ["E", "F"]];
const ECONOMY_BLOCKS = [["A", "B", "C"], ["D", "E", "F"], ["G", "H", "J"]];

function makeSeatId(row, letter) {
  return `${row}${letter}`;
}

function generateInitialSeats() {
  const seats = [];
  for (let r = BUSINESS_ROWS.from; r <= BUSINESS_ROWS.to; r++) {
    BUSINESS_BLOCKS.flat().forEach((letter) => {
      seats.push({ id: makeSeatId(r, letter), row: r, letter, class: "business", occupied: false, locked: false });
    });
  }
  for (let r = ECONOMY_ROWS.from; r <= ECONOMY_ROWS.to; r++) {
    ECONOMY_BLOCKS.flat().forEach((letter) => {
      seats.push({ id: makeSeatId(r, letter), row: r, letter, class: "economy", occupied: false, locked: false });
    });
  }
  return seats;
}

export default function SeatSelector({ onSelect, flightId, onLockSeat }) {
  const [seats, setSeats] = useState(generateInitialSeats());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Para distinguir carga inicial
  const containerRef = useRef(null);
  const scrollPositionRef = useRef(0); // Guardar posición del scroll
  const hasInitiallyScrolled = useRef(false); // Para saber si ya hizo scroll inicial

  // Cargar asientos desde la API cuando hay un flightId
  useEffect(() => {
    if (!flightId) return;

    const loadSeats = async (isFirstLoad = false) => {
      // Guardar la posición actual del scroll antes de recargar
      if (containerRef.current) {
        scrollPositionRef.current = containerRef.current.scrollLeft;
      }

      try {
        // Solo mostrar loading en la carga inicial
        if (isFirstLoad) {
          setLoading(true);
        }
        const response = await seatAPI.getSeatsByFlight(flightId);
        const apiSeats = response.data;

        // Combinar asientos de la API con la estructura del frontend
        const initialSeats = generateInitialSeats();
        const updatedSeats = initialSeats.map(seat => {
          // Buscar si este asiento existe en la API (usando numeroAsiento)
          const apiSeat = apiSeats.find(s => s.numeroAsiento === seat.id);
          if (apiSeat) {
            return {
              ...seat,
              occupied: !apiSeat.disponible, // disponible=false significa ocupado
              locked: apiSeat.locked || false, // Si está bloqueado
              remainingLockSeconds: apiSeat.remainingLockSeconds || 0,
              dbId: apiSeat.id, // Guardar el ID de la base de datos
              precio: apiSeat.precio,
              clase: apiSeat.clase
            };
          }
          return seat;
        });

        setSeats(updatedSeats);
      } catch (error) {
        console.error('Error al cargar asientos:', error);
        // Si hay error, usar asientos iniciales
      } finally {
        if (isFirstLoad) {
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    // Carga inicial
    loadSeats(true);
    
    // Recargar asientos cada 10 segundos para actualizar bloqueos (sin mostrar loading)
    const interval = setInterval(() => loadSeats(false), 10000);
    return () => clearInterval(interval);
  }, [flightId]);

  const rows = useMemo(() => {
    const set = new Set(seats.map((s) => s.row));
    return Array.from(set).sort((a, b) => a - b);
  }, [seats]);

  const seatsByRow = useMemo(() => {
    const map = new Map();
    seats.forEach((s) => {
      if (!map.has(s.row)) map.set(s.row, []);
      map.get(s.row).push(s);
    });
    rows.forEach((r) => {
      const blocks = r <= BUSINESS_ROWS.to ? BUSINESS_BLOCKS : ECONOMY_BLOCKS;
      const order = blocks.flat();
      const arr = map.get(r) || [];
      arr.sort((a, b) => order.indexOf(a.letter) - order.indexOf(b.letter));
      map.set(r, arr);
    });
    return map;
  }, [seats, rows]);

  function handleSeatClick(seat) {
    // No permitir seleccionar asientos ocupados o bloqueados por otros
    if (seat.occupied || (seat.locked && seat.remainingLockSeconds > 0)) return;
    
    // Si ya hay un asiento seleccionado y es diferente, deseleccionar
    if (selected && selected.id !== seat.id) {
      setSelected(null);
    }
    
    const newSel = selected && selected.id === seat.id ? null : seat;
    setSelected(newSel);
    
    // Solo notificar al componente padre, sin bloquear
    if (onSelect) onSelect(newSel);
  }

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    
    // Solo hacer scroll inicial al centro la primera vez
    if (!hasInitiallyScrolled.current && rows.length > 0) {
      const mid = Math.floor(rows.length / 2);
      const col = node.querySelectorAll(".row-column")[mid];
      if (col) {
        const left = col.offsetLeft - 40;
        node.scrollTo({ left, behavior: "smooth" });
        hasInitiallyScrolled.current = true;
      }
    } 
    // En recargas, restaurar la posición anterior
    else if (hasInitiallyScrolled.current && scrollPositionRef.current !== undefined) {
      node.scrollLeft = scrollPositionRef.current;
    }
  }, [rows, seats]); // Agregamos 'seats' para que se ejecute después de cada recarga

  if (loading) {
    return (
      <div className="seat-selector-root horizontal">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p>Cargando asientos disponibles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seat-selector-root horizontal">
      <div className="seat-cabin horizontal" ref={containerRef} role="list" aria-label="Mapa de asientos">
        {rows.map((r) => {
          const blocks = r <= BUSINESS_ROWS.to ? BUSINESS_BLOCKS : ECONOMY_BLOCKS;
          const seatsThis = seatsByRow.get(r) || [];
          return (
            <div className="row-column" key={`row-${r}`} role="listitem" data-row={r}>
              <div className="row-inner">
                {/* BLOQUES a la IZQUIERDA: bloques apilados verticalmente.
                    Cada bloque renderiza sus asientos en fila (left->right). */}
                <div className="blocks-left">
                  {blocks.map((block, bi) => (
                    <div className={`seat-block-horizontal block-${bi}`} key={`blk-${r}-${bi}`}>
                      {block.map((letter) => {
                        const seat = seatsThis.find((s) => s.letter === letter);
                        if (!seat) return <div className="seat-empty" key={`${r}-${letter}`} />;
                        
                        // Determinar estado del asiento
                        const isLocked = seat.locked && seat.remainingLockSeconds > 0;
                        const cls =
                          seat.occupied
                            ? "seat seat-occupied"
                            : isLocked
                            ? "seat seat-locked"
                            : selected && selected.id === seat.id
                            ? "seat seat-selected"
                            : "seat seat-available";
                            
                        const getTitle = () => {
                          if (seat.occupied) return `${seat.id} — Ocupado`;
                          if (isLocked) {
                            const mins = Math.floor(seat.remainingLockSeconds / 60);
                            const secs = seat.remainingLockSeconds % 60;
                            return `${seat.id} — Bloqueado (${mins}m ${secs}s restantes)`;
                          }
                          return `${seat.id} — ${seat.class}`;
                        };
                        
                        return (
                          <button
                            key={seat.id}
                            className={cls}
                            title={getTitle()}
                            onClick={() => handleSeatClick(seat)}
                            aria-pressed={selected && selected.id === seat.id}
                            aria-label={`Asiento ${seat.id} ${seat.occupied ? "ocupado" : isLocked ? "bloqueado" : "disponible"}`}
                            disabled={seat.occupied || isLocked}
                          >
                            <div className="seat-letter">{seat.letter}</div>
                            <div className="seat-row-small">{seat.row}</div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* NUMERO DE FILA a la derecha */}
                <div className="row-number-col" aria-hidden>
                  {r}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="seat-legend" aria-hidden>
        <div><span className="legend-box available" /> Disponible</div>
        <div><span className="legend-box selected" /> Seleccionado</div>
        <div><span className="legend-box locked" /> Bloqueado (15 min)</div>
        <div><span className="legend-box occupied" /> Ocupado</div>
      </div>
    </div>
  );
}
