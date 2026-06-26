import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  },
  css: { modules: { generateScopedName: '[local]' } },
  resolve: {
    alias: {
      // Ignore CSS imports in unit tests to avoid PostCSS pipeline
      '\\.(css|module\\.css)$': './vitest.css.stub'
    }
  },
  plugins: [
    {
      name: 'ignore-postcss-config',
      config() {
        return { css: { postcss: { plugins: [] } } };
      }
    }
  ]
});
