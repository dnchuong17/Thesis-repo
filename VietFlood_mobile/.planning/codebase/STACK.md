# Technology Stack

**Analysis Date:** 2024-12-19

## Languages

**Primary:**
- TypeScript ~5.9.2 - Application development, configuration, and utilities
- JavaScript (ES6+) - Build configuration and tooling

## Runtime

**Environment:**
- React Native 0.83.4 - Cross-platform mobile development
- Expo ~55.0.15 - Managed React Native platform with EAS build support
- Node.js >= 20.0.0 (required, configured in `package.json`)

**Package Manager:**
- pnpm 10.33.0+sha512 - Dependency management (exact version in `package.json` packageManager field)
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- React 19.2.0 - UI library
- React Native 0.83.4 - Native mobile framework
- Expo 55.0.15 - Managed React Native platform with native module support

**Navigation:**
- @react-navigation/native 7.0.14 - Core navigation library
- @react-navigation/native-stack 7.2.0 - Stack-based navigation
- @react-navigation/bottom-tabs 7.2.0 - Tab-based navigation
- react-native-drawer-layout 4.0.1 - Drawer navigation

**UI & Styling:**
- NativeWind 4.2.3 - Tailwind CSS for React Native
- Tailwind CSS 3.4.19 - Utility-first CSS framework
- class-variance-authority 0.7.1 - Variant management
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.5.0 - Merge Tailwind classes intelligently

