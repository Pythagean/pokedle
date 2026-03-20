
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/pokedle/' : '/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
}));
