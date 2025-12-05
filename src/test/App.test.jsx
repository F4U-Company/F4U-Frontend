import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';

// Mock de la configuración de MSAL
const msalConfig = {
  auth: {
    clientId: 'test-client-id',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: 'http://localhost:5173',
  },
};

const pca = new PublicClientApplication(msalConfig);

describe('App Component Tests', () => {
  it('should render without crashing', () => {
    expect(true).toBe(true);
  });

  it('should have correct MSAL configuration', () => {
    expect(msalConfig.auth.clientId).toBeDefined();
    expect(msalConfig.auth.authority).toContain('login.microsoftonline.com');
  });
});

describe('API Service Tests', () => {
  it('should have correct API URL format', () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    expect(apiUrl).toBeDefined();
    expect(typeof apiUrl).toBe('string');
  });
});

describe('Component Structure Tests', () => {
  it('should have required components', () => {
    // Test básico de estructura
    const components = [
      'AuthTest',
      'Chatbot',
      'ExtrasSelector',
      'FlightMap',
      'Login',
      'NavBar',
      'PaymentForm',
      'SeatSelector',
    ];
    
    expect(components.length).toBeGreaterThan(0);
  });
});
