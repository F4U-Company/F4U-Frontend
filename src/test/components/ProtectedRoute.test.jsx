import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { vi } from 'vitest';
import * as ProtectedRouteModule from '../../components/ProtectedRoute';

const ProtectedRoute = ProtectedRouteModule.default;

const mockUseIsAuthenticated = vi.fn();
const mockUseMsal = vi.fn();
const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: () => mockUseIsAuthenticated(),
  useMsal: () => mockUseMsal(),
}));

describe('ProtectedRoute component', () => {

  beforeEach(() => {
    window.sessionStorage.clear();
    mockUseIsAuthenticated.mockReset();
    mockUseMsal.mockReset();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', locationDescriptor);
  });

  it('shows loading spinner when MSAL is busy', () => {
    mockUseIsAuthenticated.mockReturnValue(false);
    mockUseMsal.mockReturnValue({ inProgress: 'login', accounts: [], instance: {} });

    render(<ProtectedRoute>contenido</ProtectedRoute>);

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('renders children once the user is authenticated', async () => {
    vi.useFakeTimers();
    mockUseIsAuthenticated.mockReturnValue(true);
    mockUseMsal.mockReturnValue({ inProgress: 'none', accounts: [], instance: {} });

    render(<ProtectedRoute>Área segura</ProtectedRoute>);

    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.getByText('Área segura')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('redirects unauthenticated users to the home page', async () => {
    vi.useFakeTimers();
    mockUseIsAuthenticated.mockReturnValue(false);
    mockUseMsal.mockReturnValue({ inProgress: 'none', accounts: [], instance: {} });
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    render(<ProtectedRoute>Secreto</ProtectedRoute>);

    await act(async () => {
      await Promise.resolve();
      vi.runAllTimers();
    });

    expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
    const redirectCall = timeoutSpy.mock.calls.find(([, delay]) => delay === 1500);
    expect(redirectCall).toBeTruthy();
    timeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('keeps waiting when there is a token but authentication is pending', () => {
    window.sessionStorage.setItem('accessToken', 'token');
    mockUseIsAuthenticated.mockReturnValue(false);
    mockUseMsal.mockReturnValue({ inProgress: 'none', accounts: [], instance: {} });

    render(<ProtectedRoute>Contenido</ProtectedRoute>);

    expect(screen.getByText(/verificando sesión/i)).toBeInTheDocument();
  });
});

describe('redirectToHome helper', () => {
  afterEach(() => {
    Object.defineProperty(window, 'location', locationDescriptor);
  });

  it('uses window.location.assign when available', () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: assignMock,
      },
    });

    ProtectedRouteModule.redirectToHome();
    expect(assignMock).toHaveBeenCalledWith('/');
  });

  it('falls back to modifying href when assign is missing', () => {
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
      },
    });

    ProtectedRouteModule.redirectToHome();
    expect(hrefValue).toBe('/');
  });
});
