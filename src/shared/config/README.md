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
   - Default: `https://yasante.com`

## Setup

### Option 1: Environment Variable (Recommended for Development)

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your API URL:

   ```env
   EXPO_PUBLIC_API_BASE_URL=https://yasante.com
   ```

3. Restart your Expo development server

### Option 2: app.json Configuration

Update `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://yasante.com"
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
- ✅ Error handling and logging

## Updating the API URL

Update `.env` or `app.json` with your API base URL (e.g. `https://yasante.com`), then restart the Expo dev server.

## Notes

- Environment variables prefixed with `EXPO_PUBLIC_` are embedded at build time
- Configuration is validated on module load in development mode
- All API requests use the centralized configuration
