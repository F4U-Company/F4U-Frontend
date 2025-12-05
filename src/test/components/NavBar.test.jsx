import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import NavBar from '../../components/NavBar';

const { mockLogoutPopup, defaultAccounts, mockGetUserProfile } = vi.hoisted(() => ({
  mockLogoutPopup: vi.fn(),
  defaultAccounts: [{ name: 'Default User', username: 'user@example.com' }],
  mockGetUserProfile: vi.fn(),
}));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      logoutPopup: mockLogoutPopup,
    },
    accounts: defaultAccounts,
  }),
}));

vi.mock('../../services/api', () => ({
  authAPI: {
    getUserProfile: mockGetUserProfile,
  },
}));

describe('NavBar component', () => {
  beforeEach(() => {
    mockLogoutPopup.mockReset();
    mockGetUserProfile.mockReset();
  });

  it('displays backend profile information when available', async () => {
    mockGetUserProfile.mockResolvedValueOnce({
      data: { displayName: 'API User', email: 'api@user.com', roles: ['ADMIN'] },
    });

    render(<NavBar />);

    await waitFor(() => expect(mockGetUserProfile).toHaveBeenCalled());
    expect(screen.getByText('API User')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();

    const trigger = screen.getAllByText('API User')[0];
    await userEvent.click(trigger);
    expect(screen.getByText('Mi Perfil')).toBeInTheDocument();
  });

  it('falls back to MSAL account data when API fails', async () => {
    mockGetUserProfile.mockRejectedValueOnce(new Error('network'));

    render(<NavBar />);

    await waitFor(() => expect(mockGetUserProfile).toHaveBeenCalled());
    expect(screen.getByText('Default User')).toBeInTheDocument();
  });

  it('clears the session and triggers logout when requested', async () => {
    mockGetUserProfile.mockResolvedValueOnce({
      data: { displayName: 'API User', email: 'api@user.com', roles: ['USER'] },
    });
    window.sessionStorage.setItem('accessToken', 'token');

    render(<NavBar />);
    await waitFor(() => expect(screen.getByText('API User')).toBeInTheDocument());

    const menuTrigger = screen.getAllByText('API User')[0];
    await userEvent.click(menuTrigger);
    await userEvent.click(screen.getByText('Cerrar Sesión'));

    await waitFor(() => {
      expect(mockLogoutPopup).toHaveBeenCalledWith({ mainWindowRedirectUri: '/' });
    });
    expect(window.sessionStorage.getItem('accessToken')).toBeNull();
  });
});
