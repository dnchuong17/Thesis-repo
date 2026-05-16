/**
 * Test Account Credentials - DEVELOPMENT ONLY
 *
 * This file contains hardcoded credentials for testing purposes only.
 * These credentials should NEVER be used in production environments.
 *
 * Usage:
 * - Import and use in development builds to test with different roles
 * - DO NOT include in production builds
 * - DO NOT commit changes to these credentials without team approval
 * - Coordinate with backend team to ensure test accounts are seeded
 *
 * Example:
 * ```
 * import { testAccountRelief, testAccountUser } from '@/config/testCredentials'
 * const { email, password, role } = testAccountRelief
 * ```
 */

// Test account with Relief Coordinator role for testing relief-specific features
export const testAccountRelief = {
  username: "dev_relief",
  password: "DevPass123!@#",
  role: "relief" as const,
}

// Test account with User role for testing standard user features
export const testAccountUser = {
  username: "dev_user",
  password: "DevPass123!@#",
  role: "user" as const,
}

// Default test account (relief coordinator)
export const testAccount = testAccountRelief
