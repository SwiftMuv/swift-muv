import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), "utf8");
const legacy = JSON.parse(read("ios-legacy/package.json"));
const native = JSON.parse(read("ios-legacy/capacitor.config.json"));

describe("isolated Xcode 14.2 support", () => {
  it("uses the Capacitor 5 iOS runtime instead of the incompatible current runtime", () => {
    expect(legacy.dependencies["@capacitor/core"]).toBe("5.7.8");
    expect(legacy.dependencies["@capacitor/ios"]).toBe("5.7.8");
    expect(legacy.devDependencies["@capacitor/cli"]).toBe("5.7.8");
  });

  it("preserves the existing Android Capacitor 8 dependency", () => {
    const root = JSON.parse(read("package.json"));
    expect(root.dependencies["@capacitor/android"]).toBe("^8.4.0");
    expect(root.dependencies["@capacitor/core"]).toBe("^8.4.0");
  });

  it("keeps the registered application identity aligned", () => {
    expect(native.appId).toBe("com.swiftmuv.app");
    expect(read("ios-legacy/ios/App/App.xcodeproj/project.pbxproj"))
      .toContain("PRODUCT_BUNDLE_IDENTIFIER = com.swiftmuv.app;");
  });

  it("loads only the Xcode-compatible native location and local alerts", () => {
    expect(native.includePlugins).toEqual(["@capacitor/geolocation", "@capacitor/local-notifications"]);
  });

  it("bundles local assets instead of a preview URL", () => {
    expect(native.webDir).toBe("dist");
    expect(native.server?.url).toBeUndefined();
  });
});