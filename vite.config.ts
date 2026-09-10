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
  generateBundle(_options, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type === "asset" && file.fileName.endsWith(".html") && typeof file.source === "string") {
        file.source = file.source.replace(/\s+crossorigin(="[^"]*")?/g, "");
      }
    }
  },
});

// Some WebView builds still refuse to load the external stylesheet (CORS on the
// local asset origin), which renders the app completely unstyled on device.
// Inlining the CSS into the HTML removes that failure mode entirely and keeps
// the result identical on macOS and Windows builds.
const inlineStyles = (): Plugin => ({
  name: "inline-styles",
  enforce: "post",
  generateBundle(_options, bundle) {
    const cssFiles = Object.values(bundle).filter(
      (file): file is typeof file & { type: "asset"; source: string } =>
        file.type === "asset" && file.fileName.endsWith(".css") && typeof file.source === "string",
    );
    if (!cssFiles.length) return;

    for (const file of Object.values(bundle)) {
      if (file.type !== "asset" || !file.fileName.endsWith(".html") || typeof file.source !== "string") continue;
      let html = file.source;
      for (const css of cssFiles) {
        const linkPattern = new RegExp(
          `<link[^>]+href="[^"]*${css.fileName.split("/").pop()!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
          "g",
        );
        html = html.replace(linkPattern, "");
      }
      const styles = cssFiles.map((css) => `<style>${css.source}</style>`).join("\n");
      html = html.replace("</head>", `${styles}\n</head>`);
      file.source = html;
    }

    for (const css of cssFiles) delete bundle[css.fileName];
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
  plugins: [react(), stripCrossorigin(), inlineStyles(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
