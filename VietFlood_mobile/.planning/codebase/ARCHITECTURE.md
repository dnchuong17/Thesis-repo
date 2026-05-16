# Architecture

**Analysis Date:** 2025-01-24

## Pattern Overview

**Overall:** Modular layered architecture with feature-based organization and Redux state management

**Key Characteristics:**
- Feature-driven vertical slices (auth, reports, relief, volunteer, users, profile-home)
- Redux Toolkit for global state (authentication, tokens, roles)
- React Context for auxiliary state (theme, alerts, authentication hydration)
- React Navigation for navigation stack management with role-based route access control
- Service layer abstraction for API calls with token management and refresh logic
- Expo/React Native multiplatform support (iOS, Android, Web)

## Layers

**Presentation Layer (Screens & Components):**
- Purpose: User interface, rendering views, handling user interactions
- Location: `app/screens/`, `app/components/`
- Contains: Screen components (ProfileHomeScreen, ReliefScreen, ReportsScreen, etc.), reusable UI components (Button, Card, Input, Header, etc.)
- Depends on: Services, hooks, context, Redux, theme
- Used by: Navigation layer, other screens

**Navigation Layer:**
- Purpose: Route management, stack configuration, access control, deep linking
- Location: `app/navigators/`
- Contains: AppNavigator (main router), navigationTypes (param lists), navigationGuard (access control), navigationUtilities (ref management)
- Depends on: Screens, context (AuthContext), features (rollout for feature flags)
- Used by: App root component (app.tsx)

**Business Logic Layer (Features & Hooks):**
- Purpose: Feature-specific logic, data adaptation, complex state transitions
- Location: `app/features/`, `app/hooks/`
- Contains: Feature modules (auth, relief, reports, etc.), custom hooks (useAsyncFetch, useReliefReports, useProfile, useApiCall)
- Depends on: Services, Redux, utilities
- Used by: Screens, context providers, adapters

**State Management Layer:**
- Purpose: Global state for authentication, tokens, user roles
- Location: `app/store/`
- Contains: Redux store configuration, authSlice (async thunks: signInUser, registerUser, refreshToken, logout)
- Depends on: Services (authService, tokenStorage)
- Used by: AuthContext, screens, features

**Context Providers Layer:**
- Purpose: Non-Redux state, hydration, derived authentication state
- Location: `app/context/`
- Contains: AuthContext (authentication state wrapper over Redux), GlobalAlertContext (notifications), ThemeContext (theme selection)
- Depends on: Redux store, storage utilities
- Used by: App root, screens, components

**Service Layer:**
- Purpose: API communication, error handling, token management, data normalization
- Location: `app/services/api/`
- Contains: 
  - Api class: HTTP client with apisauce, token injection, 401 retry logic, token refresh
  - authService: Authentication endpoints (signIn, register, refresh, profile updates)
  - reportService: Report CRUD and queries
  - userService: User queries and updates
  - locationService: Location data
  - tokenStorage: Secure token persistence
  - apiProblem: Error type classification
- Depends on: Config, secure storage (expo-secure-store), utilities
- Used by: Redux thunks, hooks, features

**Utilities & Infrastructure Layer:**
- Purpose: Shared helper functions, storage, formatting, gesture handling
- Location: `app/utils/`, `app/lib/`, `app/config/`, `app/theme/`, `app/i18n/`
- Contains: 
  - storage: AsyncStorage wrapper for non-secure data
  - formatDate: Date formatting with i18n
  - colorAudit, typographyAudit: Design token validation
  - theme: Design tokens (colors, typography, spacing)
  - i18n: Internationalization (English, Vietnamese)
  - config: Environment-specific configuration
- Depends on: Third-party libraries (date-fns, i18next, expo-localization)
- Used by: All layers above

## Data Flow

**Authentication Flow:**

1. User enters credentials on LoginScreen (`app/screens/LoginScreen.tsx`)
2. Screen calls Redux thunk `signInUser` from authSlice
3. Thunk invokes `authService.signIn()` which makes API call via `api.post()`
4. Response normalized and tokens saved via `tokenStorage.saveTokens()`
5. Redux state updated with user, tokens, isAuthenticated flag
6. AuthContext reads Redux state and derives hydration state
7. AppNavigator checks `useAuth()` hook to conditionally show auth/app routes
8. Navigation transitions from Welcome/Login screen to authenticated routes based on role

**API Request Flow:**

1. Component calls service method (e.g., `reportService.getReports()`)
2. Service constructs request and calls API via `api.authenticatedGet()` or `api.post()`
3. API interceptor injects Bearer token from `tokenStorage.getAccessToken()`
4. Request sent to backend
5. On 401 response:
   - Attempt token refresh via `api.attemptTokenRefresh()`
   - Save new tokens to secure storage
   - Retry original request with new token
6. On success: return normalized response
7. On failure: return error wrapped in discriminated union type (ApiProblem)
8. Service error handling translates to user-facing messages or component state

**Component Data Fetching Pattern:**

1. Component calls `useAsyncFetch<T>(fetchFn)` hook with async service call
2. Hook manages state (idle → pending → success/failed) and data
3. Component renders based on state (loading skeleton, empty state, data, error)
4. User can retry via callback returned by hook
5. useEffect dependencies prevent re-fetching on re-render

**State Management Flow:**

