import type { FeatureResult } from "@/features/shared"
import type { AuthSession } from "@/features/shared"

export interface SignInPayload {
  email: string
  password: string
}

export interface AuthFeature {
  restoreSession(): Promise<AuthSession | null>
  signIn(input: SignInPayload): Promise<FeatureResult<AuthSession>>
  signOut(): Promise<void>
}
