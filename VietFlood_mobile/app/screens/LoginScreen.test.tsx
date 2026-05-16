import { fireEvent, render, waitFor } from "@testing-library/react-native"

import { useAuth } from "@/context/AuthContext"
import { useGlobalAlert } from "@/context/GlobalAlertContext"
import { ThemeProvider } from "@/theme/context"
import { requestAndWarmReportLocationPrefill } from "@/utils/reportLocationPrefill"

import { LoginScreen } from "./LoginScreen"

const mockSetAuthUsername = jest.fn()
const mockLoginWithPassword = jest.fn()
const mockShowAlert = jest.fn()

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}))

jest.mock("@/context/GlobalAlertContext", () => ({
  useGlobalAlert: jest.fn(),
}))

jest.mock("@/utils/reportLocationPrefill", () => ({
  requestAndWarmReportLocationPrefill: jest.fn(),
}))

jest.mock("@rn-primitives/slot", () => ({
  Text: "Text",
}))

jest.mock("@/components/Screen", () => ({
  Screen: ({ children }: any) => children,
}))

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

jest.mock("react-native-reanimated", () => {
  const MockView = ({ children }: any) => children
  const Animated = {
    View: MockView,
    createAnimatedComponent: (Component: any) => Component,
  }
  const animation = {
    delay: jest.fn(() => animation),
    duration: jest.fn(() => animation),
    springify: jest.fn(() => animation),
  }

  return {
    __esModule: true,
    default: Animated,
    FadeInDown: animation,
    FadeInUp: animation,
    ReduceMotion: {
      System: "system",
      Always: "always",
      Never: "never",
    },
    ZoomIn: animation,
    useAnimatedStyle: jest.fn((factory) => factory()),
    useSharedValue: jest.fn((value) => ({ value })),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value) => value),
  }
})

function renderLoginScreen() {
  const navigation = {
    navigate: jest.fn(),
    reset: jest.fn(),
  }

  const screen = render(
    <ThemeProvider>
      <LoginScreen navigation={navigation as any} route={{ key: "Login", name: "Login" } as any} />
    </ThemeProvider>,
  )

  return { navigation, screen }
}

describe("LoginScreen username privacy", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requestAndWarmReportLocationPrefill as jest.Mock).mockResolvedValue({
      status: "granted",
      prefill: null,
    })
    ;(useAuth as jest.Mock).mockReturnValue({
      authUsername: "stored_user",
      setAuthUsername: mockSetAuthUsername,
      loginWithPassword: mockLoginWithPassword,
      authStatus: "idle",
      authMessage: undefined,
    })
    ;(useGlobalAlert as jest.Mock).mockReturnValue({ showAlert: mockShowAlert })
  })

  it("does not autofill the stored auth username", () => {
    const { screen } = renderLoginScreen()
    const usernameInput = screen.getByLabelText("Username")

    expect(usernameInput.props.value).toBe("")
    expect(usernameInput.props.autoComplete).toBe("off")
    expect(usernameInput.props.importantForAutofill).toBe("no")
    expect(usernameInput.props.textContentType).toBe("none")
  })

  it("does not persist username while the user types", () => {
    const { screen } = renderLoginScreen()

    fireEvent.changeText(screen.getByLabelText("Username"), "operator_one")

    expect(mockSetAuthUsername).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Username").props.value).toBe("operator_one")
  })

  it("does not clear persisted auth username after successful login", async () => {
    mockLoginWithPassword.mockResolvedValue("resident")
    const { navigation, screen } = renderLoginScreen()

    fireEvent.changeText(screen.getByLabelText("Username"), "operator_one")
    fireEvent.changeText(screen.getByLabelText("Password"), "secret1")
    fireEvent.press(screen.getByTestId("login-button"))

    await waitFor(() => {
      expect(mockLoginWithPassword).toHaveBeenCalledWith("operator_one", "secret1", true)
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: "ProfileHome" }],
      })
      expect(requestAndWarmReportLocationPrefill).toHaveBeenCalled()
    })
    expect(mockSetAuthUsername).not.toHaveBeenCalled()
  })

  it("passes a session-only choice when save session is turned off", async () => {
    mockLoginWithPassword.mockResolvedValue("resident")
    const { screen } = renderLoginScreen()

    fireEvent.changeText(screen.getByLabelText("Username"), "operator_one")
    fireEvent.changeText(screen.getByLabelText("Password"), "secret1")
    fireEvent.press(screen.getByTestId("save-session-toggle"))
    fireEvent.press(screen.getByTestId("login-button"))

    await waitFor(() => {
      expect(mockLoginWithPassword).toHaveBeenCalledWith("operator_one", "secret1", false)
    })
  })
})
