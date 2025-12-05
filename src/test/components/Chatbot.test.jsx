import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { vi } from 'vitest';
import Chatbot from '../../components/Chatbot';

const instanceMock = {
  acquireTokenSilent: vi.fn(),
};

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: instanceMock,
    accounts: [{ username: 'tester@example.com' }],
  }),
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('Chatbot component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_API_URL = 'http://api.test';
  });

  it('sends a message and displays the bot response', async () => {
    instanceMock.acquireTokenSilent.mockResolvedValue({ accessToken: 'token-123' });
    axios.post.mockResolvedValueOnce({ data: { answer: 'Respuesta automática' } });

    render(<Chatbot />);

    const toggle = screen.getByRole('button', { name: /toggle chatbot/i });
    await userEvent.click(toggle);

    const input = screen.getByPlaceholderText(/Escribe tu pregunta/i);
    await userEvent.type(input, 'Hola');

    const sendButton = screen.getByRole('button', { name: /Enviar mensaje/i });
    await userEvent.click(sendButton);

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith(
      'http://api.test/api/chatbot/ask',
      { question: 'Hola' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Hola')).toBeInTheDocument();
      expect(screen.getByText('Respuesta automática')).toBeInTheDocument();
    });
  });

  it('shows an error message when the token cannot be obtained', async () => {
    instanceMock.acquireTokenSilent.mockRejectedValue(new Error('token-error'));

    render(<Chatbot />);
    const toggle = screen.getByRole('button', { name: /toggle chatbot/i });
    await userEvent.click(toggle);

    const input = screen.getByPlaceholderText(/Escribe tu pregunta/i);
    await userEvent.type(input, 'Consulta');
    const sendButton = screen.getByRole('button', { name: /Enviar mensaje/i });
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/hubo un error/i)).toBeInTheDocument();
    });
    expect(axios.post).not.toHaveBeenCalled();
  });
});
