import React, { useMemo, useState, useEffect, useRef } from "react";
import { Client as StompClient } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs.min.js";
import { seatAPI, seatLockAPI } from "../services/api";

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

export default function SeatSelector({ onSelect, flightId, onSeatLocked }) {
  const [seats, setSeats] = useState(generateInitialSeats());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Para distinguir carga inicial
  const [lockingInProgress, setLockingInProgress] = useState(false); // Para evitar clicks múltiples
  const containerRef = useRef(null);
  const scrollPositionRef = useRef(0); // Guardar posición del scroll
  const hasInitiallyScrolled = useRef(false); // Para saber si ya hizo scroll inicial
  const currentLockedSeatRef = useRef(null); // Referencia al asiento actualmente bloqueado por este usuario
  const stompRef = useRef(null);

  // Asegurar que siempre haya un userId en sessionStorage
  useEffect(() => {
    if (!sessionStorage.getItem('userSessionId')) {
      const userId = 'user-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('userSessionId', userId);
      console.log('🆔 UserSessionId generado:', userId);
    }
  }, []);

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
        const currentUserId = sessionStorage.getItem('userSessionId');
        
        const updatedSeats = initialSeats.map(seat => {
          // Buscar si este asiento existe en la API (usando numeroAsiento)
          const apiSeat = apiSeats.find(s => s.numeroAsiento === seat.id);
          if (apiSeat) {
            return {
              ...seat,
              occupied: !apiSeat.disponible, // disponible=false significa ocupado
              locked: apiSeat.locked || false, // Si está bloqueado
              remainingLockSeconds: apiSeat.remainingLockSeconds || 0,
              lockedByUserId: apiSeat.lockedByUserId || null, // Usuario que bloqueó
              dbId: apiSeat.id, // Guardar el ID de la base de datos
              precio: apiSeat.precio,
              clase: apiSeat.clase
            };
          }
          return seat;
        });

        setSeats(updatedSeats);

        // Sincronizar selección y lock con el backend para mantener el asiento azul en mi sesión
        const myLockedSeat = currentUserId
          ? updatedSeats.find(s => s.locked === true && s.lockedByUserId === currentUserId)
          : null;

        if (myLockedSeat) {
          // Actualizar referencia y selección locales
          const needUpdateSelected = !selected || selected.id !== myLockedSeat.id;
          currentLockedSeatRef.current = myLockedSeat.dbId;
          if (needUpdateSelected) {
            setSelected(myLockedSeat);
            console.log(`🔵 Asiento ${myLockedSeat.id} restaurado como seleccionado (bloqueado por ti)`, {
              currentUserId,
              lockedByUserId: myLockedSeat.lockedByUserId,
              locked: myLockedSeat.locked
            });
            if (onSelect) onSelect(myLockedSeat);
          }
          // Asegurar que el padre conozca el lock vigente
          if (onSeatLocked) onSeatLocked(myLockedSeat.dbId);
        } else {
          // No hay lock vigente para mí: limpiar selección/refs (evita errores al confirmar)
          if (currentLockedSeatRef.current || selected) {
            console.log('ℹ️ No hay asiento bloqueado por esta sesión. Limpiando selección actual.');
            currentLockedSeatRef.current = null;
            if (selected) setSelected(null);
            if (onSelect) onSelect(null);
            if (onSeatLocked) onSeatLocked(null);
          }
        }
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
    
    // Recargar asientos cada 2 segundos para actualizar bloqueos en tiempo real (sin mostrar loading)
    const interval = setInterval(() => loadSeats(false), 2000);

    // Conectar WebSocket (STOMP over SockJS) para actualizaciones en tiempo real
    try {
      const socketUrl = (import.meta?.env?.VITE_API_URL || window.location.origin.replace(/:\\d+$/, ':8080')) + "/ws-notifications";
      const socket = new SockJS(socketUrl);
      const client = new StompClient({
        webSocketFactory: () => socket,
        reconnectDelay: 3000,
        onConnect: () => {
          // Suscribirse al tópico de bloqueos
          client.subscribe('/topic/seat-locks', (msg) => {
            try {
              const payload = JSON.parse(msg.body);
              const { seatId, type, lockedByUserId, remainingSeconds } = payload;

              // Solo actualizar asientos del vuelo activo (usamos dbId para match)
              setSeats(prev => prev.map(s => {
                if (s.dbId !== seatId) return s;
                if (type === 'locked' || type === 'renewed') {
                  return { ...s, locked: true, lockedByUserId: lockedByUserId || s.lockedByUserId, remainingLockSeconds: remainingSeconds || s.remainingLockSeconds };
                }
                if (type === 'unlocked' || type === 'expired') {
                  return { ...s, locked: false, lockedByUserId: null, remainingLockSeconds: 0 };
                }
                return s;
              }));

              // Mantener asiento seleccionado azul en mi sesión
              const myUser = sessionStorage.getItem('userSessionId');
              if ((type === 'locked' || type === 'renewed') && lockedByUserId === myUser) {
                // Si es mi lock, asegurar selección
                setSelected(prevSel => {
                  // Encontrar el seat actualizado en el estado actual
                  const seat = (seats.find(ss => ss.dbId === seatId) || prevSel);
                  if (seat && (!prevSel || prevSel.id !== seat.id)) {
                    if (onSelect) onSelect(seat);
                    if (onSeatLocked) onSeatLocked(seatId);
                    currentLockedSeatRef.current = seatId;
                    return seat;
                  }
                  return prevSel;
                });
              }

              if ((type === 'unlocked' || type === 'expired') && currentLockedSeatRef.current === seatId) {
                // Si liberaron mi lock (poco probable desde otro tab), limpiar selección
                currentLockedSeatRef.current = null;
                setSelected(null);
                if (onSelect) onSelect(null);
                if (onSeatLocked) onSeatLocked(null);
              }
            } catch (e) {
              console.error('Error procesando mensaje de websocket:', e);
            }
          });
        },
        onStompError: (frame) => console.error('STOMP error', frame.headers['message']),
        onWebSocketError: (e) => console.error('WebSocket error', e),
      });
      client.activate();
      stompRef.current = client;
    } catch (e) {
      console.warn('No se pudo activar WebSocket, continuará con polling:', e.message);
    }

    return () => clearInterval(interval);
  }, [flightId]);

  // Efecto de limpieza: solo desconectar WebSocket al desmontar
  useEffect(() => {
    return () => {
      if (stompRef.current) {
        try { stompRef.current.deactivate(); } catch {}
      }
      // NO liberamos el asiento aquí - debe permanecer bloqueado por 15 minutos
      // o hasta que se complete el pago o expire el tiempo en el backend
      console.log('ℹ️ SeatSelector desmontado - asiento permanece bloqueado');
    };
  }, []);

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

  async function handleSeatClick(seat) {
    // Obtener el userId actual
    const currentUserId = sessionStorage.getItem('userSessionId');
    
    // Verificar si este asiento está bloqueado por otro usuario
    const isLockedByOther = seat.locked && 
                            seat.remainingLockSeconds > 0 && 
                            seat.lockedByUserId !== currentUserId;
    
    // No permitir seleccionar asientos ocupados o bloqueados por OTROS
    if (seat.occupied || isLockedByOther) return;
    
    // Evitar clicks múltiples mientras se procesa un bloqueo
    if (lockingInProgress) return;
    
    // Si se clickea el mismo asiento ya seleccionado, deseleccionar y desbloquear
    if (selected && selected.id === seat.id) {
      setLockingInProgress(true);
      setSelected(null);
      if (onSelect) onSelect(null);
      
      // Desbloquear en background
      if (currentLockedSeatRef.current) {
        seatLockAPI.releaseLock(currentLockedSeatRef.current)
          .then(() => {
            console.log(`🔓 Asiento ${seat.id} desbloqueado`);
            currentLockedSeatRef.current = null;
            if (onSeatLocked) {
              onSeatLocked(null);
            }
          })
          .catch((error) => {
            console.error('Error al desbloquear asiento:', error);
          })
          .finally(() => {
            setLockingInProgress(false);
          });
      } else {
        setLockingInProgress(false);
      }
      return;
    }
    
    // Si hay un asiento diferente seleccionado, desbloquearlo primero
    setLockingInProgress(true);
    const previousLockedSeat = currentLockedSeatRef.current;
    const previousSelected = selected;
    
    if (previousLockedSeat && previousSelected) {
      // Desbloquear en background sin esperar
      seatLockAPI.releaseLock(previousLockedSeat)
        .then(() => {
          console.log(`🔓 Asiento anterior ${previousSelected.id} desbloqueado`);
        })
        .catch((error) => {
          console.error('Error al desbloquear asiento anterior:', error);
        });
    }
    
    // Seleccionar el nuevo asiento inmediatamente
    setSelected(seat);
    if (onSelect) onSelect(seat);
    
    // Intentar bloquear el nuevo asiento
    if (seat.dbId) {
      const userId = sessionStorage.getItem('userSessionId') || 
                    'user-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('userSessionId', userId);
      
      seatLockAPI.lockSeat(seat.dbId, userId)
        .then((response) => {
          if (response.data.success) {
            console.log(`🔒 Asiento ${seat.id} bloqueado por 15 minutos`);
            currentLockedSeatRef.current = seat.dbId;
            // Notificar al componente padre
            if (onSeatLocked) {
              onSeatLocked(seat.dbId);
            }
          } else {
            // Si falla el bloqueo, revertir la selección
            console.error('❌ Asiento ya bloqueado por otro usuario');
            setSelected(previousSelected);
            if (onSelect) onSelect(previousSelected);
            alert('Este asiento está siendo seleccionado por otro usuario. Por favor elige otro asiento.');
          }
        })
        .catch((error) => {
          console.error('Error al bloquear asiento:', error);
          setSelected(previousSelected);
          if (onSelect) onSelect(previousSelected);
          alert('No se pudo bloquear el asiento. Por favor intenta de nuevo.');
        })
        .finally(() => {
          setLockingInProgress(false);
        });
    } else {
      setLockingInProgress(false);
    }
  }

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    
    // Solo hacer scroll inicial a la izquierda (inicio) la primera vez
    if (!hasInitiallyScrolled.current && rows.length > 0) {
      // Iniciar desde la izquierda (posición 0)
      node.scrollTo({ left: 0, behavior: "smooth" });
      hasInitiallyScrolled.current = true;
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
                        // Obtener el userId de la sesión actual
                        const currentUserId = sessionStorage.getItem('userSessionId');
                        
                        // Determinar si el asiento está bloqueado
                        const isLocked = seat.locked && seat.remainingLockSeconds > 0;
                        
                        // Determinar si el bloqueo es de este usuario
                        const isLockedByMe = isLocked && seat.lockedByUserId === currentUserId;
                        
                        // Determinar si está seleccionado localmente
                        const isSelected = selected && selected.id === seat.id;
                        
                        // Lógica de estilos:
                        // 1. Ocupado (rojo) - tiene prioridad máxima
                        // 2. Bloqueado por otro usuario (amarillo)
                        // 3. Seleccionado/Bloqueado por mí (azul)
                        // 4. Disponible (verde)
                        const cls =
                          seat.occupied
                            ? "seat seat-occupied"
                            : isLocked && !isLockedByMe
                            ? "seat seat-locked"  // Amarillo - bloqueado por otro
                            : isSelected || isLockedByMe
                            ? "seat seat-selected"  // Azul - seleccionado por mí
                            : "seat seat-available";  // Verde - disponible
                            
                        const getTitle = () => {
                          if (seat.occupied) return `${seat.id} — Ocupado`;
                          if (isLocked && !isLockedByMe) {
                            const mins = Math.floor(seat.remainingLockSeconds / 60);
                            const secs = seat.remainingLockSeconds % 60;
                            return `${seat.id} — Bloqueado por otro usuario (${mins}m ${secs}s restantes)`;
                          }
                          if (isSelected || isLockedByMe) {
                            return `${seat.id} — Tu selección - Click para deseleccionar`;
                          }
                          return `${seat.id} — ${seat.class}`;
                        };
                        
                        return (
                          <button
                            key={seat.id}
                            className={cls}
                            title={getTitle()}
                            onClick={() => handleSeatClick(seat)}
                            aria-pressed={isSelected || isLockedByMe}
                            aria-label={`Asiento ${seat.id} ${seat.occupied ? "ocupado" : isLocked ? "bloqueado" : "disponible"}`}
                            disabled={seat.occupied || (isLocked && !isLockedByMe)}
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
