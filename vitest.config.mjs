import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

if (process.platform === 'win32') {
  const normalizedCwd = process.cwd().replace(/^[A-Z]:/, (drive) => drive.toLowerCase());
  if (normalizedCwd !== process.cwd()) {
    // Keep vitest internals from generating duplicate coverage entries per drive letter.
    process.chdir(normalizedCwd);
  }
}

const coverageTargets = [
  'src/components/**/*.jsx',
  'src/services/api.js',
];

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      all: false,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: coverageTargets,
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.spec.js',
        '**/*.test.js',
        'vite.config.js',
        'src/main.jsx',
        'src/authConfig.js',
        'src/authConfig.example.js',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
