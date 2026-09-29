import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://noir-hub.noir-cpu.workers.dev",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  devToolbar: { enabled: false },
});
