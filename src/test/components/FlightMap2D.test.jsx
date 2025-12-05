import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import FlightMap2D from '../../components/FlightMap2D';

const leafletMocks = vi.hoisted(() => {
  const mapInstance = {
    fitBounds: vi.fn(),
    setView: vi.fn(),
    invalidateSize: vi.fn(),
  };

  const polylineInstance = {
    addTo: vi.fn(() => polylineInstance),
    setLatLngs: vi.fn(),
  };

  const markerElement = document.createElement('div');
  const markerIcon = document.createElement('div');
  markerIcon.className = 'plane-icon';
  markerElement.appendChild(markerIcon);

  const markerInstance = {
    addTo: vi.fn(() => markerInstance),
    setLatLng: vi.fn(),
    getElement: vi.fn(() => markerElement),
  };

  const tileLayer = vi.fn(() => ({ addTo: vi.fn() }));
  const bounds = {};
  bounds.pad = vi.fn(() => bounds);

  const module = {
    map: vi.fn(() => mapInstance),
    tileLayer,
    polyline: vi.fn(() => polylineInstance),
    marker: vi.fn(() => markerInstance),
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => bounds),
  };

  return { module, state: { mapInstance, polylineInstance, markerInstance, bounds } };
});

vi.mock('leaflet', () => ({
  __esModule: true,
  default: leafletMocks.module,
}));

vi.mock('@turf/turf', () => ({
  lineString: (coords) => ({ coords }),
  length: () => 100,
  along: (line, distance) => {
    const ratio = distance / 100;
    const [start, end] = line.coords;
    const lng = start[0] + (end[0] - start[0]) * ratio;
    const lat = start[1] + (end[1] - start[1]) * ratio;
    return { geometry: { coordinates: [lng, lat] } };
  },
  bearing: () => 90,
}));

describe('FlightMap2D component', () => {
  beforeEach(() => {
    const resetFns = (collection) => {
      Object.values(collection).forEach((value) => {
        if (typeof value === 'function' && 'mockClear' in value) {
          value.mockClear();
        }
      });
    };

    resetFns(leafletMocks.module);
    Object.values(leafletMocks.state).forEach((obj) => {
      if (obj) {
        resetFns(obj);
      }
    });
  });

  it('creates the map and animates the route', async () => {
    render(<FlightMap2D steps={4} drawSpeed={2} planeSpeed={1} />);

    await waitFor(() => {
      expect(leafletMocks.module.map).toHaveBeenCalled();
      expect(leafletMocks.state.polylineInstance.setLatLngs).toHaveBeenCalled();
      expect(leafletMocks.state.markerInstance.setLatLng).toHaveBeenCalled();
    });
  });

  it('calls setView when bounds cannot be calculated', async () => {
    leafletMocks.module.latLngBounds.mockImplementationOnce(() => {
      throw new Error('no bounds');
    });

    render(<FlightMap2D steps={2} />);

    await waitFor(() => {
      expect(leafletMocks.state.mapInstance.setView).toHaveBeenCalled();
    });
  });
});
