# Coding Conventions

**Analysis Date:** 2024-12-19

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `LoginScreen.tsx`, `BrandedHeader.tsx`, `Card.tsx`)
- Utilities/Hooks: camelCase (e.g., `useApiCall.ts`, `useProfile.ts`, `storage.ts`)
- Services: camelCase with Service suffix (e.g., `authService.ts`, `reportService.ts`)
- Test files: match source file name with `.test.ts` or `.test.tsx` suffix (e.g., `storage.test.ts`, `apiProblem.test.ts`)
- Style constants: $camelCase prefix (e.g., `$container`, `$actionContainer`, `$brandTitle`)

**Functions:**
- Regular functions: camelCase (e.g., `getErrorMessage`, `execute`, `reset`)
- React components: PascalCase (e.g., `LoginScreen`, `BrandedHeader`, `Card`)
- Hook functions: camelCase with `use` prefix (e.g., `useApiCall`, `useProfile`, `useAppTheme`)
- Event handlers: `on` + PascalCase (e.g., `onPress`, `onLeftPress`, `onRightPress`)
- Internal helper functions: camelCase with underscore prefix optional (e.g., `getErrorMessage`, `buildSessionForRoute`)

**Variables:**
- Regular variables: camelCase (e.g., `usernameInput`, `authPassword`, `isLoading`)
- Constants: UPPER_SNAKE_CASE (e.g., `NAVIGATION_PERSISTENCE_KEY`, `VALUE_OBJECT`)
- Unused parameters: prefix with underscore to suppress linting (e.g., `(_ref: ForwardedRef<RNText>)`, `(_error: any)`)
- State variables: descriptive camelCase, often with `is`/`has` prefix for booleans (e.g., `isAuthPasswordHidden`, `areFontsLoaded`)

**Types:**
- Interfaces: PascalCase (e.g., `BrandedHeaderProps`, `CardProps`, `AlertPayload`)
- Type aliases: PascalCase (e.g., `GeneralApiProblem`, `AuthContextType`, `UserRole`)
- Type unions/discriminated unions: descriptive PascalCase (e.g., `AlertVariant`, `AuthStatus`)
- Generic type parameters: single letter uppercase (T, U, K, V) or descriptive PascalCase for complex cases
- Props interfaces: ComponentName + `Props` suffix (e.g., `BrandedHeaderProps`, `LoginScreenProps`)

## Code Style

**Formatting:**
- Prettier is used for automatic code formatting
- Config location: `.prettierrc`
- Key settings:
  - `printWidth: 100` - Maximum line length
  - `semi: false` - No semicolons at end of statements
  - `singleQuote: false` - Double quotes preferred
  - `trailingComma: "all"` - Trailing commas in all valid places
  - `quoteProps: "consistent"` - Consistent quote style for object properties

**Linting:**
- ESLint is the primary linter
- Config location: `.eslintrc.js`
- Extended configs:
  - `plugin:@typescript-eslint/recommended`
  - `plugin:react/recommended`
  - `plugin:react-native/all`
  - `expo` - Expo-specific rules
  - `plugin:react/jsx-runtime` - JSX without React import
  - `prettier` - Prettier integration
- Key rules:
  - Prettier violations are treated as errors: `"prettier/prettier": "error"`
  - Unused variables must use leading underscore pattern: `argsIgnorePattern: "^_", varsIgnorePattern: "^_"`
  - No explicit `any` type in most cases: `@typescript-eslint/no-explicit-any: 0` (disabled)
  - ESLint commands:
    ```bash
    npm run lint        # Fix linting issues
    npm run lint:check  # Check without fixing
    ```

## Import Organization

**Order:**
The project enforces strict import ordering through ESLint's `import/order` rule:

1. **React and React Native** - Placed first
   - `react` imports
   - `react-native` imports
   - `expo*` packages (like `expo-font`, `expo-linking`)

2. **External Dependencies** - All other third-party packages in alphabetical order
   - Navigation libraries
   - UI component libraries
   - Redux and state management
   - Utility libraries

3. **Internal Aliases** - Project-specific imports using `@/` alias

