# Kalon - Hair Wellness Planning App

A beautiful, modern mobile app for hairstyle planning and education built with Expo, React Native, and TypeScript.

## Features

- **Hair Wellness Planner**: Goal setting, progress tracking with photos, routine scheduling, and activity logging
- **Personalized Education Hub**: Hair profile quiz, filtered content library (articles + videos), favorites
- **Modern UI**: 
  - Floating animated tab bar with SVG icons
  - Rotating pop-culture greetings
  - Shared element transitions for media
  - Light/dark theme support
  - Smooth animations with Reanimated 4
  - Responsive design
- **Enhanced Profile**: Stats dashboard, active goals, favorites, and hair profile summary
- **Offline-First**: Mock API for development, easy to swap for real backend

## Tech Stack

- **Framework**: Expo (Managed Workflow)
- **Language**: TypeScript
- **Navigation**: Expo Router
- **Styling**: styled-components
- **State Management**: Zustand + React Query
- **Animations**: React Native Reanimated 4
- **Icons**: lucide-react-native
- **Media**: expo-video, react-native-shared-element
- **UI Components**: Custom component library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd kalon
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Run on iOS/Android
```bash
npm run ios
# or
npm run android
```

## Project Structure

```
/src
  /api              # Mock API and React Query hooks
  /assets           # Images, Lottie animations, icons
  /components       # Reusable UI components
    /ui            # Atomic components
    /composed      # Composed components
    /animations    # Animation wrappers
  /hooks           # Custom React hooks
  /navigation      # Navigation configuration
  /screens         # Screen components
  /services        # Image, notification, storage services
  /state           # Zustand stores
  /theme           # Design tokens and theme provider
  /types           # TypeScript type definitions
  /utils           # Utility functions
```

## Design Tokens

The app uses a centralized design token system. To change the brand color, edit `src/theme/tokens.ts`:

```typescript
export const colors = {
  primary: '#5e1d31', // Change this to update brand color
  // ...
};
```

All components use these tokens, so changing the primary color will update the entire app.

## Mock API

The app includes a simple in-app mock API for development. To seed/reset mock data:

```typescript
import { seedMockData } from '@/utils/seed';
seedMockData();
```

This is automatically called in dev mode on app start.

## Theme System

The app supports light, dark, and system themes. Users can toggle themes in Settings. The theme system uses styled-components with a ThemeProvider.

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Test Coverage

- Unit tests for `BottomTabBar` (tab navigation, animations)
- Unit tests for `GreetingBanner` (rotation logic)
- Unit tests for `greetings` utility (rotation, time-of-day)

## New Features

### Floating Tab Bar
- Full-width pill container with animated highlight
- SVG icons from lucide-react-native
- Spring animations with haptic feedback
- Keyboard-aware hiding

### Rotating Greetings
- Pop-culture inspired greetings that rotate each session
- Time-of-day contextual prefixes
- Animated entrance with gradient underline

### Shared Element Transitions
- Smooth thumbnail → fullscreen transitions for images and videos
- Poster-to-video crossfade for video content
- Drag-to-dismiss gesture support

### Enhanced Profile
- Quick stats dashboard (growth, goals, last photo, routines)
- Active goals list
- Favorites carousel
- Hair profile summary with badges

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## Development Notes

- The app uses Expo Router for file-based routing
- Mock API is in `src/api/mock/` - easy to swap for real backend
- All components are in `/src` directory
- Theme tokens are centralized in `src/theme/tokens.ts`
- Responsive utilities in `src/utils/responsive.ts`

## License

Private - All rights reserved

