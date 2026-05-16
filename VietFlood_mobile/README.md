# Welcome to your new ignited app!

> The latest and greatest boilerplate for Infinite Red opinions

This is the boilerplate that [Infinite Red](https://infinite.red) uses as a way to test bleeding-edge changes to our React Native stack.

- [Quick start documentation](https://github.com/infinitered/ignite/blob/master/docs/boilerplate/Boilerplate.md)
- [Full documentation](https://github.com/infinitered/ignite/blob/master/docs/README.md)

## UI/UX Polish & Enterprise Standards
VietFlood Mobile implements enterprise-level UX patterns to serve aid workers efficiently under field conditions:
- **Consistent Typography:** Strict 4-level Mulish hierarchy (`TYPOGRAPHY_HIERARCHY.md`) enforced.
- **Component Abstraction:** Centralized and WCAG-compliant design tokens powering `Button`, `Card`, `TextField`, and `EmptyState`.
- **Micro-Interactions:** Subtle scale animations (0.98x active) and contextual state glows using NativeWind & React Native Reanimated.
- **Accessibility:** 44x44pt minimum touch targets, comprehensive `AccessibilityLabel` bindings, and semantic contrast tracking.

For component specifications and standards, please refer to `design-system.md`.

## Getting Started

```bash
pnpm install
pnpm run start
```

### Test Accounts (Development Only)

For local development and testing, the following test account credentials are available:

**Relief Coordinator Account:**
- **Email**: `test-relief@vietflood.local`
- **Password**: `Test123!@#`
- **Role**: Relief Coordinator

**Standard User Account:**
- **Email**: `test-user@vietflood.local`
- **Password**: `Test123!@#`
- **Role**: User

Both accounts provide access to test the application with different role permissions and RBAC-based features. The login screen does not pre-fill a username; enter the desired test account manually.

**Important**: These are development-only credentials. Ensure your backend has these test accounts seeded before attempting to login.

### Supported Languages

The VietFlood app supports the following languages:

- English (en)
- Vietnamese (vi)
- Arabic (ar)
- Spanish (es)
- French (fr)
- Hindi (hi)
- Japanese (ja)
- Korean (ko)

The app automatically detects and selects the device's language if it matches one of the supported languages. Users can also manually change the language in the application settings.

For information on adding new language translations, see `app/i18n/README.md` (if available) or the i18n configuration in `app/i18n/index.ts`.

To make things work on your local simulator, or on your phone, you need first to [run `eas build`](https://github.com/infinitered/ignite/blob/master/docs/expo/EAS.md). We have many shortcuts on `package.json` to make it easier:

```bash
pnpm run build:ios:sim # build for ios simulator
pnpm run build:ios:device # build for ios device
pnpm run build:ios:prod # build for ios device
```

### `./assets`

This directory is designed to organize and store various assets, making it easy for you to manage and use them in your application. The assets are further categorized into subdirectories, including `icons` and `images`:

```tree
assets
├── icons
└── images
```

**icons**
This is where your icon assets will live. These icons can be used for buttons, navigation elements, or any other UI components. The recommended format for icons is PNG, but other formats can be used as well.

Ignite comes with a built-in `Icon` component. You can find detailed usage instructions in the [docs](https://github.com/infinitered/ignite/blob/master/docs/boilerplate/app/components/Icon.md).

**images**
This is where your images will live, such as background images, logos, or any other graphics. You can use various formats such as PNG, JPEG, or GIF for your images.

Another valuable built-in component within Ignite is the `AutoImage` component. You can find detailed usage instructions in the [docs](https://github.com/infinitered/ignite/blob/master/docs/Components-AutoImage.md).

How to use your `icon` or `image` assets:

```typescript
import { Image } from 'react-native';

const MyComponent = () => {
  return (
    <Image source={require('assets/images/my_image.png')} />
  );
};
```

## Running Maestro end-to-end tests

Follow our [Maestro Setup](https://ignitecookbook.com/docs/recipes/MaestroSetup) recipe.

## Next Steps

### Ignite Cookbook

[Ignite Cookbook](https://ignitecookbook.com/) is an easy way for developers to browse and share code snippets (or “recipes”) that actually work.

### Upgrade Ignite boilerplate

Read our [Upgrade Guide](https://ignitecookbook.com/docs/recipes/UpdatingIgnite) to learn how to upgrade your Ignite project.

## Community

⭐️ Help us out by [starring on GitHub](https://github.com/infinitered/ignite), filing bug reports in [issues](https://github.com/infinitered/ignite/issues) or [ask questions](https://github.com/infinitered/ignite/discussions).

💬 Join us on [Slack](https://join.slack.com/t/infiniteredcommunity/shared_invite/zt-1f137np4h-zPTq_CbaRFUOR_glUFs2UA) to discuss.

📰 Make our Editor-in-chief happy by [reading the React Native Newsletter](https://reactnativenewsletter.com/).
