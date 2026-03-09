# API Services Implementation

## Overview
All API services have been implemented based on the Swagger specification from the backend. All services are now connected to the real backend API instead of mocks.

## Implemented Services

### 1. Authentication API (`src/api/services/authApi.ts`)
- ✅ `login()` - POST /api/auth/login/
- ✅ `signup()` - POST /api/auth/signup/
- ✅ `refreshToken()` - POST /api/auth/refresh-token/
- ✅ `forgotPassword()` - POST /api/auth/forgot-password/
- ✅ `resetPassword()` - POST /api/auth/reset-password/

### 2. User API (`src/api/services/userApi.ts`)
- ✅ `getProfile()` - GET /api/users/{id}/
- ✅ `updateProfile()` - PATCH /api/users/{id}/
- ✅ `updateHairProfile()` - PATCH /api/users/{id}/hair-profile/

### 3. Goals API (`src/api/services/goalsApi.ts`)
- ✅ `getAll()` - GET /api/goals/
- ✅ `getById()` - GET /api/goals/{id}/
- ✅ `create()` - POST /api/goals/
- ✅ `update()` - PATCH /api/goals/{id}/
- ✅ `delete()` - DELETE /api/goals/{id}/
- ✅ `getActivities()` - GET /api/goals/{id}/activities/
- ✅ `getPhotos()` - GET /api/goals/{id}/photos/

### 4. Activities API (`src/api/services/activitiesApi.ts`)
- ✅ `getAll()` - GET /api/goals/activities/
- ✅ `getById()` - GET /api/goals/activities/{id}/
- ✅ `create()` - POST /api/goals/activities/
- ✅ `update()` - PATCH /api/goals/activities/{id}/
- ✅ `delete()` - DELETE /api/goals/activities/{id}/

### 5. Photos API (`src/api/services/photosApi.ts`)
- ✅ `getAll()` - GET /api/goals/photos/
- ✅ `getById()` - GET /api/goals/photos/{id}/
- ✅ `create()` - POST /api/goals/photos/
- ✅ `update()` - PATCH /api/goals/photos/{id}/
- ✅ `delete()` - DELETE /api/goals/photos/{id}/

### 6. Routines API (`src/api/services/routinesApi.ts`)
- ✅ `getAll()` - GET /api/routines/routines/
- ✅ `getById()` - GET /api/routines/routines/{id}/
- ✅ `create()` - POST /api/routines/routines/
- ✅ `update()` - PATCH /api/routines/routines/{id}/
- ✅ `delete()` - DELETE /api/routines/routines/{id}/

### 7. Content API (`src/api/services/contentApi.ts`)
- ✅ `getAll()` - GET /api/content/content/
- ✅ `getById()` - GET /api/content/content/{id}/
- ✅ `search()` - GET /api/content/content/search/

### 8. Favorites API (`src/api/services/favoritesApi.ts`)
- ✅ `getAll()` - GET /api/content/favorites/
- ✅ `isFavorite()` - GET /api/content/favorites/check/
- ✅ `toggle()` - POST /api/content/favorites/toggle/
- ✅ `create()` - POST /api/content/favorites/
- ✅ `delete()` - DELETE /api/content/favorites/{id}/

### 9. Monthly Hairstyles API (`src/api/services/monthlyHairstylesApi.ts`)
- ✅ `getAll()` - GET /api/hairstyles/hairstyles/
- ✅ `getById()` - GET /api/hairstyles/hairstyles/{id}/
- ✅ `create()` - POST /api/hairstyles/hairstyles/
- ✅ `update()` - PATCH /api/hairstyles/hairstyles/{id}/
- ✅ `delete()` - DELETE /api/hairstyles/hairstyles/{id}/

### 10. Mood Board API (`src/api/services/moodBoardApi.ts`)
- ✅ `getAll()` - GET /api/hairstyles/moodboard/
- ✅ `getById()` - GET /api/hairstyles/moodboard/{id}/
- ✅ `create()` - POST /api/hairstyles/moodboard/
- ✅ `update()` - PATCH /api/hairstyles/moodboard/{id}/
- ✅ `delete()` - DELETE /api/hairstyles/moodboard/{id}/
- ✅ `addPhoto()` - POST /api/hairstyles/moodboard/{id}/photos/

### 11. Treatments API (`src/api/services/treatmentsApi.ts`)
- ✅ `getAll()` - GET /api/treatments/treatments/
- ✅ `getById()` - GET /api/treatments/treatments/{id}/
- ✅ `create()` - POST /api/treatments/treatments/
- ✅ `update()` - PATCH /api/treatments/treatments/{id}/
- ✅ `delete()` - DELETE /api/treatments/treatments/{id}/

## Features

### Consistent Implementation
- All services follow the same pattern and structure
- Type-safe TypeScript interfaces
- Comprehensive error handling
- Development logging for debugging

### Error Handling
- Network errors are caught and logged
- HTTP errors include status codes and response data
- Errors are properly typed and thrown for React Query

### Request/Response Transformation
- Handles paginated responses (DRF format with `count`, `results`, `next`, `previous`)
- Converts snake_case to camelCase where needed
- Transforms array responses to cursor-based pagination format for content API

### Authentication
- Automatic token refresh on 401 errors
- Token stored in auth store
- Authorization header automatically added to requests

## Usage

All services are exported from `src/api/client.ts`:

```typescript
import { api } from '@/api/client';

// Example: Get content
const content = await api.content.getAll({ topic: 'care' });

// Example: Login
const authResponse = await api.auth.login({ email, password });

// Example: Create goal
const goal = await api.goals.create({
  name: 'Grow hair 6 inches',
  target_date: '2024-12-31',
});
```

## Notes

- **Products API**: Still using mock implementation as it's not in the Swagger spec
- **Field Mapping**: Backend uses snake_case, frontend uses camelCase - transformation handled automatically
- **Pagination**: Most endpoints use DRF pagination format, content API uses array with client-side cursor pagination
- **Base URL**: Configured in `src/config/api.ts`

## Testing

To test the API integration:
1. Ensure backend is running and accessible
2. Check console logs for API requests (in development)
3. Verify responses match expected format
4. Test error scenarios (network failures, 404s, etc.)

## Next Steps

1. ✅ All API services implemented
2. ⏳ Test each service with real backend
3. ⏳ Add response transformation for field name mapping if backend doesn't return camelCase
4. ⏳ Implement retry logic for failed requests
5. ⏳ Add request/response caching strategies

