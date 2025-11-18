<!-- 9bfea579-8efe-40ba-8d48-f3f4b19c6e17 31252f15-7698-49cc-818b-8f27a624fd64 -->
# Kalon MVP Frontend Development Plan

## Project Structure

```
Kalon/
├── app/                          # Expo Router app directory
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── planner/              # Planner tab
│   │   ├── education/            # Education Hub tab
│   │   └── profile/              # Profile/Quiz tab
│   ├── _layout.tsx               # Root layout with theme provider
│   └── index.tsx                 # Onboarding/Home screen
├── components/                   # Reusable components
│   ├── ui/                       # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── PhotoUpload.tsx
│   │   ├── VideoPlayer.tsx
│   │   └── ...
│   ├── animations/               # Reusable animation components
│   │   ├── FadeIn.tsx
│   │   ├── ScaleIn.tsx
│   │   ├── SlideIn.tsx
│   │   └── StaggeredList.tsx
│   ├── navigation/               # Navigation components
│   │   └── CustomTabBar.tsx
│   ├── planner/                  # Planner-specific components
│   │   ├── GoalCard.tsx
│   │   ├── ProgressTimeline.tsx
│   │   ├── RoutineBuilder.tsx
│   │   └── ActivityLog.tsx
│   ├── education/                # Education-specific components
│   │   ├── ContentCard.tsx
│   │   ├── HairProfileQuiz.tsx
│   │   ├── SearchBar.tsx
│   │   └── ProductRecommendation.tsx
│   └── shared/                   # Shared components
│       ├── Header.tsx
│       └── LoadingSpinner.tsx
├── constants/                    # Constants and mock data
│   ├── mockData.ts               # Mock data for all features
│   └── hairTypes.ts              # Hair type definitions
├── theme/                        # Theme configuration
│   ├── colors.ts                 # Color palette (light/dark)
│   ├── typography.ts             # Font sizes, weights, families
│   ├── spacing.ts                # Spacing scale
│   ├── sizes.ts                  # Responsive sizes
│   └── index.ts                  # Theme provider and hook
├── hooks/                        # Custom hooks
│   ├── useTheme.ts               # Theme hook
│   └── useResponsive.ts          # Responsive sizing hook
├── utils/                        # Utility functions
│   └── responsive.ts             # Responsive calculations
└── types/                        # TypeScript types
    ├── user.ts
    ├── planner.ts
    └── education.ts
```

## Implementation Steps

### 1. Project Setup & Configuration

- Initialize Expo project with TypeScript
- Configure Expo Router for navigation
- Set up ESLint and Prettier
- Install dependencies (expo-router, react-native-safe-area-context, expo-image, etc.)

### 2. Theme System

- Create `theme/colors.ts` with light/dark mode colors using #5e1d31 as primary
- Create `theme/typography.ts` with font scales
- Create `theme/spacing.ts` with consistent spacing scale
- Create `theme/sizes.ts` with responsive size utilities
- Create ThemeProvider context in `theme/index.ts`
- Create `hooks/useTheme.ts` for theme access

### 3. Base UI Components

- Build reusable Button component with variants
- Build Card component for content display
- Build Input component for forms
- Build PhotoUpload component for progress photos
- Build VideoPlayer component for educational videos
- All components use theme system and support dark/light mode

### 4. Mock Data Structure

- Create `constants/mockData.ts` with:
  - Mock user profiles
  - Mock goals and progress entries
  - Mock routines and schedules
  - Mock educational content (articles/videos)
  - Mock product recommendations
  - Mock hair type quiz questions

### 5. Hair Profile Quiz

- Create `components/education/HairProfileQuiz.tsx`
- Multi-step quiz flow for hair type, texture, porosity
- Store results in local state (mock user profile)
- Navigate to personalized content after completion

### 6. Planner Features

- **Goal Setting**: `app/(tabs)/planner/index.tsx` with goal creation/editing
- **Progress Tracker**: Timeline view with photo uploads (mock storage)
- **Routine Builder**: Weekly/monthly schedule builder with time pickers
- **Activity Log**: Form to log treatments and activities
- All use mock data stored in local state/Context

### 7. Education Hub

- **Content Library**: `app/(tabs)/education/index.tsx` with filtered content
- **Search**: Keyword search with filters (hair type, topic, content type)
- **Content Detail**: Article/video detail screens
- **Favorites**: Save/favorite functionality (local state)
- Content filtered by user's hair profile from quiz

### 8. Navigation & Layout

- Set up Expo Router with tab navigation
- Create root layout with ThemeProvider
- Add header components with theme toggle
- Implement navigation between screens

### 9. Responsive Design

- Create `utils/responsive.ts` for screen size calculations
- Apply responsive sizing to all components
- Test on different screen sizes

### 10. Polish & Styling

- Apply modern UI patterns (gradients, shadows, animations)
- Ensure WCAG 2.1 AA compliance for accessibility
- Add loading states and empty states
- Final styling pass for consistency

## Key Technical Decisions

- **Navigation**: Expo Router with file-based routing + custom bottom tab bar component
- **State Management**: Zustand for global state management with persistence (AsyncStorage), React Context API for theme only
- **UI Library**: Custom components built with React Native core + Reanimated 3 for animations
- **Mock Data**: TypeScript constants in `constants/mockData.ts`
- **Theme**: Context-based theme system with light/dark mode toggle
- **Responsive**: Custom hook using Dimensions API and responsive breakpoints
- **Animations**: React Native Reanimated 3 for smooth, performant animations
- **Design Philosophy**: Sleek, modern, clean UI with emphasis on excellent UX, micro-interactions, and visual hierarchy

## Files to Create

1. `app.json` - Expo configuration
2. `package.json` - Dependencies
3. `tsconfig.json` - TypeScript config
4. `theme/` directory - Complete theme system
5. `components/ui/` - Base UI components
6. `components/planner/` - Planner components
7. `components/education/` - Education components
8. `app/(tabs)/` - Main app screens
9. `constants/mockData.ts` - All mock data
10. `types/` - TypeScript type definitions

### To-dos

- [ ] Initialize Expo project with TypeScript, Expo Router, and install core dependencies
- [ ] Create complete theme system (colors, typography, spacing, sizes) with dark/light mode support using #5e1d31 as primary color
- [ ] Build reusable base UI components (Button, Card, Input, PhotoUpload, VideoPlayer) with theme integration
- [ ] Create comprehensive mock data structure for all MVP features (goals, progress, routines, content, products)
- [ ] Build Hair Profile Quiz component with multi-step flow and result storage
- [ ] Implement Planner tab with Goal Setting, Progress Tracker, Routine Builder, and Activity Log
- [ ] Build Education Hub with content library, search, filtering, and favorites functionality
- [ ] Set up Expo Router navigation with tabs, root layout, and theme provider integration
- [ ] Implement responsive sizing utilities and apply to all components
- [ ] Final styling pass with modern UI patterns, animations, loading states, and accessibility compliance