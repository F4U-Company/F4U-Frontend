import React, { useEffect, useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

function App() {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [seats, setSeats] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`${API}/api/flights`)
      .then(r => r.json())
      .then(setFlights)
      .catch(e => console.error(e));
  }, []);

  function loadSeats(flight) {
    setSelectedFlight(flight);
    // endpoint findByFlightId no creado en backend por defecto; si lo necesitas, añade repo method.
    // En su lugar, asumimos que en H2 ya insertaste Seats y que existe endpoint /api/seats?flightId=ID (si no, usa H2 console).
    fetch(`${API}/api/seats?flightId=${flight.id}`)
      .then(r => r.json())
      .then(setSeats)
      .catch(e => {
        console.error(e);
        setSeats([]);
      });
  }

  async function tryLock(seatId) {
    setMsg("Intentando bloquear...");
    const res = await fetch(`${API}/api/reservations/try-lock/${seatId}`, { method: "POST" });
    if (res.ok) {
      setMsg("Bloqueado. Completa la reserva.");
    } else {
      const text = await res.text();
      setMsg("No se pudo bloquear: " + text);
    }
  }

  async function confirmReservation(seatId) {
    const payload = {
      flightId: selectedFlight.id,
      seatId,
      passengerName: "Estudiante",
      passengerEmail: "estudiante@uni.edu"
    };
    const res = await fetch(`${API}/api/reservations/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      setMsg("Reserva confirmada id: " + data.id);
      // recargar seats si corresponde
      loadSeats(selectedFlight);
    } else {
      const text = await res.text();
      setMsg("Error al confirmar: " + text);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Fly For You - Front (Demo)</h1>
      <p style={{ color: "green" }}>{msg}</p>

      <h2>Vuelos</h2>
      {flights.length === 0 && <div>No hay vuelos. Crea uno desde el backend (H2) o via API.</div>}
      <ul>
        {flights.map(f => (
          <li key={f.id}>
            <b>{f.flightNumber}</b> — {f.origin} → {f.destination} — {f.status}
            <button style={{ marginLeft: 8 }} onClick={() => loadSeats(f)}>Ver seats</button>
          </li>
        ))}
      </ul>

      {selectedFlight && (
        <>
          <h3>Asientos del vuelo {selectedFlight.flightNumber}</h3>
          {seats.length === 0 && <div>No hay seats disponibles o configure endpoint /api/seats</div>}
          <ul>
            {seats.map(s => (
              <li key={s.id}>
                {s.seatNumber} — paid: {s.paid ? "sí" : "no"} — assigned: {s.assigned ? "sí" : "no"}
                <button disabled={s.assigned} style={{ marginLeft: 8 }} onClick={() => tryLock(s.id)}>Try lock</button>
                <button disabled={s.assigned} style={{ marginLeft: 8 }} onClick={() => confirmReservation(s.id)}>Confirm</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
