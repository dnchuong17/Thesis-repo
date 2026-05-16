# Phase 1: Profile Management

**Objective:** Implement profile view and edit screens for both Citizen and Relief roles using existing authService.

**Duration:** 1 sprint (7 hours estimated)

## Goal

Users can view their own profile information and edit key fields (phone, address) through dedicated UI screens integrated with the backend auth APIs.

## Requirements

### Functional
- [ ] ProfileViewScreen displays user data from GET /auth/profile
- [ ] ProfileEditScreen allows updating profile via PUT /auth/update
- [ ] Form validation for required fields
- [ ] Loading/error states properly displayed
- [ ] Success/error feedback after save

### Non-Functional
- [ ] Follows existing app patterns (error handling, loading states)
- [ ] Uses authService for all API calls
- [ ] Type-safe TypeScript implementation
- [ ] NativeWind styling consistent with app theme
- [ ] Works for both Citizen and Relief roles

## Context

APIs are already implemented:
- `authService.getProfile()` - GET /auth/profile
- `authService.updateProfile()` - PUT /auth/update

Codebase uses:
- React Native + Expo
- TypeScript strict mode
- NativeWind for styling
- React Context for state management

## Tasks

1. **Profile View Screen**
   - Create `app/features/profile/screens/ProfileViewScreen.tsx`
   - Load user data on mount
   - Display: name, email, phone, address
   - Add "Edit Profile" button
   - Handle loading/error states

2. **Profile Edit Screen**
   - Create `app/features/profile/screens/ProfileEditScreen.tsx`
   - Pre-fill form with current user data
   - Allow editing: phone, province
   - Form validation
   - Submit via authService.updateProfile()
   - Navigate back on success

3. **Custom Hook for Reusability**
   - Create `app/hooks/useProfile.ts`
   - Encapsulate profile get/update logic
   - Handles loading, error, data states
   - Usable in multiple screens

4. **Navigation Setup**
   - Add ProfileViewScreen to AppNavigator
   - Add ProfileEditScreen to AppNavigator
   - Wire up navigation between screens
   - Add profile button to main navigation

5. **Testing**
   - Write integration test for profile view flow
   - Write integration test for profile edit flow
   - Test error handling
   - Test with real backend

## Implementation Strategy

### Sequential Execution (Dependency Flow)
```
1. Create useProfile hook (foundation)
   ↓
2. Create ProfileViewScreen (read-only first)
   ↓
3. Create ProfileEditScreen (builds on hook)
   ↓
4. Wire up navigation
   ↓
5. Write & run tests
```

### Code Patterns
- Error handling: Match authService.ts pattern
- Loading state: useState with try/catch
- Form submission: Controlled inputs with validation
- Navigation: Use React Navigation refs from existing setup

## Success Criteria

- [ ] ProfileViewScreen displays user data correctly
- [ ] ProfileEditScreen saves changes successfully
- [ ] Both screens handle loading states
- [ ] Errors display user-friendly messages
- [ ] Navigation between screens works
- [ ] Profile data updates immediately after save
- [ ] Works for both Citizen and Relief users
- [ ] All tests pass (unit + integration)
- [ ] No console errors or warnings

## Known Risks

- User data might not match between client and server (refresh after edit)
- Phone/address fields might have validation rules on backend
- Token expiry during long form edit (covered by refresh mechanism)

## Rollback Plan

If issues found:
- ProfileScreens can be hidden by removing navigation routes
- Falls back to existing auth flow
- No breaking changes to other features
