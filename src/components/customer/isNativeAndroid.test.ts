import { beforeEach, describe, expect, it, vi } from "vitest";

const bridge = vi.hoisted(() => ({
  native: true,
  platform: "android",
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => bridge.native,
    getPlatform: () => bridge.platform,
  },
  registerPlugin: () => ({ applyDark: vi.fn() }),
}));

vi.mock("@capacitor/google-maps", () => ({
  GoogleMap: { create: vi.fn() },
  LatLngBounds: class {},
}));

import { isNativeAndroid } from "./NativeBookingMap";

describe("isNativeAndroid", () => {
  beforeEach(() => {
    bridge.native = true;
    bridge.platform = "android";
  });

  it("is true on the Android app", () => {
    expect(isNativeAndroid()).toBe(true);
  });

  it("is false on iOS so the native Google Maps plugin is never called there", () => {
    bridge.platform = "ios";
    expect(isNativeAndroid()).toBe(false);
  });

  it("is false in the browser", () => {
    bridge.native = false;
    bridge.platform = "web";
    expect(isNativeAndroid()).toBe(false);
  });
});
