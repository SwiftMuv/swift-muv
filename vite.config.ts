import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// The Android WebView serves the bundled app from a local origin that does not
// answer CORS preflights. Vite marks its <link>/<script> tags with
// `crossorigin`, which makes the WebView drop the stylesheet and render the app
// completely unstyled. Strip the attribute from the built HTML.
const stripCrossorigin = (): Plugin => ({
  name: "strip-crossorigin",
  enforce: "post",
  transformIndexHtml(html) {
    return html.replace(/\s+crossorigin(=".*?")?/g, "");
  },
});


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), stripCrossorigin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
