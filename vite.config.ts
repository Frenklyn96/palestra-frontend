import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json";

export default defineConfig({
  base: "./", // Importante per Electron in produzione
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Impostato a 1000 KB per evitare l'avviso
  },
  optimizeDeps: {
    include: ["@mui/material", "@mui/icons-material"],
  },
});
