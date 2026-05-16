import { FC, useMemo, useState } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { WebView, WebViewMessageEvent } from "react-native-webview"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface MapCoordinate {
  latitude: number
  longitude: number
}

interface RouteSummary {
  distanceMeters: number
  durationSeconds: number
}

interface ReliefDirectionsMapProps {
  origin: MapCoordinate
  destination: MapCoordinate
  originLabel?: string
  destinationLabel?: string
  onRouteError?: (message: string) => void
  onRouteReady?: (summary: RouteSummary) => void
}

type MapMessage =
  | {
      type: "route-ready"
      distanceMeters: number
      durationSeconds: number
    }
  | {
      type: "route-error"
      message: string
    }

function buildDirectionsMapHtml({
  origin,
  destination,
  originLabel,
  destinationLabel,
}: Required<
  Pick<ReliefDirectionsMapProps, "origin" | "destination" | "originLabel" | "destinationLabel">
>) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        background: #e7eef4;
      }

      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .map-label {
        background: rgba(15, 23, 42, 0.88);
        border-radius: 999px;
        border: none;
        color: #f8fafc;
        font-size: 12px;
        padding: 4px 10px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
      }

      .leaflet-control-attribution {
        background: rgba(255, 255, 255, 0.9);
        border-radius: 8px 0 0 0;
        padding: 4px 6px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const origin = [${origin.latitude}, ${origin.longitude}]
      const destination = [${destination.latitude}, ${destination.longitude}]
      const originLabel = ${JSON.stringify(originLabel)}
      const destinationLabel = ${JSON.stringify(destinationLabel)}

      function postMessage(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload))
        }
      }

      const map = L.map("map", {
        zoomControl: false,
        attributionControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map)

      const fallbackBounds = L.latLngBounds([origin, destination])
      map.fitBounds(fallbackBounds.pad(0.25))

      const originMarker = L.circleMarker(origin, {
        radius: 8,
        color: "#1d4ed8",
        weight: 3,
        fillColor: "#60a5fa",
        fillOpacity: 1,
      }).addTo(map)

      const destinationMarker = L.circleMarker(destination, {
        radius: 8,
        color: "#b91c1c",
        weight: 3,
        fillColor: "#f87171",
        fillOpacity: 1,
      }).addTo(map)

      originMarker.bindTooltip(originLabel, {
        permanent: false,
        direction: "top",
        className: "map-label",
      })
      destinationMarker.bindTooltip(destinationLabel, {
        permanent: false,
        direction: "top",
        className: "map-label",
      })

      const routeUrl =
        "https://router.project-osrm.org/route/v1/driving/" +
        origin[1] +
        "," +
        origin[0] +
        ";" +
        destination[1] +
        "," +
        destination[0] +
        "?overview=full&geometries=geojson"

      fetch(routeUrl)
        .then((response) => response.json())
        .then((payload) => {
          const route = payload && payload.routes && payload.routes[0]
          if (!route || !route.geometry) {
            throw new Error("Route guidance is unavailable.")
          }

          const routeLayer = L.geoJSON(route.geometry, {
            style: {
              color: "#2563eb",
              opacity: 0.85,
              weight: 5,
            },
          }).addTo(map)

          map.fitBounds(routeLayer.getBounds().pad(0.18))
          postMessage({
            type: "route-ready",
            distanceMeters: route.distance,
            durationSeconds: route.duration,
          })
        })
        .catch((error) => {
          postMessage({
            type: "route-error",
            message:
              (error && error.message) || "Route guidance is temporarily unavailable.",
          })
        })
    </script>
  </body>
</html>`
}

export const ReliefDirectionsMap: FC<ReliefDirectionsMapProps> = ({
  origin,
  destination,
  originLabel = "Current location",
  destinationLabel = "Reported location",
  onRouteError,
  onRouteReady,
}) => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const [mapError, setMapError] = useState<string | null>(null)

  const html = useMemo(
    () =>
      buildDirectionsMapHtml({
        origin,
        destination,
        originLabel,
        destinationLabel,
      }),
    [destination, destinationLabel, origin, originLabel],
  )

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as MapMessage

      if (message.type === "route-ready") {
        setMapError(null)
        onRouteReady?.({
          distanceMeters: message.distanceMeters,
          durationSeconds: message.durationSeconds,
        })
        return
      }

      const routeErrorMessage = message.message || "Route guidance is temporarily unavailable."
      setMapError(routeErrorMessage)
      onRouteError?.(routeErrorMessage)
    } catch {
      const routeErrorMessage = "We couldn't parse the latest route update."
      setMapError(routeErrorMessage)
      onRouteError?.(routeErrorMessage)
    }
  }

  return (
    <View style={themed($container)}>
      <View style={themed($mapFrame)}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={$webView}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          setSupportMultipleWindows={false}
        />
      </View>

      <View style={themed($legendRow)}>
        <View style={$legendItem}>
          <View style={[themed($legendDot), { backgroundColor: colors.statusInfo }]} />
          <Text text="Responder" size="xxs" style={{ color: colors.textSecondary }} />
        </View>
        <View style={$legendItem}>
          <View style={[themed($legendDot), { backgroundColor: colors.error }]} />
          <Text text="Incident" size="xxs" style={{ color: colors.textSecondary }} />
        </View>
      </View>

      <Text
        text={
          mapError
            ? mapError
            : "OpenStreetMap route guidance updates automatically from your current location."
        }
        size="xxs"
        style={[themed($helperText), { color: mapError ? colors.error : colors.textTertiary }]}
      />
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $mapFrame: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 260,
  overflow: "hidden",
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.palette.neutral200,
})

const $webView: ViewStyle = {
  flex: 1,
}

const $legendRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
})

const $legendItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
}

const $legendDot: ThemedStyle<ViewStyle> = () => ({
  width: 10,
  height: 10,
  borderRadius: 5,
})

const $helperText: ThemedStyle<TextStyle> = () => ({
  lineHeight: 18,
})
