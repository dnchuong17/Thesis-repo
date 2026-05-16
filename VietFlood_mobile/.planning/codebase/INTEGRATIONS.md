# External Integrations

**Analysis Date:** 2024-12-19

## APIs & External Services

**VietFlood Backend API:**
- Base URL: `https://vietflood-app.azurewebsites.net`
- Location: `app/config/config.dev.ts` and `app/config/config.prod.ts`
- HTTP Client: apisauce 3.1.1 (axios-based)
- Implementation: `app/services/api/index.ts`

**Vietnam Divisions API:**
- Provider: Open API service for Vietnamese administrative divisions
- Base URL: `https://provinces.open-api.vn/api/v1`
- Purpose: Get list of provinces, districts, and wards for location selection
- Client: Separate apisauce instance in `app/services/api/locationService.ts`
- Endpoints:
  - GET `/p/` - List all provinces
  - GET `/p/{provinceCode}?depth=2` - Get province with districts
  - GET `/d/{districtCode}?depth=2` - Get district with wards

## Authentication & Security

**Auth Provider:** Custom JWT-based authentication

**Token Management:**
- Location: `app/services/api/tokenStorage.ts`
- Storage: expo-secure-store (hardware-backed secure storage)
- Token Types:
  - accessToken: JWT for API requests (Bearer auth)
  - refreshToken: Token for refreshing access token when expired
  - userId, username, role: User metadata stored securely

**Token Refresh Flow:**
- Endpoint: POST `/auth/refresh_token`
- Method: Refresh token passed in request body (not headers)
- Retry Logic: Automatic token refresh on 401 response
- Queueing: Prevents duplicate refresh requests
- Implementation: `app/services/api/index.ts` (Api class, lines 102-251)

**Auth Endpoints:**
- POST `/auth/signin` - Login with username/password
  - Request: `AuthSignInRequest` (username, password)
  - Response: `AuthSignInResponse` (accessToken, refreshToken, user)
- POST `/auth/register` - User registration
  - Request: `AuthRegisterRequest` (email, username, password, phone, name, location, etc.)
  - Response: `AuthRegisterResponse` (user id, created_at, etc.)
- POST `/auth/refresh_token` - Refresh access token
  - Request body: `{ refresh: refreshToken }`
  - Response: Updated tokens (snake_case from backend, normalized to camelCase)

**Service Location:** `app/services/api/authService.ts`

## Data Storage

**Local Storage:**
- Primary: react-native-mmkv 3.3.3 (fast key-value store)
  - Location: `app/utils/storage/index.ts`
  - Fallback: In-memory Map if MMKV unavailable
  - API: loadString, saveString, load, save, remove, clear

**Secure Storage:**
- Provider: expo-secure-store 55.0.13
  - Location: `app/services/api/tokenStorage.ts`
  - Keys stored: ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_ID_KEY, USERNAME_KEY, ROLE_KEY
  - Hardware-backed: Uses device secure enclave

**Database:** Not applicable - mobile app with REST API backend

**Caching:**
- Token caching: expo-secure-store + request interceptors
- API response caching: Handled at service layer with error handling

## API Service Architecture

**Core API Class:**
- Location: `app/services/api/index.ts`
- Singleton instance: `api` exported as default export
- Base timeout: 10,000 ms

**Request/Response Handling:**
- Async request interceptor: Injects Bearer token automatically
- Response interceptor: Logs responses for debugging
- Post with retry: `postWithRetry()` method handles 401 + token refresh + retry
- Authenticated methods: `authenticatedGet()`, `authenticatedPut()` with explicit token injection

**Error Handling:**
- General API problems defined in `app/services/api/apiProblem.ts`
- Problem types: server, timeout, network, unknown, bad-data, unauthenticated, forbidden, not-found, rejected, canceled
- Wrapped responses: All services return union types: `{ kind: "ok"; data: T } | GeneralApiProblem`

**Service Modules:**
- `authService.ts` - Authentication (signin, register, refresh, profile updates)
- `reportService.ts` - Flood/incident reports (CRUD operations)
- `userService.ts` - User management (get users, update profile, delete account)
- `locationService.ts` - Vietnam divisions (provinces, districts, wards)

## Reporting & User Management

**Report Endpoints:**
- GET `/reports` - Get all reports with pagination
- GET `/reports/{id}` - Get single report
- POST `/reports` - Create new report (supports multipart file upload for images)
- PUT `/reports/{id}` - Update report status
- PUT `/reports/update/{id}` - Update full report details
- DELETE `/reports/{id}` - Delete report
- DELETE `/reports/{reportId}/images/{imageId}` - Delete specific image from report

**Report Types:**
- Categories: flood, incident, infrastructure, rescue
- Status: pending, in-progress, resolved, verified, rejected, completed
- Fields: category, description, status, location (province/district/ward), coordinates (lat/lon), images, timestamps
- Service location: `app/services/api/reportService.ts`

