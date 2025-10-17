import React, { useMemo, useState, useEffect, useRef } from "react";

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
      seats.push({ id: makeSeatId(r, letter), row: r, letter, class: "business", occupied: Math.random() < 0.05 });
    });
  }
  for (let r = ECONOMY_ROWS.from; r <= ECONOMY_ROWS.to; r++) {
    ECONOMY_BLOCKS.flat().forEach((letter) => {
      seats.push({ id: makeSeatId(r, letter), row: r, letter, class: "economy", occupied: Math.random() < 0.12 });
    });
  }
  return seats;
}

export default function SeatSelector({ onSelect }) {
  const [seats] = useState(() => generateInitialSeats());
  const [selected, setSelected] = useState(null);
  const containerRef = useRef(null);

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
    if (seat.occupied) return;
    const newSel = selected && selected.id === seat.id ? null : seat;
    setSelected(newSel);
    if (onSelect) onSelect(newSel);
  }

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    // centra la vista en la mitad
    const mid = Math.floor(rows.length / 2);
    const col = node.querySelectorAll(".row-column")[mid];
    if (col) {
      const left = col.offsetLeft - 40;
      node.scrollTo({ left, behavior: "smooth" });
    }
  }, [rows]);

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
                        const cls =
                          seat.occupied
                            ? "seat seat-occupied"
                            : selected && selected.id === seat.id
                            ? "seat seat-selected"
                            : "seat seat-available";
                        return (
                          <button
                            key={seat.id}
                            className={cls}
                            title={`${seat.id} — ${seat.class}`}
                            onClick={() => handleSeatClick(seat)}
                            aria-pressed={selected && selected.id === seat.id}
                            aria-label={`Asiento ${seat.id} ${seat.occupied ? "ocupado" : "disponible"}`}
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
        <div><span className="legend-box occupied" /> Ocupado</div>
      </div>
    </div>
  );
}
