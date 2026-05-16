# Codebase Structure

**Analysis Date:** 2025-01-24

## Directory Layout

```
VietFlood_mobile/
├── app/                          # Main application source code
│   ├── app.tsx                   # Root app component with all providers
│   ├── config/                   # Environment and build configuration
│   ├── context/                  # React Context providers (auth, alerts, theme)
│   ├── devtools/                 # Development-only tools (Reactotron)
│   ├── features/                 # Feature modules (vertical slices)
│   ├── hooks/                    # Custom React hooks for data fetching and state
│   ├── i18n/                     # Internationalization setup and translations
│   ├── lib/                      # Utility libraries for testing helpers
│   ├── navigators/               # Navigation configuration and routes
│   ├── screens/                  # Top-level screen components
│   ├── services/                 # API client and service layer
│   ├── store/                    # Redux store and slices
│   ├── theme/                    # Design tokens and theme context
│   ├── components/               # Reusable UI components
│   └── utils/                    # Shared utility functions
├── assets/                       # Static assets (images, fonts, etc.)
├── types/                        # Global TypeScript type definitions
├── test/                         # Test setup and utilities
├── docs/                         # Documentation
├── dist/                         # Build output (web)
├── .agents/                      # Agent/automation configuration
├── .github/                      # GitHub workflows and configs
├── .maestro/                     # E2E test flows
├── .planning/                    # GSD planning documents
├── index.tsx                     # App entry point (Expo registration)
├── app.json                      # Expo app manifest
├── app.config.ts                 # Expo dynamic configuration
├── tsconfig.json                 # TypeScript compiler options
├── jest.config.js                # Jest test runner config
├── metro.config.js               # Metro bundler configuration
├── babel.config.js               # Babel transpiler config
├── tailwind.config.js            # Tailwind CSS (NativeWind) config
├── package.json                  # NPM dependencies and scripts
└── README.md                     # Project overview
```

## Directory Purposes

**app/:**
- Purpose: All application source code, organized by feature and concern
- Contains: TypeScript/TSX components, hooks, services, state management, utilities
- Key files: `app.tsx` (root), `app/navigators/AppNavigator.tsx` (main router), `app/store/index.ts` (Redux)

**app/config/:**
- Purpose: Environment-specific and build configuration
- Contains: `index.ts` (config loader), `config.base.ts` (shared), `config.dev.ts` (dev values), `config.prod.ts` (prod values)
- Key exports: API_URL, exitRoutes, feature flags, timeout settings

**app/context/:**
- Purpose: React Context providers for global state that doesn't belong in Redux
- Contains: AuthContext.tsx (authentication state wrapper), GlobalAlertContext.tsx (notifications), ThemeContext (handled in app/theme/)
- Key exports: useAuth() hook, useGlobalAlert() hook

**app/features/:**
- Purpose: Feature-based vertical slices with encapsulated logic, adapters, and types
- Contains:
  - `auth/` - Authentication logic (authFeature, authApiService, types, index)
  - `relief/` - Relief coordination feature (reliefFeature, index)
  - `reports/` - Report submission and management (reportsFeature, reportsAdapter, index)
  - `volunteer/` - Volunteer coordination (volunteerFeature, index)
  - `users/` - User management (usersAdapter, index)
  - `profile-home/` - User profile overview (profileHomeFeature, overviewAdapter, index)
  - `profile/` - Profile view/edit screens (screens/, index)
  - `shared/` - Cross-feature utilities (rbac, contracts, errors, defaultServices)
  - `adapters/` - Ignite framework adapters for feature integration (igniteAuthAdapter, igniteFeatureAdapters)
- Key pattern: Each feature has index.ts barrel export, feature service file, optional adapter for data transformation

**app/hooks/:**
- Purpose: Custom React hooks for data fetching, API calls, and complex logic
- Contains: `useAsyncFetch.ts` (generic async state), `useReliefReports.ts`, `useProfile.ts`, `useApiCall.ts`
- Key pattern: Hooks manage async state (pending/success/error) and expose data + retry function

