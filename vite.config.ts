import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

export default defineConfig({
  plugins: [react()],
  
  // Vite buscará el código fuente del frontend en la carpeta 'client'
  root: 'client', 
  
  build: {
    // Cuando Vite construya, sacará el resultado a una carpeta 'dist' 
    // en la raíz del proyecto (fuera de 'client').
    outDir: '../dist', 
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },
})