**User Endpoints:**
- GET `/users` - Get all users with pagination
- GET `/users/{id}` - Get user by ID
- GET `/users/{id}/reports` - Get user's reports
- PUT `/users/{id}` - Update user profile (phone, email, name, location)
- DELETE `/users/{id}` - Delete user account
- GET `/users-with-reports` - Get users grouped by report count (for relief workers)
- Service location: `app/services/api/userService.ts`

**User Types:**
- Roles: user, resident, volunteer, relief, coordinator, admin
- Fields: id, username, email, phone, name, location (province/district/ward), role, timestamps
- Profile update: Partial updates to phone, email, name, location fields

## Image Handling

**Image Upload:**
- Method: Multipart form data in POST/PUT requests
- Source: expo-image-picker 55.0.19
  - Permission: Camera and photo library access
  - Returns: ImageAsset (uri, fileName, mimeType, fileSize)
- Implementation: `app/services/api/reportService.ts` handles multipart encoding
- Supported: Flood report images, profile pictures

**Image Management:**
- Storage: Backend manages image storage (likely Azure blob storage)
- Deletion: Individual image deletion via DELETE endpoint
- Association: Images tied to reports via report ID

## Location Services

**GPS Location:**
- Provider: expo-location 55.1.8
- Permission: Location access (foreground/background)
- Usage: Get user's current coordinates for report creation
- Integration: Used in `app/screens/ReportsScreen.tsx` and `app/screens/ReliefReportDetailScreen.tsx`

**Administrative Divisions:**
- Provider: https://provinces.open-api.vn/api/v1 (external Vietnamese API)
- Data: Cached at application level
- Service: `app/services/api/locationService.ts`
- UI: Used in location selector dropdowns for province → district → ward

## Networking

**Network State:**
- Provider: @react-native-community/netinfo 11.5.2
- Purpose: Detect offline/online status for offline-first features

## Monitoring & Observability

**Error Tracking:** Not configured in production
- Hooks present for Sentry, Crashlytics, BugSnag
- Location: `app/utils/crashReporting.ts`
- Status: Currently commented out, awaiting implementation

**Debugging:**
- Dev tool: Reactotron 2.9.4+ with plugins
  - MMKV storage monitoring
  - Redux action tracking
  - Network monitoring
  - API response logging
- Location: `app/devtools/ReactotronConfig.ts`
- Enabled in development only

**Logging:**
- Console logging: Request/response debug logs in `app/services/api/index.ts`
- Log levels: Info, warning, error
- Sensitive data: Sanitized in responses (token prefix only)

## CI/CD & Deployment

**Build Service:** Expo Application Services (EAS)
- CLI version: >= 3.15.1
- Build types: iOS (simulator/device/archive), Android (apk/aab)
- Profiles: development, preview, production
- Configuration: `eas.json` at root

**Build Outputs:**
- iOS: .ipa (internal/app store)
- Android: .apk (internal), .aab (Play Store)

**Build Scripts:**
- `build:ios:sim` - iOS simulator development build
- `build:ios:device` - iOS device development build
- `build:ios:preview` - iOS preview/internal build
- `build:ios:prod` - iOS production build
- `build:android:sim` - Android development build
- `build:android:device` - Android device development build
- `build:android:preview` - Android preview/internal build
- `build:android:prod` - Android production build

**Local Build:**
- `prebuild:clean` - Clean prebuild cache
- `android` - Local Android build (expo run:android)
- `ios` - Local iOS build (expo run:ios)
- `web` - Web build (expo start --web)

## Development Server

**Local Development:**
- Command: `npm run start` or `expo start`
- Metro bundler: Built-in to Expo
- Port forwarding: `npm run adb` for Android reverse proxy
  - TCP 9090, 3000, 9001, 8081 for debugging

**Environment:**
- Development API: Same URL as production (https://vietflood-app.azurewebsites.net)
- Config: `app/config/config.dev.ts`
- New Architecture: Enabled in `app.json` (newArchEnabled: true)
- JS Engine: Hermes (hermes in app.json)

## Internationalization

**i18n Setup:**
- Framework: i18next 23.14.0 + react-i18next 15.0.1
- Languages: English (en), Vietnamese (vi)
- Configuration: `app/i18n/index.ts`
- Translations: `app/i18n/en.ts` and `app/i18n/vi.ts`
- Device language: Detected via expo-localization 55.0.8

## Privacy & Permissions

**Required Permissions:**
- Camera: For image upload
- Photo library: For image selection
- Location: For GPS coordinates
- Device calendar: Not used currently

**Privacy Manifests:**
- iOS: Configured in `app.config.ts`
  - NSPrivacyAccessedAPITypes defined for required APIs
  - CA92.1 reason code for UserDefaults access (app preferences)

## Environment Variables

**Required at Build Time:**
- API_URL: Backend API endpoint (configured in config files)
- VIETNAM_DIVISIONS_API_URL: Vietnam divisions API (configured)

**Sensitive Data Storage:**
- NO secrets in JavaScript code (follows React Native best practices)
- Tokens stored in expo-secure-store (encrypted)
- Credentials never committed to version control

---

*Integration audit: 2024-12-19*
