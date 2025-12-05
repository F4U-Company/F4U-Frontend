import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SeatSelector from '../../components/SeatSelector';

const apiMocks = vi.hoisted(() => ({
  getSeatsByFlight: vi.fn(),
  lockSeat: vi.fn(),
  releaseLock: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  seatAPI: {
    getSeatsByFlight: apiMocks.getSeatsByFlight,
  },
  seatLockAPI: {
    lockSeat: apiMocks.lockSeat,
    releaseLock: apiMocks.releaseLock,
  },
}));

vi.mock('@stomp/stompjs', () => ({
  Client: class {
    constructor(options) {
      this.options = options;
    }
    activate() {
      if (this.options?.onConnect) {
        this.options.onConnect();
      }
    }
    subscribe() {
      return { unsubscribe() {} };
    }
    deactivate() {}
  },
}));

vi.mock('sockjs-client/dist/sockjs.min.js', () => ({
  __esModule: true,
  default: vi.fn(() => ({})),
}));

describe('SeatSelector component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    const baseSeats = [
      {
        numeroAsiento: '1A',
        disponible: true,
        locked: false,
        lockedByUserId: null,
        remainingLockSeconds: 0,
        id: 'db-seat-1A',
        precio: 100,
        clase: 'PRIMERA_CLASE',
      },
      {
        numeroAsiento: '1B',
        disponible: true,
        locked: true,
        lockedByUserId: 'other-user',
        remainingLockSeconds: 30,
        id: 'db-seat-1B',
        precio: 100,
        clase: 'PRIMERA_CLASE',
      },
    ];

    apiMocks.getSeatsByFlight.mockResolvedValue({ data: baseSeats });
    apiMocks.lockSeat.mockResolvedValue({ data: { success: true } });
    apiMocks.releaseLock.mockResolvedValue({ data: { success: true } });
  });

  it('allows selecting an available seat and locks it through the API', async () => {
    const onSelect = vi.fn();
    const onSeatLocked = vi.fn();

    render(
      <SeatSelector
        flightId="AB123"
        onSelect={onSelect}
        onSeatLocked={onSeatLocked}
      />
    );

    const seatButton = await screen.findByRole('button', {
      name: /Asiento 1A disponible/i,
    });
    await userEvent.click(seatButton);

    await waitFor(() => {
      expect(apiMocks.lockSeat).toHaveBeenCalledWith('db-seat-1A', expect.any(String));
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '1A' }));
      expect(onSeatLocked).toHaveBeenCalledWith('db-seat-1A');
    });
  });

  it('disables seats that are locked by another user', async () => {
    render(<SeatSelector flightId="AB123" />);

    const lockedSeat = await screen.findByRole('button', {
      name: /Asiento 1B bloqueado/i,
    });
    expect(lockedSeat).toBeDisabled();
  });

  it('releases the locked seat when the same seat is clicked again', async () => {
    const onSelect = vi.fn();

    render(<SeatSelector flightId="AB123" onSelect={onSelect} />);

    const seatButton = await screen.findByRole('button', {
      name: /Asiento 1A disponible/i,
    });

    await userEvent.click(seatButton);
    await waitFor(() => expect(apiMocks.lockSeat).toHaveBeenCalled());

    await userEvent.click(seatButton);
    await waitFor(() => expect(apiMocks.releaseLock).toHaveBeenCalledWith('db-seat-1A'));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('restores seats locked by the same user session', async () => {
    sessionStorage.setItem('userSessionId', 'user-known');
    const lockedSeat = {
      numeroAsiento: '2A',
      disponible: true,
      locked: true,
      lockedByUserId: 'user-known',
      remainingLockSeconds: 420,
      id: 'db-seat-2A',
      precio: 120,
      clase: 'PRIMERA_CLASE',
    };
    apiMocks.getSeatsByFlight.mockResolvedValueOnce({ data: [lockedSeat] });

    const onSelect = vi.fn();
    const onSeatLocked = vi.fn();

    render(
      <SeatSelector
        flightId="CD456"
        onSelect={onSelect}
        onSeatLocked={onSeatLocked}
      />
    );

    const restoredSeat = await screen.findByRole('button', {
      name: /Asiento 2A bloqueado/i,
    });
    expect(restoredSeat).toHaveAttribute('aria-pressed', 'true');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '2A' }));
    expect(onSeatLocked).toHaveBeenCalledWith('db-seat-2A');
  });
});
