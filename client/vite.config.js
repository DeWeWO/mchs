import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          map: ['maplibre-gl', '@mapbox/mapbox-gl-draw', '@turf/turf'],
          charts: ['chart.js', 'react-chartjs-2'],
          reports: ['jspdf', 'jspdf-autotable', 'write-excel-file/browser', 'html-to-image'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
