import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // three/examples/jsm imports "three" itself; without dedupe the loader ends
  // up with a second copy and cross-instance instanceof checks fail.
  resolve: { dedupe: ["three"] },
  // Honour PORT so a second session can preview the app concurrently.
  server: { port: Number(process.env.PORT) || 5173 },
  build: { target: "es2022", chunkSizeWarningLimit: 1200 },
});
