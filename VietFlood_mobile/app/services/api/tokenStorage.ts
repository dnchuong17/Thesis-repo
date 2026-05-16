/**
 * Secure token storage utilities for managing authentication tokens.
 *
 * Uses expo-secure-store for secure device storage to prevent
 * unauthorized access to sensitive tokens.
 */
import * as SecureStore from "expo-secure-store"

const ACCESS_TOKEN_KEY = "auth_access_token"
const REFRESH_TOKEN_KEY = "auth_refresh_token"
const USER_ID_KEY = "auth_user_id"
const USERNAME_KEY = "auth_username"
const ROLE_KEY = "auth_role"

let sessionOnlyTokens: StoredTokens = {
  accessToken: null,
  refreshToken: null,
}

let sessionOnlyMetadata: StoredAuthMetadata = {
  userId: null,
  username: null,
  role: null,
}

function hasSessionOnlyToken() {
  return !!sessionOnlyTokens.accessToken
}

function clearSessionOnlyStorage() {
  sessionOnlyTokens = {
    accessToken: null,
    refreshToken: null,
  }
  sessionOnlyMetadata = {
    userId: null,
    username: null,
    role: null,
  }
}

async function clearSecureAuthStorage(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  await SecureStore.deleteItemAsync(USER_ID_KEY)
  await SecureStore.deleteItemAsync(USERNAME_KEY)
  await SecureStore.deleteItemAsync(ROLE_KEY)
}

export interface StoredTokens {
  accessToken: string | null
  refreshToken: string | null
}

export interface StoredAuthMetadata {
  userId: string | null
  username: string | null
  role: string | null
}

export interface AuthMetadataInput {
  userId?: string | number
  username?: string
  role?: string
}

/**
 * Save access and refresh tokens to secure storage
 */
export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  userId?: string | number,
): Promise<void> {
  try {
    clearSessionOnlyStorage()
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken)
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
    if (userId !== undefined && userId !== null) {
      await SecureStore.setItemAsync(USER_ID_KEY, String(userId))
    }
  } catch (error) {
    if (__DEV__) {
      console.error("Error saving tokens to secure storage:", error)
    }
    throw error
  }
}

/**
 * Save tokens for the current app session only.
 *
 * These tokens are intentionally kept out of SecureStore, so they work for
 * authenticated API calls until the process is restarted but cannot rehydrate
 * the user on a future app launch.
 */
export async function saveSessionTokens(
  accessToken: string,
  refreshToken: string,
  userId?: string | number,
): Promise<void> {
  try {
    await clearSecureAuthStorage()
    sessionOnlyTokens = {
      accessToken,
      refreshToken,
    }
    sessionOnlyMetadata = {
      ...sessionOnlyMetadata,
      userId: userId !== undefined && userId !== null ? String(userId) : sessionOnlyMetadata.userId,
    }
  } catch (error) {
    if (__DEV__) {
      console.error("Error saving session-only tokens:", error)
    }
    clearSessionOnlyStorage()
    throw error
  }
}

/**
 * Update whichever token store is active. Token refresh should preserve the
 * user's original save-session choice instead of making a temporary session durable.
 */
export async function saveActiveSessionTokens(
  accessToken: string,
  refreshToken: string,
  userId?: string | number,
): Promise<void> {
  if (hasSessionOnlyToken()) {
    await saveSessionTokens(accessToken, refreshToken, userId)
    return
  }

  await saveTokens(accessToken, refreshToken, userId)
}

/**
 * Save non-token auth metadata to secure storage.
 */
export async function saveAuthMetadata(metadata: AuthMetadataInput): Promise<void> {
  try {
    const writes: Promise<void>[] = []

    if (metadata.userId !== undefined && metadata.userId !== null) {
      writes.push(SecureStore.setItemAsync(USER_ID_KEY, String(metadata.userId)))
    }
    if (metadata.username) {
      writes.push(SecureStore.setItemAsync(USERNAME_KEY, metadata.username))
    }
    if (metadata.role) {
      writes.push(SecureStore.setItemAsync(ROLE_KEY, metadata.role))
    }

    await Promise.all(writes)
  } catch (error) {
    if (__DEV__) {
      console.error("Error saving auth metadata to secure storage:", error)
    }
    throw error
  }
}

