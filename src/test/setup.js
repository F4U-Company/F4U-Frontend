import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Polyfill básico para localStorage/sessionStorage en entornos sin soporte
const createStorage = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const ensureStorage = (key) => {
  try {
    const existing = window[key];
    if (!existing) {
      throw new Error('missing');
    }
  } catch {
    Object.defineProperty(window, key, {
      configurable: true,
      value: createStorage(),
    });
  }
};

ensureStorage('localStorage');
ensureStorage('sessionStorage');

if (typeof window.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  });
}

if (!Element.prototype.scrollIntoView) {
  const scrollIntoViewMock = typeof vi !== 'undefined' ? vi.fn() : () => {};
  Element.prototype.scrollIntoView = scrollIntoViewMock;
}

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
