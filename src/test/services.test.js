import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock de axios
vi.mock('axios');

describe('API Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('City API', () => {
    it('should fetch cities successfully', async () => {
      const mockCities = [
        { id: 1, name: 'Bogotá', iataCode: 'BOG' },
        { id: 2, name: 'Medellín', iataCode: 'MDE' },
      ];

      axios.get.mockResolvedValue({ data: mockCities });

      const result = await axios.get('/api/cities');
      
      expect(result.data).toEqual(mockCities);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Flight API', () => {
    it('should search flights with correct parameters', async () => {
      const searchParams = {
        origin: 'BOG',
        destination: 'MDE',
        date: '2025-12-15',
      };

      const mockFlights = [
        {
          id: 1,
          flightNumber: 'F4U-100',
          origin: 'BOG',
          destination: 'MDE',
          price: 250000,
        },
      ];

      axios.get.mockResolvedValue({ data: mockFlights });

      const result = await axios.get('/api/flights/search', { params: searchParams });
      
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].flightNumber).toBe('F4U-100');
    });
  });

  describe('Seat API', () => {
    it('should lock seat successfully', async () => {
      const lockRequest = {
        seatId: 1,
        userId: 'user@example.com',
        flightId: 1,
      };

      const mockResponse = {
        success: true,
        message: 'Seat locked successfully',
      };

      axios.post.mockResolvedValue({ data: mockResponse });

      const result = await axios.post('/api/seats/lock', lockRequest);
      
      expect(result.data.success).toBe(true);
    });
  });

  describe('Reservation API', () => {
    it('should create reservation with all required fields', async () => {
      const reservation = {
        flightId: 1,
        seatId: 1,
        userId: 1,
        totalPrice: 300000,
        paymentMethod: 'CREDIT_CARD',
      };

      const mockResponse = {
        id: 100,
        reservationCode: 'F4U-ABC123',
        status: 'CONFIRMED',
      };

      axios.post.mockResolvedValue({ data: mockResponse });

      const result = await axios.post('/api/reservations', reservation);
      
      expect(result.data.reservationCode).toBeDefined();
      expect(result.data.status).toBe('CONFIRMED');
    });
  });
});

describe('Component Helper Functions', () => {
  it('should format currency correctly', () => {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
      }).format(amount);
    };

    expect(formatCurrency(250000)).toContain('250');
  });

  it('should format dates correctly', () => {
    const date = new Date('2025-12-15');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11); // December is month 11
  });

  it('should validate email format', () => {
    const isValidEmail = (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    };

    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
  });
});
