/**
 * Shadow tokens for the design system.
 * Usage: `style={{ ...theme.shadows.md }}`
 */
export const shadows = {
  xs: {
    shadowColor: "#0B1D3D",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: "#0B1D3D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#0B1D3D",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  lg: {
    shadowColor: "#09111F",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  xl: {
    shadowColor: "#09111F",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 34,
    elevation: 10,
  },
} as const
