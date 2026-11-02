// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import legacyConfig from "../../ios-legacy/vite.config";

const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), "utf8");
const legacy = JSON.parse(read("ios-legacy/package.json"));
const native = JSON.parse(read("ios-legacy/capacitor.config.json"));

describe("isolated Xcode 14.2 support", () => {
  it("resolves the Capacitor 5 core entry separately from plugin entry points", async () => {
    const env = { command: "build" as const, mode: "ios-legacy" };
    const config = await (typeof legacyConfig === "function" ? legacyConfig(env) : legacyConfig);
    const aliases = config.resolve?.alias;
    if (!aliases || Array.isArray(aliases)) throw new Error("Expected isolated iOS aliases");
    expect(aliases["@capacitor/core"]).toBe(path.resolve("ios-legacy/node_modules/@capacitor/core/dist/index.js"));
    for (const name of ["geolocation", "google-maps", "local-notifications", "push-notifications"]) {
      expect(aliases[`@capacitor/${name}`]).toBe(path.resolve(`ios-legacy/node_modules/@capacitor/${name}/dist/esm/index.js`));
    }
  });

  it("uses the Capacitor 5 iOS runtime instead of the incompatible current runtime", () => {
    expect(legacy.dependencies["@capacitor/core"]).toBe("5.7.8");
    expect(legacy.dependencies["@capacitor/ios"]).toBe("5.7.8");
    expect(legacy.devDependencies["@capacitor/cli"]).toBe("5.7.8");
  });

  it("never falls back to the root Capacitor CLI for iOS sync or open", () => {
    expect(legacy.scripts.sync).toBe("node ./node_modules/@capacitor/cli/bin/capacitor sync ios");
    expect(legacy.scripts.open).toBe("node ./node_modules/@capacitor/cli/bin/capacitor open ios");
  });

  it("links the CocoaPods workspace rather than a newer CapApp-SPM package", () => {
    const project = read("ios-legacy/ios/App/App.xcodeproj/project.pbxproj");
    expect(project).not.toContain("CapApp-SPM");
    expect(project).not.toContain("XCSwiftPackageProductDependency");
    expect(project).toContain("Pods_App.framework in Frameworks");
    expect(read("ios-legacy/ios/App/App.xcworkspace/contents.xcworkspacedata"))
      .toContain('location = "group:Pods/Pods.xcodeproj"');
    expect(read("ios-legacy/ios/App/Podfile"))
      .toContain("pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'");
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