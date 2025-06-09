import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

export default defineConfig({
  plugins: [react()],

  // Corregimos a 'client' para que coincida con el nombre real de la carpeta.
  root: 'client',

  resolve: {
    alias: {
      // Corregimos también aquí a 'client/src'
      "@": path.resolve(__dirname, "client/src"),
    },
  },

  build: {
    // La salida se genera en una carpeta 'dist' en la raíz del proyecto.
    outDir: '../dist',
    emptyOutDir: true,
  },
})