**app/i18n/:**
- Purpose: Internationalization setup and language translations
- Contains: `index.ts` (i18next initialization), `en.ts` (English), `vi.ts` (Vietnamese), `translate.ts` (hook)
- Key exports: useTranslation hook, initialized i18n instance, language detection via expo-localization

**app/lib/:**
- Purpose: Library utilities for testing and theme configuration
- Contains: `theme.ts` (test theme setup), `utils.ts` (test helpers)

**app/navigators/:**
- Purpose: Navigation structure, route definitions, and access control
- Contains:
  - `AppNavigator.tsx` - Main router with tab navigator and role-based conditional rendering
  - `navigationTypes.ts` - TypeScript types for route params (AppStackParamList)
  - `navigationGuard.ts` - Route access control functions (canAccessRoute, getInitialRouteName)
  - `navigationUtilities.ts` - Navigation ref, persistence logic, back button handling
- Key concepts: Tab navigator with nested stacks, dynamic route rendering based on auth state and role

**app/screens/:**
- Purpose: Top-level screen components used by navigator
- Contains: LoginScreen, RegisterScreen, WelcomeScreen, ProfileHomeScreen, ReliefScreen, ReportsScreen, VolunteerScreen, UsersOverviewScreen, SettingsScreen, ReliefReportDetailScreen, ChangePasswordScreen, UserGuideScreen, WindyScreen, ErrorScreen/
- Key pattern: Each screen is a functional component that uses hooks for data, context for state, and theme for styling

**app/services/api/:**
- Purpose: HTTP client and API service layer with authentication and error handling
- Contains:
  - `index.ts` - Api class with apisauce, token injection, 401 refresh logic
  - `authService.ts` - Authentication endpoints (signIn, register, refresh, profile)
  - `reportService.ts` - Report API operations
  - `userService.ts` - User queries and updates
  - `locationService.ts` - Location data
  - `tokenStorage.ts` - Secure token persistence via expo-secure-store
  - `apiProblem.ts` - Error type definitions and classification
  - `types.ts` - Request/response interfaces and normalizers
- Key concepts: Singleton API instance, token refresh with queue prevention, discriminated union error types

**app/store/:**
- Purpose: Redux store configuration and slices
- Contains:
  - `index.ts` - configureStore setup, exports RootState and AppDispatch types
  - `authSlice.ts` - Authentication state slice with async thunks (signInUser, registerUser, refreshToken, logout)
  - `hooks.ts` - Custom hooks (useAppDispatch, useAppSelector)
  - `types.ts` - TypeScript types for auth state
- Key concepts: Async thunks for API integration, middleware configuration, token storage integration

**app/theme/:**
- Purpose: Design tokens, theming system, and theme context
- Contains:
  - `context.tsx` - ThemeProvider and useAppTheme hook
  - `context.utils.ts` - Theme imperative styling functions
  - `theme.ts` - Light and dark theme definitions
  - `types.ts` - TypeScript types for theme, themed styles, styled props
  - `typography.ts` - Font family and size definitions
- Key concepts: Design token system, light/dark mode toggle, themed() function for responsive styles

**app/components/:**
- Purpose: Reusable UI components
- Contains:
  - `ui/` - Basic UI primitives from @rn-primitives (accordion, dialog, etc.)
  - `ui-reusables/` - Custom reusable components (button variants, custom input)
  - Individual components: Button, Screen, Header, Text, Input, Card, ListItem, Avatar, Icon, AutoImage, EmptyState, LoadingSkeleton, GlobalAlert, BrandedHeader, RoleBasedLayout, ReliefDirectionsMap
- Key pattern: Components are functional, use theme context, support theming via themed() function, use NativeWind (Tailwind for React Native)

