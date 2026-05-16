/**
 * Map View Data Adapter
 *
 * Transforms FE map API responses into mobile map view models.
 * Includes fallback handling for unsupported map provider features.
 */

export interface MapMarker {
  id: string
  latitude: number
  longitude: number
  title: string
  description?: string
}

export interface MapViewport {
  centerLatitude: number
  centerLongitude: number
  zoomLevel: number
}

export interface MapViewModel {
  viewport: MapViewport
  markers: MapMarker[]
  hasBaseLayer: boolean
  timestamp: string
}

/**
 * Default viewport for Vietnam (center of Vietflood focus area)
 */
const DEFAULT_VIEWPORT: MapViewport = {
  centerLatitude: 16.0,
  centerLongitude: 107.0,
  zoomLevel: 6,
}

/**
 * Adapter to transform FE map API response to mobile map view model
 */
export function adaptMapData(feResponse: unknown): MapViewModel {
  const data = typeof feResponse === "object" && feResponse ? feResponse : {}
  const {
    centerLatitude = DEFAULT_VIEWPORT.centerLatitude,
    centerLongitude = DEFAULT_VIEWPORT.centerLongitude,
    zoomLevel = DEFAULT_VIEWPORT.zoomLevel,
    markers = [],
    hasBaseLayer = true,
  } = data as any

  // Validate and normalize markers
  const normalizedMarkers: MapMarker[] = Array.isArray(markers)
    ? markers
        .filter((m) => typeof m === "object" && m !== null)
        .map((m) => ({
          id: String(m.id || Math.random()),
          latitude: Number(m.latitude) || 0,
          longitude: Number(m.longitude) || 0,
          title: String(m.title || "Location"),
          description: m.description ? String(m.description) : undefined,
        }))
    : []

  return {
    viewport: {
      centerLatitude: Number(centerLatitude) || DEFAULT_VIEWPORT.centerLatitude,
      centerLongitude: Number(centerLongitude) || DEFAULT_VIEWPORT.centerLongitude,
      zoomLevel: Math.max(1, Math.min(20, Number(zoomLevel) || DEFAULT_VIEWPORT.zoomLevel)),
    },
    markers: normalizedMarkers,
    hasBaseLayer: Boolean(hasBaseLayer),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Mock map data for testing/development
 */
export function getMockMapData(): MapViewModel {
  return adaptMapData({
    centerLatitude: 16.0,
    centerLongitude: 107.0,
    zoomLevel: 6,
    markers: [
      {
        id: "flood-1",
        latitude: 16.5,
        longitude: 107.2,
        title: "Flood Zone A",
        description: "High risk area",
      },
      {
        id: "flood-2",
        latitude: 15.8,
        longitude: 106.8,
        title: "Flood Zone B",
        description: "Moderate risk area",
      },
      {
        id: "relief-center",
        latitude: 16.0,
        longitude: 107.0,
        title: "Relief Center",
        description: "Operation base",
      },
    ],
    hasBaseLayer: true,
  })
}
