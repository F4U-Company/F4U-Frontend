import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ExtrasSelector from '../../components/ExtrasSelector';

describe('ExtrasSelector component', () => {
  it('marks every extra as included for first class seats', async () => {
    const onExtrasChange = vi.fn();
    const selectedSeat = { id: '1A', clase: 'PRIMERA_CLASE' };

    render(<ExtrasSelector selectedSeat={selectedSeat} onExtrasChange={onExtrasChange} />);

    await waitFor(() => {
      expect(onExtrasChange).toHaveBeenCalledWith({
        maletaCabina: true,
        maletaBodega: true,
        seguro50: true,
        seguro100: true,
        asistenciaEspecial: true,
      });
    });

    expect(screen.getAllByText('Incluido').length).toBeGreaterThanOrEqual(5);
  });

  it('enforces exclusive selection between insurance extras', async () => {
    const onExtrasChange = vi.fn();
    const selectedSeat = { id: '10C', clase: 'ECONOMICA' };

    render(<ExtrasSelector selectedSeat={selectedSeat} onExtrasChange={onExtrasChange} />);

    const seguro50 = screen.getByText('Seguro Flex 50%');
    await userEvent.click(seguro50);

    await waitFor(() => {
      expect(onExtrasChange).toHaveBeenLastCalledWith(expect.objectContaining({
        seguro50: true,
        seguro100: false,
      }));
    });

    const seguro100 = screen.getByText('Seguro Premium 100%');
    await userEvent.click(seguro100);

    await waitFor(() => {
      expect(onExtrasChange).toHaveBeenLastCalledWith(expect.objectContaining({
        seguro50: false,
        seguro100: true,
      }));
    });
  });
});
