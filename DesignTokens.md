# Design Tokens Guide

This document explains how to use and extend the design token system in Kalon.

## Overview

All design values (colors, spacing, typography, etc.) are centralized in `src/theme/tokens.ts`. This ensures consistency across the app and makes it easy to update the brand or adjust the design system.

## Changing the Brand Color

To change the primary brand color, edit `src/theme/tokens.ts`:

```typescript
export const colors = {
  primary: '#5e1d31', // Change this value
  primaryVariant: '#4b1626',
  // ...
};
```

All components that use the primary color will automatically update.

## Token Categories

### Colors

Colors are organized by theme (light/dark) and semantic meaning:

- `primary`: Main brand color
- `accent`: Secondary brand color
- `background`: Main background color
- `surface`: Card/container background
- `text`: Text colors (high, medium, low, disabled)
- Semantic colors: `error`, `success`, `warning`, `info`

### Spacing

Spacing scale uses a 4px base unit:

```typescript
spacing[0] = 0
spacing[1] = 4px
spacing[2] = 8px
spacing[3] = 12px
spacing[4] = 16px
spacing[5] = 24px
spacing[6] = 32px
spacing[7] = 48px
```

### Typography

Font sizes follow a scale:

```typescript
fontSizes[0] = 12px  // caption
fontSizes[1] = 14px  // label
fontSizes[2] = 16px  // body
fontSizes[3] = 18px  // h3
fontSizes[4] = 22px  // h2
fontSizes[5] = 28px  // h1
fontSizes[6] = 34px  // display
```

### Radii

Border radius values:

- `small`: 8px
- `medium`: 14px
- `large`: 24px
- `round`: 9999px (for circular elements)

### Shadows

Elevation shadows for iOS and Android:

- `small`: Subtle elevation
- `medium`: Medium elevation
- `large`: High elevation

## Using Tokens in Components

### With styled-components

```typescript
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';

const Container = styled.View`
  padding: ${({ theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radii.medium}px;
`;
```

### With useTheme hook

```typescript
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { theme } = useTheme();
  
  return (
    <View style={{ 
      padding: theme.spacing[4],
      backgroundColor: theme.colors.primary 
    }}>
      {/* ... */}
    </View>
  );
}
```

## Adding New Tokens

1. Add the token to `src/theme/tokens.ts`
2. Update the `Theme` interface in `src/theme/ThemeProvider.tsx` if needed
3. Use the token in your components

## Best Practices

1. **Always use tokens** - Never hard-code colors, spacing, or sizes
2. **Use semantic colors** - Prefer `theme.colors.text.high` over `#000000`
3. **Respect theme** - Components should work in both light and dark modes
4. **Use spacing scale** - Stick to the spacing scale for consistency
5. **Responsive sizing** - Use responsive utilities for screen-size dependent values

## Theme Provider

The `ThemeProvider` wraps the app and provides theme context. It supports:

- Light mode
- Dark mode
- System preference (follows device setting)
- Manual override

Users can toggle themes in Settings, and the preference is persisted.

