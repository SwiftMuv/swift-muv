import { defineConfig, mergeConfig } from "vite";
import path from "node:path";
import baseConfig from "../vite.config";

// Build the same application with the runtime matching the isolated iOS shell.
export default defineConfig((env) => {
  const legacyRoot = path.resolve(__dirname);
  const packages = ["core", "geolocation", "local-notifications", "push-notifications"];
  const aliases: Record<string, string> = Object.fromEntries(packages.map((name) => [
    `@capacitor/${name}`,
    path.join(legacyRoot, "node_modules", "@capacitor", name, "dist", ...(name === "core" ? [] : ["esm"]), "index.js"),
  ]));
  // Native Google Maps is not registered on iOS and its package calls the plugin on import.
  aliases["@capacitor/google-maps"] = path.join(legacyRoot, "stubs", "google-maps.ts");
  const base = typeof baseConfig === "function" ? baseConfig(env) : baseConfig;
  return mergeConfig(base, {
    resolve: { alias: aliases },
    define: { "import.meta.env.VITE_PUSH_ENABLED": JSON.stringify("false") },
    build: { outDir: path.join(legacyRoot, "dist"), emptyOutDir: true },
  });
});
