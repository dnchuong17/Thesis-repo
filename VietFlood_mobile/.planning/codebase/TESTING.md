# Testing Patterns

**Analysis Date:** 2024-12-19

## Test Framework

**Runner:**
- Jest ~29.7.0
- Config: `jest.config.js`
- Preset: `jest-expo` (Expo-specific Jest setup)
- Setup file: `test/setup.ts` (runs before all tests)

**Assertion Library:**
- Jest's built-in matchers and assertions
- React Testing Library for component testing (`@testing-library/react-native` ^13.2.0)
- Test renderer (`react-test-renderer` 19.2.0) for snapshot testing

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode for development
npm run test:maestro     # Mobile UI testing (Maestro flows)
```

## Test File Organization

**Location:**
- Co-located with source files (same directory as code being tested)
- Central test utilities in `test/` directory

**Naming:**
- Match source filename with `.test.ts` or `.test.tsx` suffix
- Examples:
  - Source: `app/services/api/apiProblem.ts` → Test: `app/services/api/apiProblem.test.ts`
  - Source: `app/screens/ReliefReportsFlow.tsx` → Test: `app/screens/ReliefReportsFlow.test.tsx`
  - Source: `app/utils/storage.ts` → Test: `app/utils/storage.test.ts`

**Directory Structure:**
```
app/
├── components/
│   ├── Card.tsx
│   └── Text.test.tsx          # Component tests
├── screens/
│   ├── LoginScreen.tsx
│   └── ReliefReportsFlow.test.tsx
├── services/api/
│   ├── apiProblem.ts
│   └── apiProblem.test.ts
└── utils/storage/
    ├── index.ts
    └── storage.test.ts
