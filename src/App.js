import React, { useEffect, useState } from "react";
import "./App.css";
// antes: const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
const API_BASE = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) || "";
console.log("API_BASE (build):", API_BASE);

function FlightForm({ onCreated }) {
  const [form, setForm] = useState({
    flightNumber: "",
    origin: "",
    destination: "",
    departureTime: "",
    arrivalTime: "",
    gate: "",
    status: "ON_TIME"
  });

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Error creando vuelo");
      const data = await res.json();
      onCreated(data);
      setForm({
        flightNumber: "",
        origin: "",
        destination: "",
        departureTime: "",
        arrivalTime: "",
        gate: "",
        status: "ON_TIME"
      });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h3>Crear vuelo</h3>
      <div className="row">
        <input name="flightNumber" placeholder="Número" value={form.flightNumber} onChange={handleChange} required />
        <input name="origin" placeholder="Origen" value={form.origin} onChange={handleChange} required />
        <input name="destination" placeholder="Destino" value={form.destination} onChange={handleChange} required />
      </div>
      <div className="row">
        <input name="departureTime" type="datetime-local" value={form.departureTime} onChange={handleChange} required />
        <input name="arrivalTime" type="datetime-local" value={form.arrivalTime} onChange={handleChange} required />
      </div>
      <div className="row">
        <input name="gate" placeholder="Puerta" value={form.gate} onChange={handleChange} />
        <select name="status" value={form.status} onChange={handleChange}>
          <option value="ON_TIME">ON TIME</option>
          <option value="DELAYED">DELAYED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>
      <button className="btn" type="submit">Crear vuelo</button>
    </form>
  );
}

function FlightList({ flights, onDelete }) {
  return (
    <div className="card">
      <h3>Vuelos</h3>
      <table className="flights-table">
        <thead>
          <tr>
            <th>ID</th><th>Num</th><th>Origen</th><th>Destino</th><th>Salida</th><th>Llegada</th><th>Puerta</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>
          {flights.length === 0 && <tr><td colSpan="9">No hay vuelos</td></tr>}
          {flights.map(f => (
            <tr key={f.id}>
              <td>{f.id}</td>
              <td>{f.flightNumber}</td>
              <td>{f.origin}</td>
              <td>{f.destination}</td>
              <td>{f.departureTime ? new Date(f.departureTime).toLocaleString() : ""}</td>
              <td>{f.arrivalTime ? new Date(f.arrivalTime).toLocaleString() : ""}</td>
              <td>{f.gate}</td>
              <td>{f.status}</td>
              <td><button className="btn small danger" onClick={() => onDelete(f.id)}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadFlights() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/flights`);
      const data = await res.json();
      setFlights(data || []);
    } catch (err) {
      console.error(err);
      alert("Error cargando vuelos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFlights();
  }, []);

  async function handleDelete(id) {
    if (!confirm("Eliminar vuelo?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/flights/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        setFlights(prev => prev.filter(f => f.id !== id));
      } else {
        alert("No se pudo eliminar");
      }
    } catch (err) {
      console.error(err);
      alert("Error al eliminar");
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>F4U - Administrador</h1>
        <p className="muted">Interfaz demo: prueba GET y POST contra backend Spring Boot</p>
      </header>

      <main className="container">
        <div className="left">
          <FlightForm onCreated={(f) => setFlights(prev => [f, ...prev])} />
        </div>

        <div className="right">
          <div className="card">
            <div className="card-header">
              <h3>Lista de vuelos</h3>
              <button className="btn small" onClick={loadFlights} disabled={loading}>{loading ? "Cargando..." : "Refrescar"}</button>
            </div>
            <FlightList flights={flights} onDelete={handleDelete} />
          </div>
        </div>
      </main>

      <footer className="footer">
        <small>API: {API_BASE}</small>
      </footer>
    </div>
  );
}
