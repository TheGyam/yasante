# Kalon App - Backend API Quick Reference

This is a quick reference guide for the backend engineer. For detailed specifications, see [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md).

## Essential Information

### Base URLs
- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.kalon.app`

### Authentication
- **Type**: JWT (Bearer tokens)
- **Access Token Lifetime**: 15 minutes
- **Refresh Token Lifetime**: 7-30 days
- **Header Format**: `Authorization: Bearer {accessToken}`

### Response Format
```json
{
  "data": <response_data>,
  "message": "Optional message"
}
```

## Endpoint Summary

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Register
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/refresh-token` - Refresh access token

### Users
- `GET /api/users/:userId` - Get user profile
- `PATCH /api/users/:userId` - Update user profile
- `PATCH /api/users/:userId/hair-profile` - Update hair profile

### Goals
- `GET /api/users/:userId/goals` - Get all goals
- `GET /api/goals/:goalId` - Get goal by ID
- `POST /api/goals` - Create goal
- `PATCH /api/goals/:goalId` - Update goal
- `DELETE /api/goals/:goalId` - Delete goal

### Progress Photos
- `GET /api/goals/:goalId/photos` - Get photos for goal
- `POST /api/photos` - Upload photo (multipart/form-data)
- `DELETE /api/photos/:photoId` - Delete photo

### Activities
- `GET /api/goals/:goalId/activities` - Get activities for goal
- `POST /api/activities` - Create activity

### Routines
- `GET /api/users/:userId/routines` - Get all routines
- `GET /api/routines/:routineId` - Get routine by ID
- `POST /api/routines` - Create routine
- `PATCH /api/routines/:routineId` - Update routine
- `DELETE /api/routines/:routineId` - Delete routine

### Monthly Hairstyles
- `GET /api/users/:userId/hairstyles?month=YYYY-MM` - Get hairstyles
- `GET /api/hairstyles/:hairstyleId` - Get hairstyle by ID
- `POST /api/hairstyles` - Create hairstyle (multipart/form-data)
- `PATCH /api/hairstyles/:hairstyleId` - Update hairstyle
- `DELETE /api/hairstyles/:hairstyleId` - Delete hairstyle

### Mood Board
- `GET /api/users/:userId/moodboard?month=YYYY-MM` - Get entries
- `GET /api/moodboard/:entryId` - Get entry by ID
- `POST /api/moodboard` - Create entry (multipart/form-data, up to 3 photos)
- `PATCH /api/moodboard/:entryId` - Update entry
- `POST /api/moodboard/:entryId/photos` - Add photo to entry
- `DELETE /api/moodboard/:entryId` - Delete entry

### Treatments
- `GET /api/users/:userId/treatments` - Get all treatments
- `GET /api/treatments/:treatmentId` - Get treatment by ID
- `POST /api/treatments` - Create treatment
- `PATCH /api/treatments/:treatmentId` - Update treatment
- `DELETE /api/treatments/:treatmentId` - Delete treatment

### Content (Public)
- `GET /api/content` - Get content (with filters & pagination)
- `GET /api/content/:contentId` - Get content by ID
- `GET /api/content/search?q=query` - Search content

### Favorites
- `GET /api/users/:userId/favorites` - Get favorites
- `POST /api/favorites/toggle` - Toggle favorite
- `GET /api/favorites/check?userId=:userId&contentId=:contentId` - Check favorite

### Products
- `GET /api/content/:contentId/products` - Get product recommendations

## Key Data Models

### User
```typescript
{
  id: string;
  name: string;
  email?: string;
  avatarUri?: string;
  hairProfile?: HairProfile;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### MoodBoardEntry
```typescript
{
  id: string;
  userId: string;
  month: string; // "YYYY-MM"
  name: string;
  mainPhotoUri: string;
  photos: string[]; // Max 3 URLs
  stylistPrice: number;
  hairPrice: number;
  stylistLocation: string;
  appointmentTime: string; // ISO 8601 datetime
  monthColor?: string; // Hex color
  notes?: string;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Treatment
```typescript
{
  id: string;
  userId: string;
  name: string;
  frequency: 'daily' | 'every-2-days' | 'weekly' | 'specific-days' | 'custom';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  startDate: string; // ISO 8601 date
  endDate?: string;
  duration?: number; // Minutes
  specificDays?: number[]; // 0-6, Sunday=0
  customFrequency?: string;
  reminderEnabled: boolean;
  reminderTime?: number; // Minutes before
  notes?: string;
  sessions?: TreatmentSession[];
  createdAt: string;
  updatedAt: string;
}
```

## File Upload Requirements

- **Formats**: JPEG, PNG, WebP
- **Max Size**: 10 MB per image
- **Thumbnails**: Auto-generate 300x300px thumbnails
- **Storage**: CDN (S3, Cloudinary, etc.)
- **Endpoints**: Use `multipart/form-data` for photo uploads

## Security Checklist

- [ ] Password hashing (bcrypt, min 10 rounds)
- [ ] JWT signing with strong secret
- [ ] User isolation (users can only access their own data)
- [ ] Input validation on all endpoints
- [ ] File upload validation (type, size, malware scan)
- [ ] Rate limiting (auth: 5/min, general: 100/min)
- [ ] HTTPS in production
- [ ] CORS configuration
- [ ] SQL injection prevention (parameterized queries)

## Important Notes

1. **User ID from JWT**: Extract `userId` from JWT token, not request body (security)
2. **Date Formats**: Always use ISO 8601 format
3. **Pagination**: Default 20 items, max 100 items
4. **Sorting**: Default by `createdAt` descending
5. **Deep Links**: Handled by mobile app, no backend action needed
6. **Content is Public**: Content endpoints don't require authentication

## Testing Credentials

**Email**: `demo@kalon.app`  
**Password**: `Demo123!@#`

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

---

For detailed specifications, see [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md).

