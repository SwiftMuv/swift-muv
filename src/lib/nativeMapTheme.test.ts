import { beforeEach, describe, expect, it, vi } from "vitest";

const bridge = vi.hoisted(() => ({
  native: true,
  platform: "android",
  applyDark: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => bridge.native,
    getPlatform: () => bridge.platform,
  },
  registerPlugin: () => ({ applyDark: bridge.applyDark }),
}));

import { applyNativeBookingMapDarkTheme } from "./nativeMapTheme";

describe("native booking map dark theme", () => {
  beforeEach(() => {
    bridge.native = true;
    bridge.platform = "android";
    bridge.applyDark.mockClear();
  });

  it("selects dark styling for the existing Android booking map", async () => {
    await applyNativeBookingMapDarkTheme("swiftmuv-booking-map");
    expect(bridge.applyDark).toHaveBeenCalledExactlyOnceWith({ id: "swiftmuv-booking-map" });
  });

  it("does not change browser maps", async () => {
    bridge.native = false;
    bridge.platform = "web";
    await applyNativeBookingMapDarkTheme("swiftmuv-booking-map");
    expect(bridge.applyDark).not.toHaveBeenCalled();
  });

  it("does not call the Android bridge on iOS", async () => {
    bridge.platform = "ios";
    await applyNativeBookingMapDarkTheme("swiftmuv-booking-map");
    expect(bridge.applyDark).not.toHaveBeenCalled();
  });
});