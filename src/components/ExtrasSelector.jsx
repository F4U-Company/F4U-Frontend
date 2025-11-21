import React, { useState, useEffect } from "react";

// Precios de los extras (en la moneda de tu elección)
const PRECIOS_EXTRAS = {
  maletaCabina: 25000,
  maletaBodega: 45000,
  seguro50: 35000,
  seguro100: 60000,
  asistenciaEspecial: 50000
};

// Iconos SVG personalizados
const IconMaletaCabina = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" />
  </svg>
);

const IconMaletaBodega = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    <circle cx="9" cy="14" r="1" fill="currentColor" />
    <circle cx="15" cy="14" r="1" fill="currentColor" />
  </svg>
);

const IconSeguro = ({ premium }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    {premium ? (
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
    )}
  </svg>
);

const IconAsistencia = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 1 0-16 0" />
    <path d="M12 13v4m0 4h.01" strokeLinecap="round" />
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ExtrasSelector({ selectedSeat, onExtrasChange }) {
  const [extras, setExtras] = useState({
    maletaCabina: false,
    maletaBodega: false,
    seguro50: false,
    seguro100: false,
    asistenciaEspecial: false
  });

  const [includedExtras, setIncludedExtras] = useState({
    maletaCabina: false,
    maletaBodega: false,
    seguro50: false,
    seguro100: false,
    asistenciaEspecial: false
  });

  // Determinar qué extras vienen incluidos según la clase del asiento
  useEffect(() => {
    if (!selectedSeat) return;

    const seatClass = selectedSeat.clase || selectedSeat.class;
    
    if (seatClass === "PRIMERA_CLASE" || seatClass === "business") {
      // Primera clase: todos los extras incluidos
      const allIncluded = {
        maletaCabina: true,
        maletaBodega: true,
        seguro50: true,
        seguro100: true,
        asistenciaEspecial: true
      };
      setIncludedExtras(allIncluded);
      setExtras(allIncluded);
    } else if (seatClass === "EJECUTIVA") {
      // Ejecutiva: maleta de bodega incluida
      const executiveIncluded = {
        maletaCabina: false,
        maletaBodega: true,
        seguro50: false,
        seguro100: false,
        asistenciaEspecial: false
      };
      setIncludedExtras(executiveIncluded);
      setExtras(executiveIncluded);
    } else {
      // Económica: sin extras incluidos
      const noIncluded = {
        maletaCabina: false,
        maletaBodega: false,
        seguro50: false,
        seguro100: false,
        asistenciaEspecial: false
      };
      setIncludedExtras(noIncluded);
      setExtras(noIncluded);
    }
  }, [selectedSeat]);

  // Notificar cambios al padre
  useEffect(() => {
    if (onExtrasChange) {
      onExtrasChange(extras);
    }
  }, [extras, onExtrasChange]);

  const handleToggleExtra = (extraKey) => {
    // Si el extra está incluido, no se puede desmarcar
    if (includedExtras[extraKey]) {
      return;
    }

    // No permitir tener ambos seguros al mismo tiempo
    if (extraKey === 'seguro50' && extras.seguro100) {
      setExtras({ ...extras, seguro100: false, [extraKey]: !extras[extraKey] });
    } else if (extraKey === 'seguro100' && extras.seguro50) {
      setExtras({ ...extras, seguro50: false, [extraKey]: !extras[extraKey] });
    } else {
      setExtras({ ...extras, [extraKey]: !extras[extraKey] });
    }
  };

  const calcularTotal = () => {
    let total = 0;
    Object.keys(extras).forEach(key => {
      // Solo sumar si está seleccionado y NO está incluido
      if (extras[key] && !includedExtras[key]) {
        total += PRECIOS_EXTRAS[key];
      }
    });
    return total;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getSeatClassName = () => {
    if (!selectedSeat) return "Económica";
    const seatClass = selectedSeat.clase || selectedSeat.class;
    if (seatClass === "PRIMERA_CLASE" || seatClass === "business") return "Primera Clase";
    if (seatClass === "EJECUTIVA") return "Ejecutiva";
    return "Económica";
  };

  const hasIncludedExtras = includedExtras.maletaCabina || includedExtras.maletaBodega || 
                           includedExtras.seguro50 || includedExtras.seguro100 || includedExtras.asistenciaEspecial;

  return (
    <div className="extras-selector">
      {/* Header */}
      <div className="extras-header">
        <h3 className="extras-title">Personaliza tu experiencia</h3>
        <p className="extras-subtitle">
          Asiento {selectedSeat?.id || selectedSeat?.numeroAsiento} · Clase {getSeatClassName()}
        </p>
      </div>

      {/* Info de lo incluido */}
      {hasIncludedExtras && (
        <div className="extras-included-banner">
          <div className="included-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="included-content">
            <div className="included-title">Tu clase incluye los siguientes servicios</div>
            <div className="included-list">
              {includedExtras.maletaCabina && <span className="included-item">Maleta de cabina</span>}
              {includedExtras.maletaBodega && <span className="included-item">Maleta de bodega</span>}
              {includedExtras.seguro50 && <span className="included-item">Seguro Flex 50%</span>}
              {includedExtras.seguro100 && <span className="included-item">Seguro Premium 100%</span>}
              {includedExtras.asistenciaEspecial && <span className="included-item">Asistencia especial</span>}
            </div>
          </div>
        </div>
      )}

      {/* Grid de extras */}
      <div className="extras-grid">
        {/* Maleta de cabina */}
        <div 
          className={`extra-card ${extras.maletaCabina ? 'selected' : ''} ${includedExtras.maletaCabina ? 'included' : ''}`}
          onClick={() => handleToggleExtra('maletaCabina')}
        >
          <div className="extra-icon">
            <IconMaletaCabina />
          </div>
          <div className="extra-content">
            <h4 className="extra-name">Maleta de cabina</h4>
            <p className="extra-description">1 maleta de hasta 10kg</p>
            <div className="extra-price">
              {includedExtras.maletaCabina ? (
                <span className="price-included">Incluido</span>
              ) : (
                <span className="price-value">{formatCurrency(PRECIOS_EXTRAS.maletaCabina)}</span>
              )}
            </div>
          </div>
          {!includedExtras.maletaCabina && (
            <div className="extra-checkbox">
              <input 
                type="checkbox" 
                checked={extras.maletaCabina} 
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {includedExtras.maletaCabina && (
            <div className="included-badge">
              <IconCheck />
            </div>
          )}
        </div>

        {/* Maleta de bodega */}
        <div 
          className={`extra-card ${extras.maletaBodega ? 'selected' : ''} ${includedExtras.maletaBodega ? 'included' : ''}`}
          onClick={() => handleToggleExtra('maletaBodega')}
        >
          <div className="extra-icon">
            <IconMaletaBodega />
          </div>
          <div className="extra-content">
            <h4 className="extra-name">Maleta de bodega</h4>
            <p className="extra-description">1 maleta de hasta 23kg</p>
            <div className="extra-price">
              {includedExtras.maletaBodega ? (
                <span className="price-included">Incluido</span>
              ) : (
                <span className="price-value">{formatCurrency(PRECIOS_EXTRAS.maletaBodega)}</span>
              )}
            </div>
          </div>
          {!includedExtras.maletaBodega && (
            <div className="extra-checkbox">
              <input 
                type="checkbox" 
                checked={extras.maletaBodega} 
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {includedExtras.maletaBodega && (
            <div className="included-badge">
              <IconCheck />
            </div>
          )}
        </div>

        {/* Seguro 50% */}
        <div 
          className={`extra-card ${extras.seguro50 ? 'selected' : ''} ${includedExtras.seguro50 ? 'included' : ''}`}
          onClick={() => handleToggleExtra('seguro50')}
        >
          <div className="extra-icon">
            <IconSeguro premium={false} />
          </div>
          <div className="extra-content">
            <h4 className="extra-name">Seguro Flex 50%</h4>
            <p className="extra-description">50% de reembolso en cambios</p>
            <div className="extra-price">
              {includedExtras.seguro50 ? (
                <span className="price-included">Incluido</span>
              ) : (
                <span className="price-value">{formatCurrency(PRECIOS_EXTRAS.seguro50)}</span>
              )}
            </div>
          </div>
          {!includedExtras.seguro50 && (
            <div className="extra-checkbox">
              <input 
                type="checkbox" 
                checked={extras.seguro50} 
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {includedExtras.seguro50 && (
            <div className="included-badge">
              <IconCheck />
            </div>
          )}
        </div>

        {/* Seguro 100% */}
        <div 
          className={`extra-card ${extras.seguro100 ? 'selected' : ''} ${includedExtras.seguro100 ? 'included' : ''}`}
          onClick={() => handleToggleExtra('seguro100')}
        >
          <div className="extra-icon">
            <IconSeguro premium={true} />
          </div>
          <div className="extra-content">
            <h4 className="extra-name">Seguro Premium 100%</h4>
            <p className="extra-description">Reembolso completo garantizado</p>
            <div className="extra-price">
              {includedExtras.seguro100 ? (
                <span className="price-included">Incluido</span>
              ) : (
                <span className="price-value">{formatCurrency(PRECIOS_EXTRAS.seguro100)}</span>
              )}
            </div>
          </div>
          {!includedExtras.seguro100 && (
            <div className="extra-checkbox">
              <input 
                type="checkbox" 
                checked={extras.seguro100} 
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {includedExtras.seguro100 && (
            <div className="included-badge">
              <IconCheck />
            </div>
          )}
        </div>

        {/* Asistencia especial */}
        <div 
          className={`extra-card ${extras.asistenciaEspecial ? 'selected' : ''} ${includedExtras.asistenciaEspecial ? 'included' : ''}`}
          onClick={() => handleToggleExtra('asistenciaEspecial')}
        >
          <div className="extra-icon">
            <IconAsistencia />
          </div>
          <div className="extra-content">
            <h4 className="extra-name">Asistencia especial</h4>
            <p className="extra-description">Soporte personalizado en el aeropuerto</p>
            <div className="extra-price">
              {includedExtras.asistenciaEspecial ? (
                <span className="price-included">Incluido</span>
              ) : (
                <span className="price-value">{formatCurrency(PRECIOS_EXTRAS.asistenciaEspecial)}</span>
              )}
            </div>
          </div>
          {!includedExtras.asistenciaEspecial && (
            <div className="extra-checkbox">
              <input 
                type="checkbox" 
                checked={extras.asistenciaEspecial} 
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {includedExtras.asistenciaEspecial && (
            <div className="included-badge">
              <IconCheck />
            </div>
          )}
        </div>
      </div>

      {/* Resumen de precio */}
      <div className="extras-summary">
        <div className="summary-content">
          <div className="summary-row">
            <span className="summary-label">Extras adicionales</span>
            <span className="summary-value">{formatCurrency(calcularTotal())}</span>
          </div>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="extras-note">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>Los seguros Flex 50% y Premium 100% no se pueden seleccionar simultáneamente</span>
      </div>
    </div>
  );
}
