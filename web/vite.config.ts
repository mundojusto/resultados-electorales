import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" para que funcione en cualquier hosting estático (incl. subcarpetas
// como GitHub Pages). Si se publica en un subpath fijo, puede ajustarse aquí.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
