import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('plotly.js-dist-min')) {
              return 'plotly'; // Separate Plotly into its own chunk
            }
            if (id.includes('aos')) {
              return 'aos'; // Separate AOS into its own chunk
            }
            return 'vendor'; // Group other node_modules (Ionic, React, etc.)
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1000kB to suppress Plotly warning
  },
});