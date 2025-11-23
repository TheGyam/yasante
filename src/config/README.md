# API Configuration

This directory contains centralized configuration for the API client.

## Configuration Priority

The API base URL is determined in the following order (highest to lowest priority):

1. **Environment Variable** (`EXPO_PUBLIC_API_BASE_URL`)
   - Set in `.env` file or environment
   - Highest priority for development/testing

2. **Expo Constants** (`app.json` → `extra.apiBaseUrl`)
   - Configured in `app.json`
   - Good for build-time configuration

3. **Hardcoded Fallback**
   - Development: `https://af4b3b4f74ab.ngrok-free.app`
   - Production: `https://api.kalon.app`

## Setup

### Option 1: Environment Variable (Recommended for Development)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your API URL:
   ```env
   EXPO_PUBLIC_API_BASE_URL=https://af4b3b4f74ab.ngrok-free.app
   ```

3. Restart your Expo development server

### Option 2: app.json Configuration

Update `app.json`:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://af4b3b4f74ab.ngrok-free.app"
    }
  }
}
```

## Usage

The configuration is automatically loaded when you import the API client:

```typescript
import { apiClient } from '@/api/client';
import { apiConfig, getApiUrl } from '@/config/api';

// Use the configured client
const response = await apiClient.get('/api/content');

// Access configuration
console.log(apiConfig.baseURL); // Current API base URL

// Build full URL for an endpoint
const fullUrl = getApiUrl('/api/auth/login');
```

## Features

- ✅ Environment-based configuration
- ✅ TypeScript support
- ✅ Configuration validation
- ✅ Automatic ngrok header handling
- ✅ Development/production fallbacks
- ✅ Error handling and logging

## Updating the API URL

### For Development (ngrok URL changes)

1. Update `.env` file:
   ```env
   EXPO_PUBLIC_API_BASE_URL=https://new-ngrok-url.ngrok-free.app
   ```

2. Restart Expo dev server

### For Production

Update `app.json` or set environment variable during build:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://api.kalon.app"
    }
  }
}
```

## Notes

- Environment variables prefixed with `EXPO_PUBLIC_` are embedded at build time
- The ngrok bypass header is automatically added when using ngrok URLs
- Configuration is validated on module load in development mode
- All API requests use the centralized configuration

