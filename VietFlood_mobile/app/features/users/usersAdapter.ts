export type UserRoleValue = "resident" | "volunteer" | "coordinator" | "admin"

export interface UserOverviewModel {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  email: string
  phone: string
  province: string
  ward: string
  role: UserRoleValue
  createdAt: string
}

export interface UsersOverviewViewModel {
  users: UserOverviewModel[]
  total: number
}

export interface UsersOverviewResponse {
  users?: UserOverviewModel[]
}

export function adaptUsersOverviewData(feResponse: unknown): UsersOverviewViewModel {
  const data = typeof feResponse === "object" && feResponse ? feResponse : {}
  const users = Array.isArray((data as UsersOverviewResponse).users)
    ? ((data as UsersOverviewResponse).users as UserOverviewModel[])
    : []

  return {
    users,
    total: users.length,
  }
}

export function getMockUsersOverviewData(): UsersOverviewViewModel {
  return adaptUsersOverviewData({
    users: [
      {
        id: "USR-001",
        firstName: "Anh",
        middleName: "Minh",
        lastName: "Nguyen",
        email: "anh.minh.nguyen@vietflood.vn",
        phone: "+84 912 010 101",
        province: "Ho Chi Minh",
        ward: "Thu Duc",
        role: "admin",
        createdAt: "2026-01-15T07:00:00.000Z",
      },
      {
        id: "USR-002",
        firstName: "Lan",
        middleName: "Thu",
        lastName: "Pham",
        email: "lan.thu.pham@vietflood.vn",
        phone: "+84 912 010 102",
        province: "Da Nang",
        ward: "Hai Chau",
        role: "coordinator",
        createdAt: "2026-02-10T07:00:00.000Z",
      },
      {
        id: "USR-003",
        firstName: "Dung",
        lastName: "Tran",
        email: "dung.tran@vietflood.vn",
        phone: "+84 912 010 103",
        province: "Can Tho",
        ward: "Ninh Kieu",
        role: "volunteer",
        createdAt: "2026-02-18T07:00:00.000Z",
      },
      {
        id: "USR-004",
        firstName: "Linh",
        lastName: "Vo",
        email: "linh.vo@vietflood.vn",
        phone: "+84 912 010 104",
        province: "An Giang",
        ward: "Long Xuyen",
        role: "resident",
        createdAt: "2026-03-05T07:00:00.000Z",
      },
    ],
  })
}
