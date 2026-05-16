/**
 * Redux store configuration and setup
 */
import { configureStore } from "@reduxjs/toolkit"

import authReducer from "./authSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types that may contain non-serializable values
        ignoredActions: [
          "auth/signIn/fulfilled",
          "auth/register/fulfilled",
          "auth/refresh/fulfilled",
        ],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
