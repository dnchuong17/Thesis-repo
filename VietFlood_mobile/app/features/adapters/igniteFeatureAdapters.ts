import { createProfileHomeFeature } from "@/features/profile-home/profileHomeFeature"
import { createReliefFeature } from "@/features/relief/reliefFeature"
import { createReportsFeature } from "@/features/reports/reportsFeature"
import { createVolunteerFeature } from "@/features/volunteer/volunteerFeature"

export const igniteReportsAdapter = {
  reports: createReportsFeature(),
}

export const igniteReliefAdapter = {
  relief: createReliefFeature(),
}

export const igniteVolunteerAdapter = {
  volunteer: createVolunteerFeature(),
}

export const igniteProfileHomeAdapter = {
  profileHome: createProfileHomeFeature(),
}
