// we always make sure 'react-native' gets included first
// eslint-disable-next-line no-restricted-imports
import * as ReactNative from "react-native"

import mockFile from "./mockFile"

delete (globalThis as { fetch?: unknown }).fetch

// libraries to mock
jest.mock("react-native-reanimated", () => {
  const animation = {
    delay: jest.fn(() => animation),
    damping: jest.fn(() => animation),
    duration: jest.fn(() => animation),
    mass: jest.fn(() => animation),
    reduceMotion: jest.fn(() => animation),
    springify: jest.fn(() => animation),
    stiffness: jest.fn(() => animation),
  }
  const Animated = {
    FlatList: "FlatList",
    Image: "Image",
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    Text: "Text",
    View: "View",
    createAnimatedComponent: (Component) => Component,
  }

  return {
    __esModule: true,
    default: Animated,
    BounceIn: animation,
    FadeIn: animation,
    FadeInDown: animation,
    FadeInUp: animation,
    FadeOut: animation,
    LinearTransition: animation,
    ReduceMotion: {
      System: "system",
      Always: "always",
      Never: "never",
    },
    SlideInLeft: animation,
    ZoomIn: animation,
    cancelAnimation: jest.fn(),
    useAnimatedStyle: jest.fn((factory) => factory()),
    useSharedValue: jest.fn((value) => ({ value })),
    withDelay: jest.fn((_delay, value) => value),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value) => value),
  }
})

jest.mock("@rn-primitives/slot", () => ({
  Text: "Text",
}))

jest.mock("boneyard-js/native", () => ({
  Skeleton: "View",
}))

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useScrollToTop: jest.fn(),
}))

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: "View",
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

jest.mock("react-native-keyboard-controller", () => {
  return {
    KeyboardAwareScrollView: "ScrollView",
  }
})

jest.doMock("react-native", () => {
  // Extend ReactNative
  return Object.setPrototypeOf(
    {
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn((_source) => mockFile), // eslint-disable-line @typescript-eslint/no-unused-vars
        getSize: jest.fn(
          (
            uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
            success: (width: number, height: number) => void,
            failure?: (_error: any) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
          ) => success(100, 100),
        ),
      },
    },
    ReactNative,
  )
})

jest.mock("i18next", () => ({
  currentLocale: "en",
  t: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
  translate: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
}))

jest.mock("expo-localization", () => ({
  ...jest.requireActual("expo-localization"),
  getLocales: () => [{ languageTag: "en-US", textDirection: "ltr" }],
}))

jest.mock("../app/i18n/index.ts", () => ({
  i18n: {
    isInitialized: true,
    language: "en",
    t: (key: string, params: Record<string, string>) => {
      return `${key} ${JSON.stringify(params)}`
    },
    numberToCurrency: jest.fn(),
  },
}))

declare const tron // eslint-disable-line @typescript-eslint/no-unused-vars

declare global {
  let __TEST__: boolean
}
