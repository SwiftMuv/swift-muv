import { describe, it, expect } from "vitest";
import { acceptsMapMessage, HOSTED_MAP_ORIGIN, parseMapState, usesHostedMap } from "./hostedMapProtocol";
const state = { pickup: { lat: 43.65, lng: -79.38 }, dropoff: null, driver: null, routePath: [], fitMode: "always", showLiveBadge: false };
describe("isolated iPhone map", () => {
  it("selects hosting only for iOS, preserving Android and web maps", () => {
    expect(usesHostedMap("ios")).toBe(true);
    expect(usesHostedMap("android")).toBe(false);
    expect(usesHostedMap("web")).toBe(false);
  });
  it("rejects invalid coordinates and oversized paths", () => {
    expect(parseMapState({ ...state, pickup: { lat: 91, lng: 0 } })).toBeNull();
    expect(parseMapState({ ...state, driver: { lat: 0, lng: Infinity } })).toBeNull();
    expect(parseMapState({ ...state, routePath: Array(10001).fill(state.pickup) })).toBeNull();
    expect(parseMapState(state)?.pickup).toEqual({ lat: 43.65, lng: -79.38 });
  });
  it("strips account details rather than forwarding them", () => {
    const safe = parseMapState({ ...state, token: "not-a-token", bookingId: "private", pickup: { ...state.pickup, name: "private" } });
    expect(safe).toEqual(state);
  });
  it("accepts iframe responses only from the exact window, HTTPS origin, and channel", () => {
    const frame = {};
    const event = { source: frame, origin: HOSTED_MAP_ORIGIN, data: { channel: "nonce" } };
    expect(acceptsMapMessage(event, frame, "nonce", false)).toBe(true);
    expect(acceptsMapMessage({ ...event, origin: "https://example.com" }, frame, "nonce", false)).toBe(false);
    expect(acceptsMapMessage(event, {}, "nonce", false)).toBe(false);
    expect(acceptsMapMessage(event, frame, "wrong", false)).toBe(false);
  });
  it("checks local iPhone parent window and nonce even for opaque origins", () => {
    const parent = {};
    const event = { source: parent, origin: "null", data: { channel: "nonce" } };
    expect(acceptsMapMessage(event, parent, "nonce", true)).toBe(true);
    expect(acceptsMapMessage(event, {}, "nonce", true)).toBe(false);
    expect(acceptsMapMessage({ ...event, origin: "https://example.com" }, parent, "nonce", true)).toBe(false);
  });
});