**app/utils/:**
- Purpose: Shared utility functions and storage
- Contains:
  - `storage/` - AsyncStorage wrapper for non-sensitive data (init, get, set, remove)
  - `formatDate.ts` - Date formatting with i18n support
  - `colorAudit.ts` - Validate design token colors
  - `typographyAudit.ts` - Validate design token typography
  - `crashReporting.ts` - Error reporting integration
  - `gestureHandler.ts` / `gestureHandler.native.ts` - Gesture handler setup
  - `useIsMounted.ts` - Hook to check if component is mounted
  - `useSafeAreaInsetsStyle.ts` - Hook for safe area styling

**assets/:**
- Purpose: Static assets bundled with app
- Contains: Images (logo, etc.), fonts (if not from @expo-google-fonts)

**types/:**
- Purpose: Global TypeScript type definitions not specific to features
- Contains: Common types, type extensions, ambient declarations

**test/:**
- Purpose: Test configuration, setup, and test utilities
- Contains:
  - `setup.ts` - Jest setup file with mock configuration
  - `test-tsconfig.json` - TypeScript config for test files
  - `mockFile.ts` - Mock implementations
  - `i18n.test.ts` - Tests for i18n setup

**docs/:**
- Purpose: Project documentation
- Contains: Architecture guides, API documentation, migration guides

**dist/:**
- Purpose: Build output directory
- Contains: Compiled web bundle and assets (generated by `expo export --platform web`)
- Not committed to git (generated)

## Key File Locations

**Entry Points:**
- `index.tsx`: Calls registerRootComponent(App) to start app
- `app/app.tsx`: Root App component with all provider setup
- `app/navigators/AppNavigator.tsx`: Main navigation stack

