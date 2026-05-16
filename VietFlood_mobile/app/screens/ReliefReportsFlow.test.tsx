import { NavigationContainer } from "@react-navigation/native"
import { fireEvent, render, waitFor } from "@testing-library/react-native"
import { Linking } from "react-native"

import { ThemeProvider } from "@/theme/context"

import { ReliefReportDetailScreen } from "./ReliefReportDetailScreen"
import { ReportsScreen } from "./ReportsScreen"

jest.mock("react-native-webview", () => {
  const { View } = require("react-native")

  return {
    WebView: (props: Record<string, unknown>) => <View {...props} />,
  }
})

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 3,
  },
}))

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}))

jest.mock("@/services/api/reportService", () => ({
  reportService: {
    getAllReports: jest.fn(),
    getReportForRelief: jest.fn(),
    getUserReports: jest.fn(),
  },
}))

jest.spyOn(Linking, "openURL").mockResolvedValue()

const { useAuth } = require("@/context/AuthContext") as {
  useAuth: jest.Mock
}
const Location = require("expo-location") as {
  requestForegroundPermissionsAsync: jest.Mock
  getCurrentPositionAsync: jest.Mock
  getLastKnownPositionAsync: jest.Mock
}
const { reportService } = require("@/services/api/reportService") as {
  reportService: {
    getAllReports: jest.Mock
    getReportForRelief: jest.Mock
    getUserReports: jest.Mock
  }
}

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
    phone: "0900000000",
    first_name: "Lan",
    last_name: "Tran",
    role: "user",
    created_at: "2026-04-20 10:00:00",
    updated_at: "2026-04-22 10:00:00",
  },
}

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
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 16.0544,
        longitude: 108.2022,
      },
    })
    Location.getLastKnownPositionAsync.mockResolvedValue(null)
  })

  test.each(["relief", "coordinator", "admin"])(
    "shows a detail action for %s users and navigates with the selected report",
    async (role) => {
      useAuth.mockReturnValue({
        authRole: role,
        authUserId: 99,
      })
      reportService.getAllReports.mockResolvedValue({
        kind: "ok",
        data: {
          reports: [sampleReport],
          total: 1,
          page: 1,
          limit: 1,
        },
      })

      const navigation = {
        navigate: jest.fn(),
        canGoBack: jest.fn(() => false),
        setParams: jest.fn(),
      }

      const screen = renderWithProviders(
        <ReportsScreen
          navigation={navigation as any}
          route={{ key: "Reports", name: "Reports", params: undefined } as any}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Xem chi tiết")).toBeTruthy()
      })

      fireEvent.press(screen.getByText("Xem chi tiết"))

      expect(navigation.navigate).toHaveBeenCalledWith(
        "ReliefReportDetailScreen",
        expect.objectContaining({
          reportId: "42",
          report: sampleReport,
        }),
      )
    },
  )

  test.each(["relief", "coordinator", "admin"])(
    "shows the operational-feed empty state for %s users when no reports are available",
    async (role) => {
      useAuth.mockReturnValue({
        authRole: role,
        authUserId: 99,
      })
      reportService.getAllReports.mockResolvedValue({
        kind: "ok",
        data: {
          reports: [],
          total: 0,
          page: 1,
          limit: 20,
        },
      })

      const screen = renderWithProviders(
        <ReportsScreen
          navigation={{
            navigate: jest.fn(),
            canGoBack: jest.fn(() => false),
            setParams: jest.fn(),
          } as any}
          route={{ key: "Reports", name: "Reports", params: undefined } as any}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Chưa có báo cáo")).toBeTruthy()
        expect(screen.getByText("Hiện chưa có báo cáo nào trong bảng tin vận hành.")).toBeTruthy()
      })
    },
  )

  it("shows a loading state while the relief reports feed is being fetched", () => {
    useAuth.mockReturnValue({
      authRole: "relief",
      authUserId: 99,
    })
    reportService.getAllReports.mockReturnValue(new Promise(() => {}))

    const screen = renderWithProviders(
      <ReportsScreen
        navigation={{
          navigate: jest.fn(),
          canGoBack: jest.fn(() => false),
          setParams: jest.fn(),
        } as any}
        route={{ key: "Reports", name: "Reports", params: undefined } as any}
      />,
    )

    expect(screen.getAllByText("Đang tải tiêu đề báo cáo").length).toBeGreaterThan(0)
  })

  it("shows an error state when the relief reports feed cannot be loaded", async () => {
    useAuth.mockReturnValue({
      authRole: "admin",
      authUserId: 99,
    })
    reportService.getAllReports.mockResolvedValue({
      kind: "bad-data",
    })

    const screen = renderWithProviders(
      <ReportsScreen
        navigation={{
          navigate: jest.fn(),
          canGoBack: jest.fn(() => false),
          setParams: jest.fn(),
        } as any}
        route={{ key: "Reports", name: "Reports", params: undefined } as any}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Không tải được báo cáo")).toBeTruthy()
      expect(screen.getByText("Không tải được danh sách báo cáo.")).toBeTruthy()
    })
  })

  it("shows a loading state while report details are being fetched", () => {
    reportService.getReportForRelief.mockReturnValue(new Promise(() => {}))

    const screen = renderWithProviders(
      <ReliefReportDetailScreen
        navigation={{ goBack: jest.fn() } as any}
        route={
          {
            key: "ReliefReportDetailScreen",
            name: "ReliefReportDetailScreen",
            params: { reportId: "42" },
          } as any
        }
      />,
    )

    expect(screen.getByText("Đang tải chi tiết báo cáo...")).toBeTruthy()
  })

  it("shows an error state when the report cannot be loaded", async () => {
    reportService.getReportForRelief.mockResolvedValue({
      kind: "bad-data",
    })

    const screen = renderWithProviders(
      <ReliefReportDetailScreen
        navigation={{ goBack: jest.fn() } as any}
        route={
          {
            key: "ReliefReportDetailScreen",
            name: "ReliefReportDetailScreen",
            params: { reportId: "42" },
          } as any
        }
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Không thể tải chi tiết báo cáo.")).toBeTruthy()
    })
  })

  it("shows the non-map fallback when a preloaded report has no coordinates", async () => {
    const screen = renderWithProviders(
      <ReliefReportDetailScreen
        navigation={{ goBack: jest.fn() } as any}
        route={
          {
            key: "ReliefReportDetailScreen",
            name: "ReliefReportDetailScreen",
            params: {
              reportId: "42",
              report: {
                ...sampleReport,
                latitude: undefined,
                longitude: undefined,
              },
            },
          } as any
        }
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          "Báo cáo này chưa có tọa độ bản đồ nên chưa thể chỉ đường.",
        ),
      ).toBeTruthy()
    })
  })

  it("opens Google Maps directions from the response route section", async () => {
    const screen = renderWithProviders(
      <ReliefReportDetailScreen
        navigation={{ goBack: jest.fn() } as any}
        route={
          {
            key: "ReliefReportDetailScreen",
            name: "ReliefReportDetailScreen",
            params: {
              reportId: "42",
              report: sampleReport,
            },
          } as any
        }
      />,
    )

    const directionsButton = await waitFor(() => screen.getByText("Mở bằng Google Maps"))

    fireEvent.press(directionsButton)

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        "https://www.google.com/maps/dir/?api=1&destination=16.0678%2C108.2208&travelmode=driving&origin=16.0544%2C108.2022",
      )
    })
  })

  it("shows the location-permission fallback while keeping report details usable", async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" })

    const screen = renderWithProviders(
      <ReliefReportDetailScreen
        navigation={{ goBack: jest.fn() } as any}
        route={
          {
            key: "ReliefReportDetailScreen",
            name: "ReliefReportDetailScreen",
            params: {
              reportId: "42",
              report: sampleReport,
            },
          } as any
        }
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          "Hãy cho phép truy cập vị trí để tạo chỉ đường từ vị trí hiện tại của bạn.",
        ),
      ).toBeTruthy()
      expect(screen.getByText("Mở bằng Google Maps")).toBeTruthy()
      expect(screen.getByText("Thông tin vị trí")).toBeTruthy()
    })
  })
})
