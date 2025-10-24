import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use BASE_PATH env if provided, else default to '/'
const base = process.env.BASE_PATH && process.env.BASE_PATH !== '' ? process.env.BASE_PATH : '/';

export default defineConfig({
  base,
  plugins: [react()],
});

