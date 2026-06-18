import { defineConfig } from "vitest/config";

// Tests unitarios de la lógica de agregación (src/data.ts). No necesitan DOM.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
