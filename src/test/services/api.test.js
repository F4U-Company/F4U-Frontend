import { vi } from 'vitest';
import api, {
    apiUtils,
    authAPI,
    cityAPI,
    dashboardAPI,
    debugAPI,
    flightAPI,
    getApiBaseUrl,
    paymentAPI,
    reservationAPI,
    seatAPI,
    seatLockAPI,
    testAPI,
    userAPI,
} from '../../services/api';

const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');

afterAll(() => {
  Object.defineProperty(window, 'location', locationDescriptor);
});

describe('API configuration helpers', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('prefers the VITE_API_URL when provided', () => {
    const customEnv = { VITE_API_URL: 'https://custom.example.com' };
    expect(getApiBaseUrl(customEnv, { hostname: 'localhost' })).toBe('https://custom.example.com');
  });

  it('falls back to Azure hostname heuristic', () => {
    const url = getApiBaseUrl({}, { hostname: 'niceapp.azurestaticapps.net' });
    expect(url).toContain('azurewebsites.net');
  });

  it('defaults to localhost when nothing else is set', () => {
    const url = getApiBaseUrl({}, { hostname: 'dev.local' });
    expect(url).toBe('http://localhost:8080');
  });
});

describe('Axios interceptors', () => {
  const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
  const responseErrorInterceptor = api.interceptors.response.handlers[0].rejected;

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches the bearer token for protected endpoints', async () => {
    window.sessionStorage.setItem('accessToken', 'abc123');
    const config = await requestInterceptor({ url: '/api/dashboard/stats', headers: {} });
    expect(config.headers.Authorization).toBe('Bearer abc123');
  });

  it('rejects calls to protected endpoints without a token', async () => {
    await expect(requestInterceptor({ url: '/api/dashboard', headers: {} })).rejects.toThrow('No autorizado');
  });

  it('skips auth header for public endpoints', async () => {
    const config = await requestInterceptor({ url: '/api/health', headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('clears the session and redirects on 401 responses to protected endpoints', async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem('accessToken', 'token');
    let hrefValue = 'http://localhost';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        get href() {
          return hrefValue;
        },
        set href(val) {
          hrefValue = val;
        },
        hostname: 'localhost',
      },
    });

    const error = {
      config: { url: '/api/dashboard/stats' },
      response: { status: 401 },
      message: 'Unauthorized',
    };

    await responseErrorInterceptor(error).catch(() => {});
    vi.runAllTimers();

    expect(window.sessionStorage.getItem('accessToken')).toBeNull();
    expect(window.location.href).toBe('/');
    Object.defineProperty(window, 'location', locationDescriptor);
    vi.useRealTimers();
  });

  it('does not redirect when the 401 comes from a public endpoint', async () => {
    const clearSpy = vi.spyOn(window.sessionStorage, 'clear');
    const error = {
      config: { url: '/api/health' },
      response: { status: 401 },
      message: 'Unauthorized',
    };

    await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
    expect(clearSpy).not.toHaveBeenCalled();
  });
});

describe('apiUtils helpers', () => {
  const createToken = (payload) => {
    const base64 = btoa(JSON.stringify(payload));
    return `header.${base64}.signature`;
  };

  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('validates backend availability', async () => {
    const spy = vi.spyOn(testAPI, 'healthCheck').mockResolvedValue({});
    await expect(apiUtils.isBackendAvailable()).resolves.toBe(true);
    spy.mockRejectedValueOnce(new Error('down'));
    await expect(apiUtils.isBackendAvailable()).resolves.toBe(false);
  });

  it('evaluates authentication helpers', () => {
    expect(apiUtils.isAuthenticated()).toBe(false);
    window.sessionStorage.setItem('accessToken', 'token');
    expect(apiUtils.isAuthenticated()).toBe(true);
  });

  it('decodes JWT payloads and computes expiration', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const token = createToken({ sub: '123', email: 'test@example.com', exp: future, roles: ['ADMIN'] });
    window.sessionStorage.setItem('accessToken', token);

    const info = apiUtils.getTokenInfo();
    expect(info.email).toBe('test@example.com');
    expect(apiUtils.getUserEmail()).toBe('test@example.com');
    expect(apiUtils.isTokenExpired()).toBe(false);

    const pastToken = createToken({ exp: 1 });
    window.sessionStorage.setItem('accessToken', pastToken);
    expect(apiUtils.isTokenExpired()).toBe(true);
  });

  it('cleans up stored credentials', () => {
    window.sessionStorage.setItem('accessToken', 'token');
    window.localStorage.setItem('msal-account', 'abc');

    apiUtils.clearAuth();

    expect(window.sessionStorage.getItem('accessToken')).toBeNull();
    expect(window.localStorage.getItem('msal-account')).toBeNull();
  });
});

describe('endpoint builder wiring', () => {
  it('exposes axios wrappers without invoking network calls', () => {
    expect(authAPI.getUserProfile).toBeTypeOf('function');
    expect(debugAPI.getTokenInfo).toBeTypeOf('function');
    expect(flightAPI.getAllFlights).toBeTypeOf('function');
    expect(reservationAPI.createReservation).toBeTypeOf('function');
    expect(cityAPI.getAllCities).toBeTypeOf('function');
    expect(seatAPI.getSeatsByFlight).toBeTypeOf('function');
    expect(seatLockAPI.lockSeat).toBeTypeOf('function');
    expect(userAPI.getProfile).toBeTypeOf('function');
    expect(paymentAPI.processPayment).toBeTypeOf('function');
    expect(dashboardAPI.getDashboardStats).toBeTypeOf('function');
  });
});