/**
 * Save auth metadata for a session-only login.
 */
export async function saveSessionAuthMetadata(metadata: AuthMetadataInput): Promise<void> {
  sessionOnlyMetadata = {
    userId:
      metadata.userId !== undefined && metadata.userId !== null
        ? String(metadata.userId)
        : sessionOnlyMetadata.userId,
    username: metadata.username ?? sessionOnlyMetadata.username,
    role: metadata.role ?? sessionOnlyMetadata.role,
  }
}

/**
 * Retrieve non-token auth metadata from secure storage.
 */
export async function getAuthMetadata(): Promise<StoredAuthMetadata> {
  if (hasSessionOnlyToken()) {
    return sessionOnlyMetadata
  }

  const [userId, username, role] = await Promise.all([getUserId(), getUsername(), getRole()])

  return { userId, username, role }
}

/**
 * Retrieve tokens from secure storage
 */
export async function getTokens(): Promise<StoredTokens> {
  if (hasSessionOnlyToken()) {
    return sessionOnlyTokens
  }

  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)

    return {
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
    }
  } catch (error) {
    if (__DEV__) {
      console.error("Error retrieving tokens from secure storage:", error)
    }
    return {
      accessToken: null,
      refreshToken: null,
    }
  }
}

/**
 * Get access token from secure storage
 */
export async function getAccessToken(): Promise<string | null> {
  if (sessionOnlyTokens.accessToken) {
    return sessionOnlyTokens.accessToken
  }

  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
  } catch (error) {
    if (__DEV__) {
      console.error("Error retrieving access token:", error)
    }
    return null
  }
}

/**
 * Get refresh token from secure storage
 */
export async function getRefreshToken(): Promise<string | null> {
  if (sessionOnlyTokens.refreshToken) {
    return sessionOnlyTokens.refreshToken
  }

  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  } catch (error) {
    console.error("Error retrieving refresh token:", error)
    return null
  }
}

/**
 * Get stored user ID
 */
export async function getUserId(): Promise<string | null> {
  if (hasSessionOnlyToken()) {
    return sessionOnlyMetadata.userId
  }

  try {
    return await SecureStore.getItemAsync(USER_ID_KEY)
  } catch (error) {
    console.error("Error retrieving user ID:", error)
    return null
  }
}

/**
 * Save username in secure storage
 */
export async function saveUsername(username: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(USERNAME_KEY, username)
  } catch (error) {
    if (__DEV__) {
      console.error("Error saving username to secure storage:", error)
    }
    throw error
  }
}

/**
 * Save role in secure storage
 */
export async function saveRole(role: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ROLE_KEY, role)
  } catch (error) {
    if (__DEV__) {
      console.error("Error saving role to secure storage:", error)
    }
    throw error
  }
}

/**
 * Get stored username
 */
export async function getUsername(): Promise<string | null> {
  if (hasSessionOnlyToken()) {
    return sessionOnlyMetadata.username
  }

  try {
    return await SecureStore.getItemAsync(USERNAME_KEY)
  } catch (error) {
    if (__DEV__) {
      console.error("Error retrieving username:", error)
    }
    return null
  }
}

/**
 * Get stored role
 */
export async function getRole(): Promise<string | null> {
  if (hasSessionOnlyToken()) {
    return sessionOnlyMetadata.role
  }

  try {
    return await SecureStore.getItemAsync(ROLE_KEY)
  } catch (error) {
    if (__DEV__) {
      console.error("Error retrieving role:", error)
    }
    return null
  }
}

/**
 * Clear all tokens from secure storage
 */
export async function clearTokens(): Promise<void> {
  try {
    clearSessionOnlyStorage()
    await clearSecureAuthStorage()
  } catch (error) {
    console.error("Error clearing tokens from secure storage:", error)
    throw error
  }
}

/**
 * Check if tokens exist in secure storage
 */
export async function hasTokens(): Promise<boolean> {
  if (hasSessionOnlyToken()) {
    return true
  }

  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
    return !!accessToken
  } catch (error) {
    console.error("Error checking for tokens:", error)
    return false
  }
}
