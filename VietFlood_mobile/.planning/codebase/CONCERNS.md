# Codebase Concerns

**Analysis Date:** 2025-01-10

## Tech Debt

### Oversized Screen Components
- **Issue:** `ReportsScreen.tsx` is 2,913 lines, `ReliefScreen.tsx` is 1,504 lines. These components violate single-responsibility principle and are difficult to maintain, test, and debug.
- **Files:** `app/screens/ReportsScreen.tsx`, `app/screens/ReliefScreen.tsx`, `app/screens/UsersOverviewScreen.tsx` (1,099 lines)
- **Impact:** High complexity makes refactoring risky, increases bug probability, difficult code review, poor reusability of logic
- **Fix approach:** Extract form logic into separate components, create custom hooks for location/province/district/ward loading (e.g., `useLocationHierarchy`), separate filter/sort logic into container component. Consider using a state management library (Redux/Zustand) for complex form state.

### Excessive `any` Type Usage
- **Issue:** 32+ instances of `as any` or `: any` type assertions, with 15+ untyped function parameters. This defeats TypeScript's type safety benefits.
- **Files:** `app/screens/ReportsScreen.tsx` (multiple instances), `app/features/reports/reportsAdapter.ts`, `app/services/api/index.ts`, `app/screens/ReliefScreen.tsx`, `app/screens/ProfileHomeScreen.tsx`, `app/screens/SettingsScreen.tsx`
- **Impact:** Type errors go undetected at compile time, runtime failures in production, harder to refactor safely, poor IDE autocomplete
- **Fix approach:** Create proper type definitions for API responses (start with `app/services/api/types.ts`), extract magic type assertions to typed functions. Use discriminated unions for result types (already partially done with `reportService` result types).