**Configuration:**
- `tsconfig.json`: Path aliases (@/* → app/*)
- `app.config.ts`: Dynamic Expo config
- `app.json`: Static app manifest
- `metro.config.js`: Bundle configuration
- `jest.config.js`: Test runner config

**Core Logic:**
- `app/store/authSlice.ts`: Authentication state machine
- `app/services/api/index.ts`: HTTP client with token management
- `app/context/AuthContext.tsx`: Authentication state wrapper
- `app/navigators/AppNavigator.tsx`: Route definitions
- `app/navigators/navigationGuard.ts`: Route access control

**Testing:**
- `test/setup.ts`: Jest setup with mocks
- `app/screens/*.test.tsx`, `app/hooks/*.test.ts`: Colocated tests

## Naming Conventions

**Files:**
- Screens: PascalCase + "Screen" suffix → `LoginScreen.tsx`, `ProfileHomeScreen.tsx`
- Components: PascalCase → `Button.tsx`, `Header.tsx`, `Card.tsx`
- Hooks: camelCase + "use" prefix → `useAsyncFetch.ts`, `useProfile.ts`
- Services: camelCase + "Service" suffix → `authService.ts`, `reportService.ts`
- Context: PascalCase + "Context" suffix → `AuthContext.tsx`, `ThemeContext.tsx`
- Utilities: camelCase → `formatDate.ts`, `storage.ts`
- Slices: camelCase + "Slice" suffix → `authSlice.ts`
- Features: kebab-case for directories → `profile-home/`, `profile-home/` (follow existing naming)

**Directories:**
- Feature modules: kebab-case → `app/features/profile-home/`, `app/features/relief/`
- Utilities: plural or descriptive → `app/utils/`, `app/hooks/`, `app/services/api/`

## Where to Add New Code

**New Feature/Vertical Slice:**
- Create: `app/features/feature-name/`
- Add: `featureFeature.ts` (feature logic), `featureAdapter.ts` (optional, data transformation), `index.ts` (barrel export)
- Create: Type definitions in feature folder
- Export from: `app/features/feature-name/index.ts`
- Integrate: Add routes to `app/navigators/AppNavigator.tsx`, screen to `app/screens/`

**New Screen:**
- Create: `app/screens/NewScreen.tsx`
- Use pattern: Functional component with hooks, theme context, type-safe navigation params
- Add type to: `app/navigators/navigationTypes.ts` → AppStackParamList
- Register in: `app/navigators/AppNavigator.tsx` as Stack.Screen
- Add route guard in: `app/navigators/navigationGuard.ts` if role-gated

**New Component (Reusable):**
- Create: `app/components/ComponentName.tsx`
- Use theme context: Import `useAppTheme`, use `themed()` for styles
- Use NativeWind: Tailwind-style className prop (e.g., `className="flex justify-center"`)
- Export from: `app/components/index.ts` (barrel file) if public API
- Test: Colocate as `ComponentName.test.tsx`

**New Hook:**
- Create: `app/hooks/useNewHook.ts`
- Pattern: Use `useState`, `useCallback`, `useEffect` for async state management
- If async data: Use `useAsyncFetch<T>()` pattern or call services directly
- Test: Colocate as `useNewHook.test.ts`

**New API Service:**
- Add methods to: `app/services/api/existingService.ts` or create `newService.ts`
- Use API singleton: Import `api` from `app/services/api/index.ts`
- Return type: Discriminated union ApiProblem (e.g., `{ kind: "ok"; data: T } | GeneralApiProblem`)
- Token handling: Use `api.authenticatedGet()` or `api.postWithRetry()` for automatic 401 handling
- Export from: `app/services/api/index.ts` (barrel file)

**New Utility Function:**
- Shared logic: `app/utils/utilName.ts`
- Shared storage: `app/utils/storage/index.ts`
- Export from: `app/utils/storage/index.ts` or appropriate barrel

**Styling:**
- Use NativeWind (Tailwind for React Native)
- Import `useAppTheme` for design tokens when inline styles needed
- Use `themed()` function to create responsive style objects
- Define theme colors in: `app/theme/theme.ts`

## Special Directories

**app/devtools/:**
- Purpose: Development-only tools
- Generated: No (hand-written)
- Committed: Yes
- Contents: Reactotron config, only loaded in __DEV__ mode via conditional require

**dist/:**
- Purpose: Web build output
- Generated: Yes (by `expo export --platform web`)
- Committed: No (in .gitignore)

**.expo/:**
- Purpose: Expo cache and configuration
- Generated: Yes (by Expo CLI)
- Committed: No (in .gitignore)

**app/screens/ErrorScreen/:**
- Purpose: Error handling boundary component
- Contains: ErrorBoundary component that wraps AppNavigator
- Pattern: Catches React rendering errors and displays fallback UI

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (by npm/pnpm)
- Committed: No (in .gitignore)

## Import Path Aliases

**Configured in tsconfig.json:**
- `@/*` → `app/*` (e.g., `@/screens/LoginScreen` → `app/screens/LoginScreen`)
- `@assets/*` → `assets/*` (e.g., `@assets/logo.png`)

**Usage Pattern:**
```typescript
// Instead of:
import { Button } from "../../../components/Button"

// Use:
import { Button } from "@/components/Button"
```

## File Organization Best Practices

**Co-locate Tests:**
- Component tests next to component: `ComponentName.tsx` + `ComponentName.test.tsx`
- Hook tests next to hook: `useHook.ts` + `useHook.test.ts`

**Barrel Exports:**
- Re-export public APIs from `index.ts` in each directory
- Example: `app/components/index.ts` exports all public components
- Makes imports cleaner: `import { Button } from "@/components"` vs `import { Button } from "@/components/Button"`

**Feature Encapsulation:**
- Keep feature-specific types, services, adapters within `app/features/feature-name/`
- Export only public API via `index.ts`
- Prevents circular dependencies and tight coupling

**Service Layer Abstraction:**
- Never import API client directly in screens
- Always go through service layer (`authService`, `reportService`, etc.)
- Allows easy mocking and decoupling

---

*Structure analysis: 2025-01-24*
