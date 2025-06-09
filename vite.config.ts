import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

export default defineConfig({
  plugins: [react()],
  
  root: 'client', 
  
  build: {
    outDir: '../dist', 
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      // Este alias es para las importaciones dentro del frontend
      "@": path.resolve(__dirname, "client/src"),
      // Este alias le enseña a Vite a encontrar tu código compartido
      "@shared": path.resolve(__dirname, "drizzle"),
    },
  },
})