### Console.log Statements in Production Code
- **Issue:** 30+ console.log statements scattered throughout services and screens, including sensitive data logging (token prefixes, full requests/responses).
- **Files:** `app/services/api/index.ts` (30 console statements), `app/services/api/authService.ts`, `app/screens/ReportsScreen.tsx`, `app/features/auth/authApiService.ts`
- **Impact:** Performance degradation in production, leaked sensitive information in logs, makes app harder to support in field (can't suppress logs)
- **Fix approach:** Replace all console.log with conditional __DEV__ checks or a proper logging service that can be configured by environment. Remove or sanitize token/sensitive data logging.

## Known Issues

### Incomplete Feature Implementation
- **Issue:** TODO comments indicate incomplete features
- **Files:** 
  - `app/screens/ChangePasswordScreen.tsx:53` - "TODO: Call authService.changePassword(currentPassword, newPassword)"
  - `app/screens/VolunteerScreen.tsx:222` - "TODO: Navigate to create assignment"
  - `app/theme/typography.ts:1` - Missing documentation for fonts and typography
- **Impact:** Change password flow doesn't work, volunteer assignment creation blocked, poor maintainability due to missing docs
- **Fix approach:** Complete changePassword implementation by calling authService, implement assignment creation navigation, document typography system

### Test Coverage Gaps
- **Issue:** Only 1 out of 19 screen components have tests (`ReliefReportsFlow.test.tsx`). Of 269 total test files, only ~1 covers screens. Major business logic unverified.
- **Files:** `app/screens/` (19 screen components, 1 tested), `app/utils/storage/storage.test.ts` exists but heavy lifting components have no tests
- **Impact:** Regressions go undetected, critical paths like login/reports untested, refactoring is risky, no regression suite for QA
- **Fix approach:** Add unit tests for critical screens (LoginScreen, ReportsScreen, ReliefScreen), integration tests for auth flow, test form validation and submission

### Jest Test Configuration Issue
- **Issue:** Jest configuration contains a TODO: "// TODO: Fix Jest/NativeWind integration" - NativeWind components fail to render in tests
- **Files:** `jest.config.js`
- **Impact:** Can't test components that use NativeWind styling, limits test coverage
- **Fix approach:** Configure Jest moduleNameMapper for NativeWind, or use snapshot testing with mock styles

## Security Considerations

### Tokens Logged in Plain Text
- **Issue:** Bearer tokens (first 20 characters) are logged in API request interceptor and response handling
- **Files:** `app/services/api/index.ts:65` (logs token prefix), `app/features/auth/authApiService.ts:169` (logs full auth response)
- **Current mitigation:** None - tokens are visible in dev logs and potentially persisted to device logs
- **Recommendations:** 
  1. Remove all token logging or mask to "[REDACTED]"
  2. Ensure SecureStore is used for all token storage (currently done, but verify)
  3. Clear console logs in production build via build config

### Hardcoded Test Credentials
- **Issue:** Test credentials stored in committed code with documented security warning but no enforcement
- **Files:** `app/config/testCredentials.ts` - contains hardcoded password "DevPass123!@#"
- **Current mitigation:** File has security comments warning against production use
- **Recommendations:** 
  1. Remove credentials from repository, use environment variables or secure credential injection
  2. Add pre-commit hook to prevent credential files from being committed
  3. Use .gitignore for credential files

### Unvalidated JSON Parsing
- **Issue:** Multiple JSON.parse calls without try-catch or validation in critical paths
- **Files:** `app/screens/ReportsScreen.tsx:145` (no try-catch), `app/utils/storage/index.ts:81`, `app/components/ReliefDirectionsMap.tsx:224`
- **Current mitigation:** One location has catch, others do not
- **Recommendations:** 
  1. Wrap all JSON.parse in try-catch blocks
  2. Create utility function `safeParse<T>` with type validation
  3. Validate parsed data against expected schema

### FormData File Upload Without Validation
- **Issue:** File upload in `reportService.ts:347` doesn't validate file type or size before appending to FormData
- **Files:** `app/services/api/reportService.ts:347` - `formData.append("files", { uri: image.uri, name: fileName, type: mimeType } as any)`
- **Current mitigation:** None visible
- **Recommendations:** 
  1. Validate file size before upload (frontend limit + server validation)
  2. Whitelist allowed MIME types
  3. Remove the `as any` cast and properly type ImageAsset
  4. Add file count limit

## Performance Bottlenecks

### Excessive re-renders in ReportsScreen
- **Issue:** 34 React hooks (useState, useCallback, useMemo, useEffect) in a single screen component. Each hook adds to render time, missing dependency arrays risk stale closures.
- **Files:** `app/screens/ReportsScreen.tsx`
- **Cause:** All state managed at component level instead of extracted to custom hooks or state management library
- **Improvement path:** 
  1. Extract form state to `useReportForm` hook
  2. Extract location/province/district/ward loading to `useLocationHierarchy` hook
  3. Extract filter/sort logic to `useReportFiltering` hook
  4. Move to Redux/Zustand for global form state

### Inefficient List Rendering
- **Issue:** `filteredReports.map()` renders all items without virtualization. With 1500+ lines and multiple maps, ReportsScreen will lag with large datasets
- **Files:** `app/screens/ReportsScreen.tsx:1202`, `app/screens/ReportsScreen.tsx:1551`
- **Cause:** Using ScrollView with nested ScrollView instead of FlatList with getItemLayout
- **Improvement path:** Replace ScrollView-based lists with FlatList, implement virtualization for large datasets

### Date Parsing on Every Render
- **Issue:** Line 289-298 in ReportsScreen re-parses all report dates on every render (in useMemo but no memoization of parsed dates)
- **Files:** `app/screens/ReportsScreen.tsx:289-298`
- **Cause:** `new Date()` constructor called for every report's sort operation
- **Improvement path:** Memoize parsed dates in report object during API response normalization, not during render

### Synchronous String Operations in Render
- **Issue:** `normalizeName` callback does NFD normalization, regex replace, toLowerCase on every search keystroke (with deferredValue but still expensive)
- **Files:** `app/screens/ReportsScreen.tsx:223-230`
- **Cause:** Complex string operations in filter logic
- **Improvement path:** Debounce search input (already using deferredValue, good), pre-compute normalized strings in data layer

## Fragile Areas

### AuthContext State Synchronization
- **Issue:** Auth state is split between Redux (from `authSlice.ts`) and localStorage/SecureStore. Multiple sources of truth can diverge.
- **Files:** `app/context/AuthContext.tsx` (Redux + SecureStore), `app/store/authSlice.ts`, `app/services/api/tokenStorage.ts`
- **Why fragile:** Logout clears SecureStore but Redux might not sync. Token refresh updates one store but not the other. Session rehydration assumes Redux and SecureStore are in sync.
- **Safe modification:** 
  1. Consolidate to single source of truth (preferably Redux)
  2. Add sync test to verify stores match after login/logout
  3. Add unit tests for `rehydrateSession` with mismatched states

### Location Service Cascading Loads
- **Issue:** Province → District → Ward loading is sequential with manual state management. If a load fails midway, form is left in inconsistent state.
- **Files:** `app/screens/ReportsScreen.tsx:336-380` (loadProvinces, loadDistricts, loadWards)
- **Why fragile:** No rollback if district load fails after province loads. User sees loaded provinces but can't proceed.
- **Safe modification:** 
  1. Add error state for each load level
  2. Implement rollback: if districtLoad fails, clear districts and reset district selection
  3. Create loading state machine to prevent invalid state transitions

### Type Coercion in Report Category
- **Issue:** `getCategoriesFromValue` attempts category coercion with fallback type assertion `as ReportCategory`
- **Files:** `app/screens/ReportsScreen.tsx:162-175` (fallback to `part as ReportCategory`)
- **Why fragile:** Unknown enum values are silently cast to ReportCategory, causing type mismatch errors at runtime or backend rejection
- **Safe modification:** 
  1. Remove the fallback cast
  2. Add validation to reject unknown categories
  3. Log warning if category doesn't match enum

### Error Handling in GPS Location
- **Issue:** GPS error caught as `any`, message extraction from `e?.message` may fail for unexpected error objects
- **Files:** `app/screens/ReportsScreen.tsx:564` - `catch (e: any)` then `e?.message`
- **Why fragile:** If error object structure is different, message is undefined or wrong
- **Safe modification:** Create error type guard, extract message safely with fallback

## Missing Critical Features

### Change Password Feature
- **Issue:** UI exists but backend call is not implemented (TODO comment)
- **Files:** `app/screens/ChangePasswordScreen.tsx:53`
- **Blocks:** Users can't change passwords, security risk if password is compromised
- **Priority:** High

### Volunteer Assignment Creation
- **Issue:** Button exists with TODO for navigation, feature incomplete
- **Files:** `app/screens/VolunteerScreen.tsx:222`
- **Blocks:** Volunteers can't create assignments via mobile app
- **Priority:** Medium

### Offline Support
- **Issue:** No visible offline mode detection or syncing queue for offline data
- **Files:** `app/features/shared/offline.ts` exists but not wired into screens
- **Blocks:** App likely crashes or loses data when going offline
- **Priority:** Medium

## Dependencies at Risk

### Outdated Package Ecosystem
- **Issue:** React Native 0.83.4, Expo 55.0.15 are very recent versions with potential stability issues. Rapid upgrade cycle creates maintenance burden.
- **Risk:** Bug fixes and performance improvements in newer versions not available, security patches delayed, incompatibility with ecosystem libraries
- **Impact:** Security vulnerabilities, performance issues, incompatible with new dependencies
- **Migration plan:** 
  1. Lock to stable versions (React Native 0.72.x, Expo 50.x) after testing
  2. Add pre-commit hook to prevent accidental upgrades
  3. Create upgrade testing process (manual test on iOS and Android before merging)

### apisauce 3.1.1 (Single Version Lock)
- **Issue:** apisauce is locked to exact version 3.1.1 (no caret/tilde), will fail to update for security patches
- **Files:** `package.json:66`
- **Risk:** Missing critical bug fixes or security updates in apisauce
- **Migration plan:** Change to `^3.1.1` to allow patch updates, or create dependency bump schedule

## Anti-patterns

### Fire-and-Forget Promise Chains
- **Issue:** Multiple `void` prefix on async calls without awaiting results or error handling
- **Files:** `app/screens/ReportsScreen.tsx:455, 466` (`void loadDistricts`, `void loadWards`), `app/screens/ReportsScreen.tsx:624` (`void fetchReports`)
- **Impact:** Silent failures, loading states may not update, user sees no feedback if load fails
- **Fix:** Either await the promise, handle errors, or wrap in try-catch with error UI

### Missing Dependency Arrays
- **Issue:** useEffect with route parameter dependency may have issues with route params lifecycle
- **Files:** `app/screens/ReportsScreen.tsx:627-632` depends on `route.params?.openCreateModal`
- **Impact:** Modal may open unexpectedly or not open when expected due to stale closures
- **Fix:** Add `navigation` to dependency array (already done but verify route params are stable)

### Unguarded Optional Chaining
- **Issue:** Heavy use of `?.` without null checks leads to undefined values being passed to functions expecting values
- **Files:** Multiple locations with pattern `report?.status`, `option?.label`, etc.
- **Impact:** Silent failures, functions receive undefined instead of throwing clear errors
- **Fix:** Use discriminated unions or add explicit type guards

---

*Concerns audit: 2025-01-10*
