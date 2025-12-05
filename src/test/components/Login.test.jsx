import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Login from '../../components/Login';

const mockLoginRedirect = vi.fn();

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      loginRedirect: mockLoginRedirect,
    },
  }),
}));

describe('Login component', () => {
  beforeEach(() => {
    mockLoginRedirect.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers Microsoft login when the button is clicked', async () => {
    mockLoginRedirect.mockResolvedValueOnce();
    render(<Login />);

    const button = screen.getByRole('button', { name: /iniciar sesión con microsoft/i });
    await userEvent.click(button);

    expect(mockLoginRedirect).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner while the login promise resolves', async () => {
    let resolveLogin;
    const pendingPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLoginRedirect.mockReturnValueOnce(pendingPromise);

    render(<Login />);
    const button = screen.getByRole('button', { name: /iniciar sesión con microsoft/i });
    await userEvent.click(button);

    expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument();

    resolveLogin();
  });

  it('renders an error message if login fails', async () => {
    mockLoginRedirect.mockRejectedValueOnce(new Error('network error'));
    render(<Login />);

    const button = screen.getByRole('button', { name: /iniciar sesión con microsoft/i });
    await userEvent.click(button);

    expect(await screen.findByText(/error al iniciar sesión/i)).toBeInTheDocument();
    expect(mockLoginRedirect).toHaveBeenCalledTimes(1);
  });
});
