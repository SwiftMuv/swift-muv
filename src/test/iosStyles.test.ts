// @vitest-environment node
import { describe, expect, it } from "vitest";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import path from "node:path";
import config from "../../postcss.config.js";

describe("iOS styles from the legacy working directory", () => {
  it("resolves the shared theme and scans app sources outside the working directory", async () => {
    const original = process.cwd();
    try {
      process.chdir(path.join(original, "ios-legacy"));
      const result = await postcss([tailwindcss(config.plugins.tailwindcss)])
        .process("@tailwind utilities; .probe { @apply border-border; }", { from: undefined });
      expect(result.css).toContain("border-color: hsl(var(--border))");
      expect(result.css).toContain(".bg-background");
    } finally {
      process.chdir(original);
    }
  });
});