test/
├── setup.ts                   # Global test setup
├── mockFile.ts               # Shared test mocks
└── i18n.test.ts             # Global test files
```

**Test File Exclusions:**
- Jest ignores: `app/components/Text.test.tsx` (listed in jest.config.js as known issue with NativeWind integration)

## Test Structure

**Suite Organization:**
```typescript
describe("MMKV Storage", () => {
  beforeEach(() => {
    storage.clearAll()
    storage.set("string", "string")
    storage.set("object", JSON.stringify(VALUE_OBJECT))
  })

  it("should be defined", () => {
    expect(storage).toBeDefined()
  })

  it("should load data", () => {
    expect(load<object>("object")).toEqual(VALUE_OBJECT)
  })
})
```

**Test Structure Pattern:**
- `describe()` for test suites (often one per unit/feature)
- `it()` or `test()` for individual test cases (both supported)
- Consistent naming: "should [expected behavior]"
- Setup with `beforeEach()` for test isolation
- One assertion focus per test typically

**Patterns:**

1. **Synchronous Unit Tests:**
   ```typescript
   test("handles connection errors", () => {
     expect(getGeneralApiProblem({ problem: "CONNECTION_ERROR" } as ApiErrorResponse<null>)).toEqual({
       kind: "cannot-connect",
       temporary: true,
     })
   })
   ```

2. **Async Tests:**
   ```typescript
   it("should load profile on mount", async () => {
     const { getByText } = render(<ProfileViewScreen />)
     // Component uses useEffect to call fetchProfile
     await waitFor(() => {
       expect(getByText("Profile")).toBeTruthy()
     })
   })
   ```

3. **Setup/Teardown:**
   ```typescript
   beforeEach(() => {
     // Reset state before each test
     jest.clearAllMocks()
     storage.clearAll()
   })
   
   // Optional afterEach for cleanup
   afterEach(() => {
     // Cleanup if needed
   })
   ```

## Mocking

**Framework:** Jest's built-in mocking

**Patterns:**

1. **Module Mocking:**
   ```typescript
   jest.mock("react-native", () => {
     return Object.setPrototypeOf(
       {
         Image: {
           ...ReactNative.Image,
           resolveAssetSource: jest.fn((_source) => mockFile),
           getSize: jest.fn(
             (
               uri: string,
               success: (width: number, height: number) => void,
               failure?: (_error: any) => void,
             ) => success(100, 100),
           ),
         },
       },
       ReactNative,
     )
   })
   ```

2. **Function Mocking with Type Safety:**
   ```typescript
   const { useAuth } = require("@/context/AuthContext") as {
     useAuth: jest.Mock
   }
   
   // Set return value
   useAuth.mockReturnValue({
     authUsername: "testuser",
     loginWithPassword: jest.fn(),
   })
   ```

3. **Library Mocking:**
   ```typescript
   jest.mock("i18next", () => ({
     currentLocale: "en",
     t: (key: string, params: Record<string, string>) => {
       return `${key} ${JSON.stringify(params)}`
     },
   }))
   
   jest.mock("expo-localization", () => ({
     ...jest.requireActual("expo-localization"),
     getLocales: () => [{ languageTag: "en-US", textDirection: "ltr" }],
   }))
   ```

4. **Function Spying:**
   ```typescript
   jest.spyOn(Linking, "openURL").mockResolvedValue()
   ```

**What to Mock:**
- Native modules (react-native, expo-*)
- External API services
- Heavy dependencies (network, file system)
- Third-party libraries that aren't testable in Jest environment

**What NOT to Mock:**
- Business logic being tested
- Component props/behavior
- Internal utilities and helpers
- Types and interfaces (no runtime impact)

**Mocks Location:**
- Global mocks: `test/setup.ts`
- Local mocks: top of individual test file in `jest.mock()` calls
- Shared test data: `test/mockFile.ts`
- Test credentials: `app/config/testCredentials.ts`

## Fixtures and Factories

**Test Data Pattern:**
```typescript
const sampleReport = {
  id: 42,
  user_id: 8,
  category: "flood",
  description: "River water entered the first floor overnight.",
  status: "pending",
  province: "Da Nang",
  district: "Hai Chau",
  ward: "Hai Chau 1",
  address_line: "12 Bach Dang",
  latitude: 16.0678,
  longitude: 108.2208,
  images: [],
  created_at: "2026-04-22 10:00:00",
  updated_at: "2026-04-22 11:00:00",
  created_by: {
    id: 8,
    username: "resident.one",
    email: "resident@example.com",
    // ... more fields
  },
}
```

**Test Values:**
```typescript
const VALUE_OBJECT = { x: 1 }
const VALUE_STRING = JSON.stringify(VALUE_OBJECT)
```

**Location:**
- Simple fixtures: top of test file as constants
- Shared fixtures: `test/mockFile.ts` or similar shared files
- Complex factories: consider helper functions in test file

**Pattern for Test Data:**
- Use realistic data that matches API response types
- Include all required fields
- Keep test data minimal but complete
- Use commented placeholders for large optional sections

## Coverage

**Requirements:** Not enforced via configuration

**Approach:**
- Minimum coverage not set in jest.config.js
- Individual teams/projects determine coverage targets
- Focus on critical paths and error handling

**View Coverage:**
```bash
npm run test -- --coverage
```

**Coverage Output:**
- Statements: % of statements executed
- Branches: % of conditional branches taken
- Functions: % of functions called
- Lines: % of lines executed

## Test Types

**Unit Tests:**
- Scope: Single function or component in isolation
- Approach:
  - Test with various inputs
  - Verify output matches expectations
  - Mock external dependencies
- Example location: `app/services/api/apiProblem.test.ts`
- Patterns:
  ```typescript
  test("handles unauthorized errors", () => {
    expect(
      getGeneralApiProblem({ problem: "CLIENT_ERROR", status: 401 } as ApiErrorResponse<null>),
    ).toEqual({
      kind: "unauthorized",
    })
  })
  ```

**Integration Tests:**
- Scope: Multiple components/modules working together
- Approach:
  - Test component with mocked providers
  - Verify interactions between components
  - Mock API calls but test data flow
- Example location: `app/screens/ReliefReportsFlow.test.tsx`
- Pattern:
  ```typescript
  function renderWithProviders(ui: React.ReactElement) {
    return render(
      <ThemeProvider>
        <NavigationContainer>{ui}</NavigationContainer>
      </ThemeProvider>,
    )
  }
  
  describe("Relief report review flow", () => {
    beforeEach(() => {
      jest.clearAllMocks()
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" })
    })
  })
  ```

**E2E Tests:**
- Framework: Maestro (native mobile UI testing)
- Location: `.maestro/flows/`
- Command: `npm run test:maestro`
- Approach: Test complete user flows through app UI
- Not Jest-based, separate testing framework

**Hook Testing:**
- Scope: Custom React hooks in isolation
- Limitation: Cannot directly call hooks outside React components
- Approach: Test hook behavior by requiring module and checking exports
- Example pattern (from `useProfile.test.ts`):
  ```typescript
  test("useProfile should be a valid React hook", () => {
    const { useProfile } = require("@/hooks/useProfile")
    expect(useProfile).toBeDefined()
    expect(typeof useProfile).toBe("function")
  })
  ```
- Alternative: Use custom test harness component if full hook testing needed

## Common Patterns

**Async Testing:**
```typescript
it("should load data asynchronously", async () => {
  const { getByText, queryByTestId } = render(<DataComponent />)
  
  // Initially loading
  expect(queryByTestId("spinner")).toBeTruthy()
  
  // Wait for async operation
  await waitFor(() => {
    expect(getByText("Data loaded")).toBeTruthy()
  })
})
```

**Error Testing:**
Pattern 1 - API errors:
```typescript
test("handles server errors", () => {
  expect(getGeneralApiProblem({ problem: "SERVER_ERROR" } as ApiErrorResponse<null>)).toEqual({
    kind: "server",
  })
})
```

Pattern 2 - Hook error handling:
```typescript
test("provides appropriate error messages for different error types", () => {
  const { useProfile } = require("@/hooks/useProfile")
  expect(useProfile).toBeDefined()
  // Hook should provide error handling for:
  // - unauthorized (401)
  // - forbidden (403)
  // - not-found (404)
  // - timeout, cannot-connect, server error, etc.
})
```

**State Testing:**
```typescript
it("should have default keys", () => {
  expect(storage.getAllKeys()).toEqual(["string", "object"])
})