4. **Relative Imports** - Local files within same/nearby directories
   - Parent directory files
   - Sibling files
   - Index exports

**Path Aliases:**
- `@/*` → `./app/*` (main app directory)
- `@assets/*` → `./assets/*` (assets directory)
- Example usage:
  ```typescript
  import { useAuth } from "@/context/AuthContext"
  import { Button } from "@/components/Button"
  import { Card } from "@/components/Card"
  ```

**Newline Requirements:**
- Blank line required after imports before code starts: `import/newline-after-import: 1`

## Error Handling

**Pattern:**
The project uses discriminated union types for API error handling through `GeneralApiProblem` type.

**Error Types** (defined in `app/services/api/apiProblem.ts`):
```typescript
export type GeneralApiProblem =
  | { kind: "timeout"; temporary: true }
  | { kind: "cannot-connect"; temporary: true }
  | { kind: "server" }
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "not-found" }
  | { kind: "rejected" }
  | { kind: "unknown"; temporary: true }
  | { kind: "bad-data" }
```

**API Error Handling Function:**
- `getGeneralApiProblem()` in `app/services/api/apiProblem.ts` maps API responses to `GeneralApiProblem`
- Maps HTTP status codes:
  - 401 → "unauthorized"
  - 403 → "forbidden"
  - 404 → "not-found"
  - 5xx → "server"
  - Other 4xx → "rejected"
- Handles network errors (CONNECTION_ERROR, NETWORK_ERROR, TIMEOUT_ERROR)
- Returns `null` for CANCEL_ERROR (silently ignored)

**Hook Error Handling** (see `useApiCall.ts`):
```typescript
const getErrorMessage = useCallback(
  (problem: GeneralApiProblem | null): string => {
    switch (problem.kind) {
      case "timeout":
        return "Request took too long. Please try again."
      case "cannot-connect":
        return "Cannot connect to server. Check your internet connection."
      // ... more cases
    }
  },
  [defaultErrorMessage],
)
```

**Component Error Handling Patterns:**
- State management: Use loading/error/data state triple (see `useApiCall`)
- User feedback: Global alerts via `useGlobalAlert()` context
- Validation errors: Set field-specific error state (e.g., `setUsernameError`)
- Try/catch blocks: Catch and provide user-friendly messages

**Global Error Context:**
- `GlobalAlertContext` at `app/context/GlobalAlertContext.tsx`
- Provides `showAlert()` function for displaying errors/messages to user
- Alert variants: `"success" | "error" | "info"`
- Example:
  ```typescript
  const { showAlert } = useGlobalAlert()
  showAlert({
    title: "Login Failed",
    description: authMessage || "Could not connect to server",
    variant: "error",
  })
  ```

## Logging

**Framework:** `console` object (native logging)

**Patterns:**
- Development-only logging guarded by `__DEV__`:
  ```typescript
  if (__DEV__) {
    console.error("Failed to restore session:", error)
  }
  ```
- Reactotron integration available for development (see `app/devtools/ReactotronConfig.ts`)
- ESLint rule prevents Reactotron in production: `"reactotron/no-tron-in-production": "error"`

**Debugging Tools:**
- Reactotron with react-native and MMKV storage plugins
- Metro debugger accessible in development
- Redux DevTools integration available through Reactotron

## Comments

**When to Comment:**
- Complex logic or non-obvious algorithms
- Important architectural decisions
- Component-level documentation
- Public API/exported functions
- Workarounds or temporary solutions

**JSDoc/TSDoc Style:**
- Used extensively for components and hooks
- Format:
  ```typescript
  /**
   * Modern glassmorphic branded header for main app navigation.
   * Features translucent frosted glass background with smooth blur effect.
   *
   * @param {BrandedHeaderProps} props - The props for the `BrandedHeader` component.
   * @returns {JSX.Element} The rendered `BrandedHeader` component.
   */
  ```

**Component Documentation Pattern:**
- TSDoc comments above function/class definition
- Parameter descriptions with types
- Return type description
- Usage examples in longer comments

**Inline Comments:**
- Explain "why" not "what"
- Use sparingly - code should be self-documenting
- Example:
  ```typescript
  // Glassmorphic effect through translucent background
  // BlurView would enhance this further if expo-blur is available
  ```

