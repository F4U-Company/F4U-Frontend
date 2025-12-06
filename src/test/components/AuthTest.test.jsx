import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AuthTest from '../../components/AuthTest';

const mocks = vi.hoisted(() => ({
  healthCheck: vi.fn(),
  getUserProfile: vi.fn(),
  getDebugInfo: vi.fn(),
}));

let isAuthenticated = true;

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    accounts: [{ name: 'Tester', username: 'tester@example.com' }],
  }),
  useIsAuthenticated: () => isAuthenticated,
}));

vi.mock('../../services/api', () => ({
  authAPI: {
    getUserProfile: mocks.getUserProfile,
  },
  testAPI: {
    healthCheck: mocks.healthCheck,
  },
  debugAPI: {
    getTokenInfo: mocks.getDebugInfo,
  },
}));

describe('AuthTest component', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    isAuthenticated = true;
  });

  it('displays backend information when authenticated and token exists', async () => {
    sessionStorage.setItem('accessToken', 'token');
    mocks.healthCheck.mockResolvedValue({ data: { status: 'ok' } });
    mocks.getUserProfile.mockResolvedValue({ data: { roles: ['ADMIN'] } });
    mocks.getDebugInfo.mockResolvedValue({
      data: {
        authenticated: true,
        jwtClaims: { subject: '123', issuer: 'issuer', audience: ['api'] },
      },
    });

    render(<AuthTest />);

    await waitFor(() => {
      expect(mocks.healthCheck).toHaveBeenCalled();
      expect(screen.getByText(/Backend health:/).parentElement).toHaveTextContent('Backend health: ✅ OK');
      expect(screen.getByText(/Backend auth:/).parentElement).toHaveTextContent('Backend auth: ✅ OK');
      expect(screen.getByText(/Token Debug Info/)).toBeInTheDocument();
    });
  });

  it('skips protected calls when the user is not authenticated', async () => {
    isAuthenticated = false;
    mocks.healthCheck.mockResolvedValue({ data: { status: 'ok' } });

    render(<AuthTest />);

    await waitFor(() => expect(mocks.healthCheck).toHaveBeenCalled());
    expect(mocks.getUserProfile).not.toHaveBeenCalled();
    expect(screen.getByText(/Autenticado:/).parentElement).toHaveTextContent('Autenticado: ❌ No');
    expect(screen.getByText(/Token guardado:/).parentElement).toHaveTextContent('Token guardado: ❌ No');
  });

  it('surfaces error states when backend calls fail', async () => {
    sessionStorage.setItem('accessToken', 'token');
    mocks.healthCheck.mockRejectedValue(new Error('down'));
    mocks.getUserProfile.mockRejectedValue(new Error('profile error'));
    mocks.getDebugInfo.mockRejectedValue(new Error('debug error'));

    render(<AuthTest />);

    await waitFor(() => {
      expect(screen.getByText(/Backend health:/).parentElement).toHaveTextContent('Backend health: ❌ Error');
      expect(screen.getByText(/Backend auth:/).parentElement).toHaveTextContent('Backend auth: ❌ Error');
    });
  });
});
