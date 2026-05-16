import * as Location from "expo-location"

const LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000
const CURRENT_POSITION_TIMEOUT_MS = 6 * 1000

type DeviceLocationResult = Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise.then(
      (value) => {
        clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

export async function getFastDeviceLocation(): Promise<DeviceLocationResult | null> {
  const recentLastKnown = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
    requiredAccuracy: 300,
  })

  if (recentLastKnown) {
    return recentLastKnown
  }

  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      CURRENT_POSITION_TIMEOUT_MS,
    )
  } catch {
    return Location.getLastKnownPositionAsync()
  }
}