## Function Design

**Size Guidelines:**
- React components: typically 100-300 lines for screens, 50-150 for smaller components
- Hooks: 30-100 lines typically
- Service functions: 20-80 lines
- Break down larger functions into smaller named functions

**Parameters:**
- Props pattern for React components (single object parameter)
- Service functions: single parameter object when multiple args needed
- Callbacks: use specific naming (on* prefix)
- Optional parameters: marked with `?` in TypeScript
- Unused parameters: prefix with underscore

**Return Values:**
- Functions returning primitives: direct return
- Async functions: return Promise<T>
- API functions: return union types with `{ kind: "ok"; data: T } | GeneralApiProblem`
- Hooks: return object with state and callbacks
- Components: return JSX.Element or ReactNode

**Example Pattern** (from `useApiCall`):
```typescript
export function useApiCall<T = void>(
  apiFunction: ApiFunction<T>,
  defaultErrorMessage: string = "An error occurred",
): UseApiCallReturn<T> {
  // Implementation
  return {
    ...state,
    execute,
    reset,
    setError,
  }
}
```

## Module Design

**Exports:**
- Named exports preferred: `export const`, `export function`, `export interface`
- Default exports: used for components in some cases, but named exports are standard
- Barrel files: not heavily used, prefer specific imports
- Pattern:
  ```typescript
  export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
  ```

**Barrel Files:**
- Location: `index.ts` files in feature directories
- Example: `app/components/index.ts` might export common components
- Keep barrel exports explicit and minimal

## Validation

**Form Validation Pattern:**
- Live validation toggled by user interaction (focus/blur)
- Example (from `LoginScreen.tsx`):
  ```typescript
  const [usernameError, setUsernameError] = useState("")
  const [usernameLiveValidation, setUsernameLiveValidation] = useState(false)
  
  // Validate only when user has interacted
  if (usernameLiveValidation && !usernameInput) {
    setUsernameError("Username is required")
  }
  ```

**API Response Validation:**
- Type definitions enforced at compile time via TypeScript
- Example shapes in `app/services/api/types.ts`
- Bad data results in `{ kind: "bad-data" }` error

**Input Sanitization:**
- Handled through TypeScript types (no runtime sanitization visible in conventions)
- Text inputs use React Native's built-in handling

## TypeScript

**Configuration:**
- File: `tsconfig.json`
- Strict mode enabled: `"strict": true`
- NoImplicitAny: enabled
- NoImplicitReturns: enabled
- NoImplicitThis: enabled
- Source maps enabled for debugging
- Path mappings set up for `@/` alias

**Type Safety:**
- All function signatures typed
- No implicit `any` allowed in most cases (though `@typescript-eslint/no-explicit-any: 0` disables strict checking)
- Props interfaces required for all components
- Return types specified for functions (especially important for public APIs)

## Component Patterns

**Functional Components:**
- Use `FC` type or directly type component function
- Example:
  ```typescript
  export const BrandedHeader = (props: BrandedHeaderProps) => {
    // Component body
  }
  
  // Or with FC type:
  export const LoginScreen: FC<LoginScreenProps> = ({ navigation }) => {
    // Component body
  }
  ```

**Props Interface Pattern:**
- Named `ComponentName + Props`
- Extends screen props for navigation-aware components
- Comprehensive JSDoc
- Example:
  ```typescript
  export interface BrandedHeaderProps {
    /** Title/brand name to display in center */
    title?: string
    /** Icon that should appear on the left */
    leftIcon?: IconTypes
    onLeftPress?: () => void
    // ... more props
  }
  ```

**Styled Components:**
- Use $ prefix for style constants (ViewStyle, TextStyle, etc.)
- ThemedStyle<T> type for theme-aware styles
- Group styles at bottom of component file
- Example:
  ```typescript
  const $container: ThemedStyle<ViewStyle> = ({ isDark }) => ({
    width: "100%",
    // implementation
  })
  ```

**Custom Hooks:**
- `use` prefix required
- Return object with state and methods
- Support loading, error, and success states typically
- Type all returned values

---

*Convention analysis: 2024-12-19*