**Component Libraries:**
- @rn-primitives/* (v1.4.0 family) - Comprehensive UI primitives
  - accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible
  - context-menu, dialog, dropdown-menu, hover-card, label, menubar
  - popover, progress, radio-group, select, separator, slot
  - switch, tabs, toggle, toggle-group, tooltip

**Animations & Gestures:**
- react-native-reanimated 4.2.1 - GPU-accelerated animations
- react-native-gesture-handler 2.30.0 - Native gesture handling
- react-native-keyboard-controller 1.20.7 - Keyboard control

**State Management:**
- @reduxjs/toolkit 2.11.2 - Redux with modern API
- react-redux 9.2.0 - React bindings for Redux
- redux 5.0.1 - Predictable state container

**Internationalization (i18n):**
- i18next 23.14.0 - i18n framework
- react-i18next 15.0.1 - React bindings for i18next
- intl-pluralrules 2.0.1 - Plural rules for internationalization

**HTTP & API:**
- apisauce 3.1.1 - API wrapper built on axios with interceptors
  - Used for all REST API communication
  - Token refresh logic implemented in `app/services/api/index.ts`
  - Request/response interceptors for auth headers

**Local Storage:**
- react-native-mmkv 3.3.3 - Fast key-value storage (primary)
  - Fallback to in-memory storage if unavailable
  - Configured in `app/utils/storage/index.ts`
- expo-secure-store 55.0.13 - Secure token storage
  - Stores authentication tokens (access & refresh)
  - User credentials and role information

**Other Utilities:**
- boneyard-js 1.7.7 - Utility library
- date-fns 4.1.0 - Date manipulation and formatting
- lucide-react-native 1.8.0 - Icon library
- react-native-svg 15.15.3 - SVG support
- react-native-heroicons 4.0.0 - Icon library
- react-native-portalize 1.0.7 - Portal/modal rendering
- react-native-web 0.21.0 - Web platform support
- react-native-webview 13.16.0 - WebView component
- react-native-worklets 0.7.2 - Native worklets support
- react-native-edge-to-edge 1.6.1 - Edge-to-edge rendering
- setimmediate 1.0.5 - Polyfill for setImmediate

**Fonts:**
- @expo-google-fonts/mulish 0.4.2 - Mulish font from Google Fonts
- expo-font 55.0.4 - Font loading

**Expo Modules:**
- expo-dev-client 55.0.11 - Custom Expo dev client
- expo-build-properties 55.0.9 - Build property management
- expo-splash-screen 55.0.10 - Splash screen customization
- expo-location 55.1.8 - GPS location services
- expo-image-picker 55.0.19 - Image/camera picker
- expo-localization 55.0.8 - Localization and device locale
- expo-linking 55.0.7 - Deep linking
- expo-application 55.0.8 - Application info
- expo-system-ui 55.0.9 - System UI configuration
- @expo/metro-runtime 55.0.6 - Metro bundler runtime

**Network:**
- @react-native-community/netinfo 11.5.2 - Network information

## Testing

**Framework:**
- Jest ~29.7.0 - Test runner and framework
- jest-expo ~55.0.9 - Expo-specific Jest preset
- @testing-library/react-native 13.2.0 - React Native testing utilities
- react-test-renderer 19.2.0 - React component test renderer
- ts-jest 29.1.1 - TypeScript support in Jest
- babel-jest 29.2.1 - Babel transformation for tests

**Configuration:**
- `jest.config.js` - Main config at root
- Setup file: `test/setup.ts`
- Preset: `jest-expo`

## Build & Dev Tools

**Build:**
- Expo CLI - Integrated through `expo` package
- EAS CLI - Build service (configured in `eas.json`)
- Metro bundler - Default for Expo
- Hermes engine - Configured in `app.json` (jsEngine: "hermes")

**Build Profiles:**
- development (simulator)
- development:device (physical device)
- preview (internal distribution)
- preview:device (preview on device)
- production (app store)

**Compilation:**
- TypeScript compiler (tsc) - Type checking
- Babel 7.20.0 - JavaScript/JSX transpilation
- babel-preset-expo - Expo-optimized Babel preset
- nativewind/babel - Tailwind CSS Babel plugin

**Code Quality:**
- ESLint 8.57.0 - Linting
  - Extends: expo, typescript-eslint, react, react-native, prettier
  - Plugins: reactotron, prettier
- Prettier 3.3.3 - Code formatting
- dependency-cruiser 17.0.2 - Dependency validation
  - Configured in `.dependency-cruiser.js`
  - Generates dependency graph visualization

**Development:**
- Reactotron 2.9.4 - Debugging toolkit
  - reactotron-core-client, reactotron-react-js, reactotron-react-native
  - MMKV plugin for storage debugging
- tsx 4.20.3 - TypeScript execution

## Configuration Files

**Application:**
- `app.json` - Expo app configuration
  - App name, slug, version, orientation
  - iOS/Android specific settings (package IDs, icons)
  - Web bundler config
  - Plugins configuration
  - New Architecture enabled
  - Hermes JS engine enabled

- `app.config.ts` - Dynamic Expo config
  - TypeScript support via tsx/cjs
  - Environment-based configuration
  - Privacy manifests for iOS
  - Handles build profiles (dev, preview, prod)

- `eas.json` - EAS build configuration
  - CLI version requirement (>= 3.15.1)
  - Build profiles: development, development:device, preview, preview:device, production
  - Submit profile for app stores

**Build:**
- `babel.config.js` - Babel configuration
  - Preset: babel-preset-expo with nativewind jsxImportSource
  - Plugin: react-native-reanimated/plugin

- `metro.config.js` - Metro bundler configuration
  - Custom transform options for inline requires
  - Fixed axios/apisauce issue with conditionNames
  - .cjs extension support for Firebase and similar
  - NativeWind integration with global.css

- `tailwind.config.js` - Tailwind CSS configuration
  - Custom color palette (brand colors, semantic colors)
  - Custom spacing scale
  - Mulish font as default sans-serif
  - Custom border-radius variables

- `tsconfig.json` - TypeScript configuration
  - Extends expo/tsconfig.base
  - Strict mode enabled
  - Path aliases: @/* → app/*, @assets/* → assets/*
  - React Native JSX support
  - Bundler module resolution

**Package Management:**
- `package.json` - Dependencies and scripts
- `pnpm-lock.yaml` - Locked dependency versions

**Development:**
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier formatting
- `.eslintignore`, `.prettierignore` - Ignore patterns
- `jest.config.js` - Test configuration
- `nativewind-env.d.ts` - NativeWind type definitions
- `.dependency-cruiser.js` - Dependency rules (implied)

## Platform Requirements

**Development:**
- Node.js >= 20.0.0
- npm or pnpm for package management
- Expo CLI and EAS CLI
- iOS: Xcode 15+, cocoapods
- Android: Android Studio, Java 11+
- Git for version control

**Production:**
- iOS: iOS 13+ (from app.json config)
- Android: Targets specified in app.json (package: com.vietfloodmobileapp)
- Deployment: EAS Build to generate .ipa and .apk
- Distribution: Apple App Store, Google Play Store

## Environment Configuration

**Configured Endpoints:**
- Backend API: `https://vietflood-app.azurewebsites.net`
- Vietnam Divisions API: `https://provinces.open-api.vn/api/v1`

**Build Environment:**
- EAS_BUILD_PROFILE: Used to determine prod vs dev
- NODE_ENV: Determines dev vs production config
- API_URL and VIETNAM_DIVISIONS_API_URL in `app/config/`

**Secure Storage:**
- Authentication tokens stored in expo-secure-store (not in JS bundle)
- Configuration recommends not including API secrets in JS (see `app/config/config.dev.ts`)

---

*Stack analysis: 2024-12-19*
