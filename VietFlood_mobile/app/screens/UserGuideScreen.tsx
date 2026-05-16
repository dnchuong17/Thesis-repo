import { FC } from "react"
import { View, ViewStyle, ScrollView, Pressable } from "react-native"
import { ArrowLeftIcon } from "react-native-heroicons/outline"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface UserGuideScreenProps extends AppStackScreenProps<"UserGuideScreen"> {}

/**
 * UserGuideScreen - Provides help and guidance for using the app
 */
export const UserGuideScreen: FC<UserGuideScreenProps> = ({ navigation }) => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[themed($container), { backgroundColor: colors.background }]}
      safeAreaEdges={["top"]}
    >
      {/* Header */}
      <View style={[themed($header), { borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            themed($backButton),
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeftIcon size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text text="Hướng dẫn sử dụng" size="lg" weight="bold" />
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={themed($scrollContent)} scrollEnabled={true}>
        {/* Map Section */}
        <GuideSection
          title="Bản đồ thời tiết và ngập lụt"
          description="Theo dõi thời tiết theo thời gian thực và thông tin ngập lụt tại khu vực của bạn. Bản đồ tương tác hiển thị:"
          points={[
            "Hướng gió và tốc độ gió",
            "Cường độ mưa và dự báo lượng mưa",
            "Khu vực có nguy cơ ngập (nếu có dữ liệu)",
            "Nhiệt độ và độ ẩm",
          ]}
          colors={colors}
          themed={themed}
        />

        {/* Reports Section */}
        <GuideSection
          title="Quản lý báo cáo"
          description="Quản lý báo cáo thiên tai hiệu quả:"
          points={[
            "Xem danh sách người dùng đã gửi báo cáo",
            "Chạm vào một người dùng để xem toàn bộ báo cáo đã gửi",
            "Xem chi tiết báo cáo gồm vị trí, hình ảnh và trạng thái",
            "Theo dõi trạng thái: Chờ xử lý, Đang xử lý, Đã xử lý hoặc Đã từ chối",
            "Xem thông tin liên hệ của người báo cáo để phối hợp tiếp theo",
          ]}
          colors={colors}
          themed={themed}
        />

        {/* Report Detail Section */}
        <GuideSection
          title="Chi tiết báo cáo"
          description="Mỗi báo cáo bao gồm đầy đủ thông tin:"
          points={[
            "Mã báo cáo và danh mục (Ngập lụt, Sự cố, Khác)",
            "Mô tả chi tiết tình huống",
            "Bản đồ vị trí với tọa độ chính xác của báo cáo",
            "Tên và thông tin liên hệ của người báo cáo",
            "Ngày gửi và các lần cập nhật",
            "Ảnh hoặc bằng chứng đính kèm (nếu có)",
            "Trạng thái hiện tại và tiến trình xử lý",
          ]}
          colors={colors}
          themed={themed}
        />

        {/* Navigation Section */}
        <GuideSection
          title="Mẹo điều hướng"
          description="Cách di chuyển trong ứng dụng:"
          points={[
            "Thanh tab phía dưới (Bản đồ, Báo cáo, Cài đặt) là điều hướng chính",
            "Nút quay lại ở đầu mỗi màn hình đưa bạn về màn hình trước đó",
            "Chạm vào người dùng hoặc báo cáo để xem chi tiết sâu hơn",
            "Mục Cài đặt cho phép truy cập hồ sơ, mật khẩu và hướng dẫn",
          ]}
          colors={colors}
          themed={themed}
        />

        {/* Profile Section */}
        <GuideSection
          title="Hồ sơ và cài đặt"
          description="Quản lý tài khoản của bạn:"
          points={[
            "Xem hồ sơ - xem thông tin tài khoản hiện tại",
            "Cập nhật hồ sơ - chỉnh sửa tên, số điện thoại và ảnh đại diện",
            "Đổi mật khẩu - cập nhật mật khẩu tài khoản an toàn",
            "Đăng xuất - thoát khỏi ứng dụng một cách an toàn",
          ]}
          colors={colors}
          themed={themed}
        />

        {/* Tips Section */}
        <GuideSection
          title="Khuyến nghị sử dụng"
          description="Để ứng phó thiên tai hiệu quả:"
          points={[
            "Kiểm tra bản đồ thường xuyên để cập nhật thời tiết",
            "Xem các báo cáo mới sớm để đánh giá mức độ khẩn cấp",
            "Cập nhật trạng thái báo cáo theo tiến độ phản ứng",
            "Sử dụng tọa độ được cung cấp để di chuyển đến vị trí báo cáo",
            "Luôn cập nhật thông tin liên hệ trong phần hồ sơ",
            "Báo lại các sự cố hệ thống để cải thiện ứng dụng",
          ]}
          colors={colors}
          themed={themed}
        />

        {/* Footer */}
        <View style={[themed($footer), { borderTopColor: colors.border }]}>
          <Text
            text="Nếu cần hỗ trợ kỹ thuật, vui lòng liên hệ quản trị viên"
            size="xs"
            style={{ color: colors.textDim }}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}

interface GuideSectionProps {
  title: string
  description: string
  points: string[]
  colors: any
  themed: any
}

/**
 * Reusable guide section component
 */
const GuideSection: FC<GuideSectionProps> = ({ title, description, points, colors, themed }) => (
  <View style={themed($section)}>
    <Text text={title} size="sm" weight="bold" style={{ color: colors.text }} />
    <Text text={description} size="xs" style={{ color: colors.textDim, marginTop: 6 }} />
    <View style={{ marginTop: 8 }}>
      {points.map((point, index) => (
        <View key={index} style={$bulletPoint}>
          <Text text="•" size="xs" style={{ color: colors.statusInfo, marginRight: 6 }} />
          <Text text={point} size="xs" style={{ color: colors.text, flex: 1, lineHeight: 18 }} />
        </View>
      ))}
    </View>
  </View>
)

const $container: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $backButton: ThemedStyle<ViewStyle> = () => ({
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
})

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  gap: spacing.sm,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $bulletPoint: ViewStyle = {
  flexDirection: "row",
  marginBottom: 8,
}

const $footer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingTop: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  marginTop: spacing.md,
})
