import React, { useState, useEffect } from 'react';
import '../styles/PaymentForm.css';

const PaymentForm = ({ 
  selectedFlight, 
  selectedSeat, 
  extrasSeleccionados,
  precioTotal,
  onConfirmPayment,
  onBack 
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    documentoTipo: 'CC',
    documentoNumero: '',
    fechaNacimiento: '',
    metodoPago: 'TARJETA_CREDITO'
  });

  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-rellenar con datos de MSAL si están disponibles
  useEffect(() => {
    const accounts = window.msalInstance?.getAllAccounts() || [];
    if (accounts.length > 0) {
      const account = accounts[0];
      setFormData(prev => ({
        ...prev,
        nombre: account.name?.split(' ')[0] || '',
        apellido: account.name?.split(' ').slice(1).join(' ') || '',
        email: account.username || ''
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar error del campo al editar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.apellido.trim()) newErrors.apellido = 'El apellido es requerido';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    const phoneRegex = /^\d{7,15}$/;
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    } else if (!phoneRegex.test(formData.telefono.replace(/[\s-]/g, ''))) {
      newErrors.telefono = 'Teléfono inválido (7-15 dígitos)';
    }

    if (!formData.documentoNumero.trim()) {
      newErrors.documentoNumero = 'El número de documento es requerido';
    }

    if (!formData.fechaNacimiento) {
      newErrors.fechaNacimiento = 'La fecha de nacimiento es requerida';
    } else {
      const birthDate = new Date(formData.fechaNacimiento);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.fechaNacimiento = 'Debes ser mayor de 18 años';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      // Llamar al callback del padre con toda la información
      await onConfirmPayment({
        ...formData,
        precioTotal
      });
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      alert('Ocurrió un error al procesar el pago. Por favor intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="payment-form-container">
      <div className="payment-header">
        <h2>Completa tu reserva</h2>
        <p>Último paso para confirmar tu vuelo</p>
      </div>

      <div className="payment-content">
        {/* Resumen de la compra */}
        <div className="payment-summary">
          <h3>Resumen de tu compra</h3>
          
          <div className="summary-section">
            <h4>Información del vuelo</h4>
            <div className="summary-item">
              <span>Vuelo</span>
              <strong>{selectedFlight?.numeroVuelo}</strong>
            </div>
            <div className="summary-item">
              <span>Asiento</span>
              <strong>{selectedSeat?.id} - {selectedSeat?.clase}</strong>
            </div>
            <div className="summary-item">
              <span>Precio del asiento</span>
              <strong>{formatCurrency(selectedSeat?.precio || 0)}</strong>
            </div>
          </div>

          {(() => {
            const clase = selectedSeat?.clase;
            const ex = extrasSeleccionados || {};
            const isFirst = clase === 'PRIMERA_CLASE';
            const isExecutive = clase === 'EJECUTIVA';
            const showAny = isFirst || isExecutive || Object.keys(ex).some(k => ex[k]);
            return showAny;
          })() && (
            <div className="summary-section">
              <h4>Extras seleccionados</h4>
              {/* Maleta de cabina */}
              {((extrasSeleccionados?.maletaCabina) || selectedSeat?.clase === 'PRIMERA_CLASE') && (
                <div className="summary-item">
                  <span>Maleta de cabina</span>
                  {selectedSeat?.clase === 'PRIMERA_CLASE' ? (
                    <strong>Incluido</strong>
                  ) : (
                    <strong>{formatCurrency(25000)}</strong>
                  )}
                </div>
              )}
              {/* Maleta en bodega (incluida en Ejecutiva y Primera) */}
              {((extrasSeleccionados?.maletaBodega) || selectedSeat?.clase === 'PRIMERA_CLASE' || selectedSeat?.clase === 'EJECUTIVA') && (
                <div className="summary-item">
                  <span>Maleta en bodega</span>
                  {(selectedSeat?.clase === 'PRIMERA_CLASE' || selectedSeat?.clase === 'EJECUTIVA') ? (
                    <strong>Incluido</strong>
                  ) : (
                    <strong>{formatCurrency(45000)}</strong>
                  )}
                </div>
              )}
              {/* Seguro 50% */}
              {(extrasSeleccionados?.seguro50 || selectedSeat?.clase === 'PRIMERA_CLASE') && (
                <div className="summary-item">
                  <span>Seguro 50%</span>
                  {selectedSeat?.clase === 'PRIMERA_CLASE' ? (
                    <strong>Incluido</strong>
                  ) : (
                    <strong>{formatCurrency(35000)}</strong>
                  )}
                </div>
              )}
              {/* Seguro 100% */}
              {(extrasSeleccionados?.seguro100 || selectedSeat?.clase === 'PRIMERA_CLASE') && (
                <div className="summary-item">
                  <span>Seguro 100%</span>
                  {selectedSeat?.clase === 'PRIMERA_CLASE' ? (
                    <strong>Incluido</strong>
                  ) : (
                    <strong>{formatCurrency(60000)}</strong>
                  )}
                </div>
              )}
              {/* Asistencia especial */}
              {(extrasSeleccionados?.asistenciaEspecial || selectedSeat?.clase === 'PRIMERA_CLASE') && (
                <div className="summary-item">
                  <span>Asistencia especial</span>
                  {selectedSeat?.clase === 'PRIMERA_CLASE' ? (
                    <strong>Incluido</strong>
                  ) : (
                    <strong>{formatCurrency(50000)}</strong>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="summary-total">
            <span>Total a pagar</span>
            <strong className="total-amount">{formatCurrency(precioTotal)}</strong>
          </div>
        </div>

        {/* Formulario de datos del pasajero */}
        <div className="payment-form">
          <h3>Datos del pasajero</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={errors.nombre ? 'error' : ''}
                  placeholder="Ej: Juan"
                />
                {errors.nombre && <span className="error-message">{errors.nombre}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="apellido">Apellido *</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  className={errors.apellido ? 'error' : ''}
                  placeholder="Ej: Pérez"
                />
                {errors.apellido && <span className="error-message">{errors.apellido}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Correo electrónico *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="tu@email.com"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="telefono">Teléfono *</label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className={errors.telefono ? 'error' : ''}
                  placeholder="3001234567"
                />
                {errors.telefono && <span className="error-message">{errors.telefono}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="documentoTipo">Tipo de documento *</label>
                <select
                  id="documentoTipo"
                  name="documentoTipo"
                  value={formData.documentoTipo}
                  onChange={handleChange}
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="PA">Pasaporte</option>
                  <option value="TI">Tarjeta de Identidad</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="documentoNumero">Número de documento *</label>
                <input
                  type="text"
                  id="documentoNumero"
                  name="documentoNumero"
                  value={formData.documentoNumero}
                  onChange={handleChange}
                  className={errors.documentoNumero ? 'error' : ''}
                  placeholder="1234567890"
                />
                {errors.documentoNumero && <span className="error-message">{errors.documentoNumero}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="fechaNacimiento">Fecha de nacimiento *</label>
              <input
                type="date"
                id="fechaNacimiento"
                name="fechaNacimiento"
                value={formData.fechaNacimiento}
                onChange={handleChange}
                className={errors.fechaNacimiento ? 'error' : ''}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              />
              {errors.fechaNacimiento && <span className="error-message">{errors.fechaNacimiento}</span>}
            </div>

            <div className="form-divider"></div>

            <h3>Método de pago</h3>
            
            <div className="payment-methods">
              <label className="payment-method-option">
                <input
                  type="radio"
                  name="metodoPago"
                  value="TARJETA_CREDITO"
                  checked={formData.metodoPago === 'TARJETA_CREDITO'}
                  onChange={handleChange}
                />
                <div className="method-content">
                  <IconCreditCard />
                  <span>Tarjeta de Crédito</span>
                </div>
              </label>

              <label className="payment-method-option">
                <input
                  type="radio"
                  name="metodoPago"
                  value="TARJETA_DEBITO"
                  checked={formData.metodoPago === 'TARJETA_DEBITO'}
                  onChange={handleChange}
                />
                <div className="method-content">
                  <IconDebitCard />
                  <span>Tarjeta de Débito</span>
                </div>
              </label>

              <label className="payment-method-option">
                <input
                  type="radio"
                  name="metodoPago"
                  value="PSE"
                  checked={formData.metodoPago === 'PSE'}
                  onChange={handleChange}
                />
                <div className="method-content">
                  <IconPSE />
                  <span>PSE</span>
                </div>
              </label>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={onBack}
                disabled={isProcessing}
              >
                ← Volver
              </button>
              <button 
                type="submit" 
                className="btn-cta"
                disabled={isProcessing}
              >
                {isProcessing ? 'Procesando...' : `Confirmar y pagar ${formatCurrency(precioTotal)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Iconos SVG para métodos de pago
const IconCreditCard = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);

const IconDebitCard = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
    <line x1="6" y1="15" x2="10" y2="15"/>
  </svg>
);

const IconPSE = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v12M6 12h12"/>
  </svg>
);

export default PaymentForm;
