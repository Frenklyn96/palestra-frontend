import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Impostato a 1000 KB per evitare l'avviso
  },
  optimizeDeps: {
    include: ['@mui/material', '@mui/icons-material'],
  },
});
