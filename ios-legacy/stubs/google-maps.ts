// The Xcode 14.2 shell does not register the native Google Maps plugin.
// The real package calls the plugin at import time, which throws
// "CapacitorGoogleMaps plugin is not implemented on ios" before any platform
// check runs. This stub keeps the shared web code importable; the app uses
// browser maps on iOS (see isNativeAndroid()).

export class LatLngBounds {
  constructor(public readonly bounds: unknown) {}
}

export enum MapType {
  Normal = "Normal",
  Hybrid = "Hybrid",
  Satellite = "Satellite",
  Terrain = "Terrain",
  None = "None",
}

export class GoogleMap {
  static async create(): Promise<GoogleMap> {
    throw new Error("Native Google Maps is not available in the iOS shell");
  }
}