it("should save strings", () => {
  saveString("string", "new string")
  expect(loadString("string")).toEqual("new string")
})
```

**Mock Return Value Setup:**
```typescript
beforeEach(() => {
  jest.clearAllMocks()
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" })
  Location.getCurrentPositionAsync.mockResolvedValue({
    coords: {
      latitude: 16.0544,
      longitude: 108.2022,
    },
  })
})
```

## Global Test Setup

**File:** `test/setup.ts`

**Contents:**
1. React Native mocking with Image resolution
2. i18next localization mocking
3. Expo localization mocking
4. Global variable declarations (e.g., `tron`, `__TEST__`)

**Applied to:** All Jest tests automatically via jest.config.js `setupFiles` option

**Key Setup Code:**
```typescript
jest.doMock("react-native", () => {
  return Object.setPrototypeOf(
    {
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn((_source) => mockFile),
        getSize: jest.fn((uri, success, failure) => success(100, 100)),
      },
    },
    ReactNative,
  )
})
```

## Test Configuration

**Jest Config Location:** `jest.config.js`

**Key Configurations:**
```javascript
{
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.expo/",
    "<rootDir>/app/components/Text.test.tsx", // Known NativeWind integration issue
  ],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/app/$1",
  },
}
```

**Module Name Mapping:**
- CSS modules: mapped to `identity-obj-proxy` (returns empty object)
- Path aliases: `@/` resolves to `app/` directory

## Debugging Tests

**Development:**
- Run in watch mode: `npm run test:watch`
- Watch specific file pattern: `npm run test:watch -- storage.test.ts`
- Run single test: `npm run test -- --testNamePattern="handles connection"`

**Logging in Tests:**
- Use `console.log()` - visible in test output
- Jest displays logs for failing tests automatically
- Use `--verbose` flag for more detail

**Common Issues:**
- Async tests timing out: Increase timeout with `jest.setTimeout(10000)`
- Mock not applying: Ensure mock is defined before import
- NativeWind integration: Known issue, excluded test in config

---

*Testing analysis: 2024-12-19*
