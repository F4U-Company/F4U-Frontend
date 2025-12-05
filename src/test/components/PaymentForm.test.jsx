import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PaymentForm from '../../components/PaymentForm';

describe('PaymentForm component', () => {
  const defaultSeat = {
    id: '12A',
    clase: 'ECONOMICA',
    precio: 250000,
  };

  const baseProps = {
    selectedFlight: { numeroVuelo: 'F4U-123' },
    selectedSeat: defaultSeat,
    extrasSeleccionados: {},
    precioTotal: 250000,
    onConfirmPayment: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    window.msalInstance = {
      getAllAccounts: () => [{ name: 'John Tester', username: 'john@test.com' }],
    };
    window.sessionStorage.clear();
    baseProps.onConfirmPayment.mockReset();
    baseProps.onBack.mockReset();
  });

  afterEach(() => {
    delete window.msalInstance;
  });

  it('shows validation errors when submitting an empty form', async () => {
    window.msalInstance = { getAllAccounts: () => [] };
    render(<PaymentForm {...baseProps} />);

    await userEvent.click(screen.getByRole('button', { name: /confirmar y pagar/i }));

    expect(await screen.findByText(/el nombre es requerido/i)).toBeInTheDocument();
    expect(screen.getByText(/el apellido es requerido/i)).toBeInTheDocument();
    expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument();
    expect(screen.getByText(/el teléfono es requerido/i)).toBeInTheDocument();
  });

  it('submits payment details when the form is valid', async () => {
    const onConfirmPayment = vi.fn().mockResolvedValue({});
    render(<PaymentForm {...baseProps} onConfirmPayment={onConfirmPayment} />);

    await userEvent.clear(screen.getByLabelText(/nombre/i));
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Juan');
    await userEvent.clear(screen.getByLabelText(/apellido/i));
    await userEvent.type(screen.getByLabelText(/apellido/i), 'Pérez');
    await userEvent.clear(screen.getByLabelText(/correo electrónico/i));
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'juan@test.com');
    await userEvent.type(screen.getByLabelText(/teléfono/i), '3011234567');
    await userEvent.type(screen.getByLabelText(/número de documento/i), '1234567890');

    const dateInput = screen.getByLabelText(/fecha de nacimiento/i);
    fireEvent.change(dateInput, { target: { value: '1990-01-01' } });

    await userEvent.click(screen.getByRole('button', { name: /confirmar y pagar/i }));

    await waitFor(() => {
      expect(onConfirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Juan',
          apellido: 'Pérez',
          email: 'juan@test.com',
          precioTotal: baseProps.precioTotal,
        })
      );
    });
  });

  it('indicates included extras for first class seats and handles back navigation', async () => {
    render(
      <PaymentForm
        {...baseProps}
        selectedSeat={{ id: '1A', clase: 'PRIMERA_CLASE', precio: 750000 }}
        extrasSeleccionados={{ asistenciaEspecial: true }}
      />
    );

    expect(screen.getAllByText(/incluido/i).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(baseProps.onBack).toHaveBeenCalled();
  });
});
