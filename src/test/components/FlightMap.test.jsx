import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import FlightMap from '../../components/FlightMap';

const { globeFactory, instances } = vi.hoisted(() => {
  const instances = [];
  const createInstance = () => {
    const renderer = {
      domElement: document.createElement('canvas'),
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
    };
    return {
      globeImageUrl: vi.fn().mockReturnThis(),
      backgroundColor: vi.fn().mockReturnThis(),
      showAtmosphere: vi.fn().mockReturnThis(),
      arcDashLength: vi.fn().mockReturnThis(),
      arcDashGap: vi.fn().mockReturnThis(),
      arcDashAnimateTime: vi.fn().mockReturnThis(),
      arcAltitude: vi.fn().mockReturnThis(),
      arcStroke: vi.fn().mockReturnThis(),
      arcColor: vi.fn().mockReturnThis(),
      renderer: vi.fn(() => renderer),
      controls: vi.fn(() => ({ autoRotate: false, autoRotateSpeed: 0 })),
      arcsData: vi.fn().mockReturnThis(),
      _destructor: vi.fn(),
    };
  };

  const globeFactory = vi.fn(() => (el) => {
    const instance = createInstance();
    instance._el = el;
    instances.push(instance);
    return instance;
  });

  return { globeFactory, instances };
});

vi.mock('globe.gl', () => ({
  default: globeFactory,
}));

const originalRAF = globalThis.requestAnimationFrame;
const originalCAF = globalThis.cancelAnimationFrame;

describe('FlightMap component', () => {
  beforeAll(() => {
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  });

  afterAll(() => {
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
  });

  beforeEach(() => {
    instances.length = 0;
  });

  it('initializes the globe and draws the arc between points', async () => {
    render(<FlightMap origin={[-10, 10]} destination={[20, -5]} steps={8} />);

    await waitFor(() => {
      expect(globeFactory).toHaveBeenCalled();
      expect(instances[0].globeImageUrl).toHaveBeenCalled();
      expect(instances[0].arcsData).toHaveBeenCalled();
    });
  });

  it('cleans up the globe instance on unmount', async () => {
    const { unmount } = render(<FlightMap />);

    await waitFor(() => expect(instances[0].globeImageUrl).toHaveBeenCalled());
    unmount();

    await waitFor(() => expect(instances[0]._destructor).toHaveBeenCalled());
  });

  it('uses the window resize listener when ResizeObserver is missing', async () => {
    const originalObserver = globalThis.ResizeObserver;
    // eslint-disable-next-line no-global-assign
    globalThis.ResizeObserver = undefined;
    const resizeSpy = vi.spyOn(window, 'addEventListener');

    render(<FlightMap />);

    await waitFor(() => {
      expect(resizeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    resizeSpy.mockRestore();
    globalThis.ResizeObserver = originalObserver;
  });
});
