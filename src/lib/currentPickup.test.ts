import { describe, expect, it } from "vitest";
import { currentPickupValue } from "./currentPickup";

describe("current-location pickup", () => {
  it("keeps the actual GPS coordinates usable when street lookup is unavailable", () => {
    expect(currentPickupValue({ lat: 43.6532, lng: -79.3832 }, null))
      .toBe("43.653200, -79.383200");
  });
  it("uses the resolved street address when available", () => {
    expect(currentPickupValue({ lat: 43.6532, lng: -79.3832 }, " 100 Queen St W, Toronto "))
      .toBe("100 Queen St W, Toronto");
  });
});