import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // 1. Dejamos solo el plugin de React. Los de Replit se van.
  plugins: [react()],

  // 2. Corregimos 'client' a 'Client' para que coincida con el nombre real de tu carpeta.
  //    Esto es fundamental.
  root: 'Client',

  resolve: {
    // 3. Mantenemos tu alias principal para que las importaciones como "@/components/..." sigan funcionando.
    alias: {
      "@": path.resolve(__dirname, "Client/src"),
    },
  },

  build: {
    // 4. Simplificamos la salida a una carpeta 'dist' en la raíz del proyecto.
    //    La sintaxis '../dist' le dice que suba un nivel desde 'Client' y cree 'dist' allí.
    outDir: '../dist',
    emptyOutDir: true,
  },
});
