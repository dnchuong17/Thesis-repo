import type { ErrorContext, ErrorReporter } from "./contracts"

export class FeatureError extends Error {
  context: ErrorContext

  constructor(message: string, context: ErrorContext) {
    super(message)
    this.name = "FeatureError"
    this.context = context
  }
}

export const consoleErrorReporter: ErrorReporter = {
  capture(error, context) {
    if (__DEV__) {
      console.error("[feature-error]", { context, error })
    }
  },
}