1. Redux store holds auth state (token, user, role, isAuthenticated)
2. Redux persists to storage automatically via asyncThunk handlers
3. AuthContext wraps Redux and adds hydration logic
4. Screens subscribe to Redux via useSelector or AuthContext hooks
5. On navigation or role change, AppNavigator re-evaluates route access via navigationGuard
6. GlobalAlertContext manages alert visibility independently from Redux

## Key Abstractions

**ApiProblem Discriminated Union:**
- Purpose: Type-safe error handling across API layer
- Examples: `{ kind: "ok"; data: T }`, `{ kind: "unauthorized" }`, `{ kind: "cannot-connect" }`, `{ kind: "server" }`
- Pattern: Used in all service method return types, checked in Redux thunks and hooks

**Feature Module Pattern:**
- Purpose: Encapsulate feature-specific logic, adapters, types
- Examples: `app/features/relief/`, `app/features/reports/`, `app/features/profile-home/`
- Pattern: Each feature has index.ts barrel export, standalone feature service (reliefFeature.ts), optional adapter (reliefAdapter.ts for data transformation)

**Hook Wrapper Pattern:**
- Purpose: Abstract service calls and state management from components
- Examples: `useAsyncFetch<T>()`, `useReliefReports()`, `useProfile()`, `useApiCall()`
- Pattern: Hook manages async state (pending, success, error), exposes data, retry function, and state helpers (isLoading, isFailed, isEmpty)

**Adapter Pattern:**
- Purpose: Transform API responses into view-specific models
- Examples: `adaptOverviewData()` in profile-home, `adaptReports()` in reports
- Pattern: Converts raw API response to strongly-typed view model, includes calculated fields

**Role-Based Access Control (RBAC):**
- Purpose: Gate screens and features by user role
- Examples: Relief staff can access Relief, Reports, Volunteer, UsersOverview; Regular users see ProfileHome, Reports, Windy
- Pattern: navigationGuard.canAccessRoute(), feature flag checks via isCapabilityEnabled()

## Entry Points

**Application Root:**
- Location: `index.tsx`
- Triggers: App startup via registerRootComponent
- Responsibilities: Imports app.tsx and registers with Expo

**App Component:**
- Location: `app/app.tsx`
- Triggers: registerRootComponent call from index.tsx
- Responsibilities: 
  - Loads fonts and translations
  - Waits for navigation persistence restore
  - Wraps entire app with providers (Redux, SafeArea, Keyboard, Auth, Theme, GlobalAlert)
  - Renders AppNavigator with deep linking configuration

**AppNavigator:**
- Location: `app/navigators/AppNavigator.tsx`
- Triggers: Rendered by App component
- Responsibilities:
  - Manages navigation container with deep linking
  - Dynamically renders public routes (Welcome, Login, Register) or authenticated routes based on auth state
  - Renders bottom tab navigator for authenticated users with role-specific tabs (Relief, Reports, Volunteer, Users, Settings for relief roles; ProfileHome, Reports, Windy, Settings for user roles)
  - Handles back button behavior for Android
  - Manages nested stack navigators (e.g., SettingsStackNavigator)

**Activity Flow:**

1. Metro/Expo starts app → calls index.tsx → registerRootComponent(App)
2. App component initializes providers, loads fonts/i18n, restores navigation state
3. App renders AppNavigator within provider tree
4. AppNavigator checks useAuth() hook to read authentication state from Redux/AuthContext
5. Based on isAuthenticated and authRole, renders appropriate route tree
6. On route change, navigationGuard evaluates access via canAccessRoute()
7. Screens render and call hooks/services for data fetching

## Error Handling

**Strategy:** Discriminated union types for API errors, try-catch for async operations, error boundaries for critical failures

**Patterns:**
- API errors wrapped in `{ kind: "error-type"; problem: GeneralApiProblem }` discriminated unions
- Redux thunks use rejectWithValue() to propagate errors to slice error state
- Service methods check response.ok before processing
- Token refresh failures trigger logout and clear tokens
- ErrorBoundary component (`app/screens/ErrorScreen/ErrorBoundary.tsx`) wraps AppNavigator to catch rendering crashes
- GlobalAlertContext surfaces errors as user-visible alerts

## Cross-Cutting Concerns

**Logging:** 
- API layer logs all requests/responses with sanitized token info
- Uses console.log for request details, console.error for failures
- Can be replaced with crash reporting service via crashReporting.ts utility

**Validation:** 
- Input validation on screens before API calls (username format, password strength)
- Server response validation via normalizeAuthResponse() type guards
- Type safety via strict TypeScript configuration

**Authentication:**
- Token-based (Bearer tokens in Authorization header)
- Secure storage via expo-secure-store for tokens
- Automatic 401 refresh with exponential backoff prevention (isRefreshing flag)
- Token injection via apisauce request interceptor
- AuthContext maintains hydration state to prevent route access before token load

**Internationalization:**
- i18n setup in `app/i18n/index.ts`
- English and Vietnamese translations in en.ts and vi.ts
- react-i18next provider at app level
- translate() hook for component text
- Date formatting respects locale via date-fns

**Theming:**
- ThemeContext provides design tokens (colors, typography, spacing)
- themed() function creates style sheets that respond to theme changes
- Dark/light theme toggle persisted to storage
- Navigation theme synchronized with app theme

---

*Architecture analysis: 2025-01-24*
