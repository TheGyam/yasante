# Kalon App - Backend API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base Configuration](#base-configuration)
3. [Authentication & Authorization](#authentication--authorization)
4. [Request/Response Format](#requestresponse-format)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [Error Handling](#error-handling)
8. [Deep Linking](#deep-linking)
9. [File Upload Requirements](#file-upload-requirements)
10. [Security Considerations](#security-considerations)

---

## Overview

Kalon is a React Native mobile application built with Expo for hair care management. This document provides comprehensive API specifications for the backend engineer to implement a fully functional REST API.

### Key Features
- User authentication and profile management
- Hair profile tracking (texture, density, porosity, goals)
- Goal setting and progress tracking with photos
- Hair care routines and scheduling
- Mood board for hairstyle inspiration
- Treatment tracking and scheduling
- Educational content (articles and videos)
- Favorites/bookmarking system
- Monthly hairstyle tracking

### Technology Stack (Frontend)
- **Framework**: React Native with Expo
- **Routing**: Expo Router
- **State Management**: Zustand
- **API Client**: Axios
- **Data Fetching**: React Query (TanStack Query)
- **Deep Linking**: Custom URI scheme `kalon://`

---

## Base Configuration

### API Base URLs
- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.kalon.app`

### API Versioning
All endpoints should be prefixed with `/api/v1` (or your preferred versioning strategy).

### Content-Type
All requests and responses use `application/json` unless specified otherwise (e.g., file uploads).

### Timeout
Request timeout: **10 seconds**

---

## Authentication & Authorization

### Authentication Flow
The app uses a **JWT-based authentication** system with access tokens and refresh tokens.

### Token Structure

#### Access Token
- **Lifetime**: 15 minutes
- **Format**: JWT
- **Claims**: User ID, email, expiration time
- **Usage**: Included in `Authorization` header for all authenticated requests

#### Refresh Token
- **Lifetime**: 7-30 days (configurable)
- **Format**: JWT or opaque token
- **Usage**: Used to obtain new access tokens when the current one expires

### Request Headers
All authenticated requests must include:
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Token Refresh Flow
1. Client receives 401 Unauthorized response
2. Client automatically calls refresh token endpoint with refresh token
3. Server validates refresh token and returns new access token
4. Client retries original request with new access token
5. If refresh fails, client logs out user

---

## Request/Response Format

### Standard Response Format

#### Success Response
```json
{
  "data": <response_data>,
  "message": "Optional success message"
}
```

#### Error Response
```json
{
  "message": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Paginated Response
```json
{
  "data": [<array_of_items>],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `422` - Validation Error
- `500` - Internal Server Error

---

## Data Models

### User
```typescript
interface User {
  id: string;                    // UUID
  name: string;                  // User's full name
  email?: string;                // Email address (optional)
  avatarUri?: string;            // URL to avatar image
  hairProfile?: HairProfile;     // User's hair profile
  createdAt: string;             // ISO 8601 datetime
  updatedAt: string;             // ISO 8601 datetime
}
```

### HairProfile
```typescript
interface HairProfile {
  texture?: 'straight' | 'wavy' | 'curly' | 'coily' | 'kinky';
  density?: 'fine' | 'medium' | 'thick';
  porosity?: 'low' | 'medium' | 'high';
  goals?: ('growth' | 'health' | 'moisture' | 'strength' | 'color' | 'style')[];
  photoUri?: string;             // URL to hair photo
  completedAt?: string;          // ISO 8601 datetime when profile was completed
}
```

### Goal
```typescript
interface Goal {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  name: string;                  // Goal name
  description?: string;          // Optional description
  targetDate: string;            // ISO 8601 date
  successMetric?: string;        // How success is measured
  status: 'active' | 'completed' | 'archived';
  progress: number;              // 0-100
  createdAt: string;             // ISO 8601 datetime
  updatedAt: string;             // ISO 8601 datetime
}
```

### ProgressPhoto
```typescript
interface ProgressPhoto {
  id: string;                    // UUID
  goalId: string;                // Foreign key to Goal
  uri: string;                   // URL to full-size photo
  thumbnailUri?: string;         // URL to thumbnail
  date: string;                  // ISO 8601 date
  caption?: string;              // Optional caption
  location?: string;             // Optional location
  createdAt: string;             // ISO 8601 datetime
}
```

### Activity
```typescript
interface Activity {
  id: string;                    // UUID
  goalId: string;                // Foreign key to Goal
  type: 'trim' | 'color' | 'treatment' | 'wash' | 'style' | 'other';
  date: string;                  // ISO 8601 date
  notes?: string;                // Optional notes
  createdAt: string;             // ISO 8601 datetime
}
```

### Routine
```typescript
interface Routine {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  name: string;                  // Routine name
  description?: string;          // Optional description
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  steps: RoutineStep[];          // Array of routine steps
  scheduledTime?: string;        // HH:mm format (24-hour)
  daysOfWeek?: number[];         // 0-6, Sunday = 0
  reminderEnabled: boolean;      // Whether reminders are enabled
  reminderTime?: number;         // Minutes before scheduled time
  createdAt: string;             // ISO 8601 datetime
  updatedAt: string;             // ISO 8601 datetime
}

interface RoutineStep {
  id: string;                    // UUID
  name: string;                  // Step name
  duration: number;              // Duration in minutes
  order: number;                 // Order in routine (0-based)
}
```

### MonthlyHairstyle
```typescript
interface MonthlyHairstyle {
  id: string;                    // UUID
  month: string;                 // Format: "YYYY-MM" (e.g., "2024-01")
  userId: string;                // Foreign key to User
  photoUri: string;              // URL to photo
  thumbnailUri?: string;         // URL to thumbnail
  notes?: string;                // Optional notes
  createdAt: string;             // ISO 8601 datetime
  updatedAt: string;             // ISO 8601 datetime
}
```

### MoodBoardEntry
```typescript
interface MoodBoardEntry {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  month: string;                 // Format: "YYYY-MM" (e.g., "2024-01")
  name: string;                  // Hairstyle name
  mainPhotoUri: string;          // URL to thumbnail/main photo
  photos: string[];              // Array of up to 3 photo URLs
  stylistPrice: number;          // Stylist service fee
  hairPrice: number;             // Cost of hair extensions/materials
  stylistLocation: string;       // Location of stylist
  appointmentTime: string;       // ISO 8601 datetime
  monthColor?: string;           // Hex color code (e.g., "#FF5733")
  notes?: string;                // Optional notes
  completed?: boolean;           // Whether the style has been done
  createdAt: string;             // ISO 8601 datetime
  updatedAt: string;             // ISO 8601 datetime
}
```

### Treatment
```typescript
interface Treatment {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  name: string;                  // Treatment name
  frequency: 'daily' | 'every-2-days' | 'weekly' | 'specific-days' | 'custom';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  startDate: string;             // ISO 8601 date
  endDate?: string;              // ISO 8601 date (optional)
  numberOfSessions?: number;     // Optional, alternative to endDate
  duration?: number;             // Minutes per session
  specificDays?: number[];       // For specific-days frequency, 0-6, Sunday=0
  customFrequency?: string;      // For custom frequency
  reminderEnabled: boolean;      // Whether reminders are enabled
  reminderTime?: number;         // Minutes before scheduled time
  notes?: string;                // Optional notes
  sessions?: TreatmentSession[]; // Track completed sessions
  createdAt: string;             // ISO 8601 datetime
  updatedAt: string;             // ISO 8601 datetime
}

interface TreatmentSession {
  id: string;                    // UUID
  treatmentId: string;           // Foreign key to Treatment
  scheduledDate: string;         // ISO 8601 date
  completed: boolean;            // Whether session was completed
  completedAt?: string;          // ISO 8601 datetime
  notes?: string;                // Session-specific notes
  createdAt: string;             // ISO 8601 datetime
  updatedAt: string;             // ISO 8601 datetime
}
```

### Content
```typescript
interface Content {
  id: string;                    // UUID
  title: string;                 // Content title
  description: string;           // Content description
  type: 'article' | 'video';     // Content type
  topic: 'care' | 'styling' | 'products' | 'treatments' | 'color' | 'growth' | 'health' | 'tips';
  hairTypes: string[];           // Array of hair type identifiers
  thumbnailUri?: string;         // URL to thumbnail
  videoUri?: string;             // URL to video (for video type)
  articleContent?: string;       // HTML or markdown content (for article type)
  duration?: number;             // Duration in minutes (for videos)
  author?: string;               // Author name
  publishedAt: string;           // ISO 8601 datetime
  views?: number;                // View count
  likes?: number;                // Like count
}
```

### ProductRecommendation
```typescript
interface ProductRecommendation {
  id: string;                    // UUID
  name: string;                  // Product name
  brand?: string;                // Brand name
  description: string;           // Product description
  imageUri?: string;             // URL to product image
  link?: string;                 // External link to product
  category: 'shampoo' | 'conditioner' | 'treatment' | 'styling' | 'tool' | 'other';
}
```

### Favorite
```typescript
interface Favorite {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  contentId: string;             // Foreign key to Content
  createdAt: string;             // ISO 8601 datetime
}
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and return access/refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": "user-123",
      "name": "John Doe",
      "email": "user@example.com",
      "avatarUri": null,
      "hairProfile": null,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1704067200000
  }
}
```

**Error Responses:**
- `400` - Invalid email or password
- `422` - Validation error

**Notes:**
- `expiresAt` is a Unix timestamp in milliseconds
- Passwords should be hashed using bcrypt or similar
- Email comparison should be case-insensitive

---

#### POST /api/auth/signup
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response (201):**
```json
{
  "data": {
    "user": {
      "id": "user-123",
      "name": "John Doe",
      "email": "user@example.com",
      "avatarUri": null,
      "hairProfile": null,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1704067200000
  }
}
```

**Error Responses:**
- `409` - Email already registered
- `422` - Validation error (password strength, email format)

---

#### POST /api/auth/forgot-password
Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "data": {
    "message": "If an account exists with this email, a password reset link has been sent."
  }
}
```

**Notes:**
- Always return the same message regardless of whether email exists (security best practice)
- Generate a secure reset token (UUID or cryptographically random string)
- Store token with expiration (e.g., 1 hour)
- Send email with reset link containing token

---

#### POST /api/auth/reset-password
Reset password using a reset token.

**Request Body:**
```json
{
  "token": "reset-token-uuid",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

**Error Responses:**
- `400` - Invalid or expired reset token
- `422` - Validation error (password strength)

**Notes:**
- Validate token exists and hasn't expired
- Delete token after successful reset (one-time use)
- Hash new password before storing

---

#### POST /api/auth/refresh-token
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1704067200000
  }
}
```

**Error Responses:**
- `401` - Invalid or expired refresh token

**Notes:**
- Validate refresh token
- Optionally implement refresh token rotation for security
- Return new access token with same expiration time (15 minutes)

---

### User Endpoints

#### GET /api/users/:userId
Get user profile by ID.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": {
    "id": "user-123",
    "name": "John Doe",
    "email": "user@example.com",
    "avatarUri": "https://cdn.kalon.app/avatars/user-123.jpg",
    "hairProfile": {
      "texture": "curly",
      "density": "medium",
      "porosity": "high",
      "goals": ["growth", "moisture"],
      "photoUri": "https://cdn.kalon.app/hair/user-123.jpg",
      "completedAt": "2024-01-01T00:00:00Z"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - User not found

---

#### PATCH /api/users/:userId
Update user profile.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "avatarUri": "https://cdn.kalon.app/avatars/user-123.jpg"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "user-123",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "avatarUri": "https://cdn.kalon.app/avatars/user-123.jpg",
    "hairProfile": {...},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden (user can only update their own profile)
- `404` - User not found
- `409` - Email already in use

---

#### PATCH /api/users/:userId/hair-profile
Update user's hair profile.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "texture": "curly",
  "density": "medium",
  "porosity": "high",
  "goals": ["growth", "moisture"],
  "photoUri": "https://cdn.kalon.app/hair/user-123.jpg"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "user-123",
    "name": "John Doe",
    "email": "user@example.com",
    "hairProfile": {
      "texture": "curly",
      "density": "medium",
      "porosity": "high",
      "goals": ["growth", "moisture"],
      "photoUri": "https://cdn.kalon.app/hair/user-123.jpg",
      "completedAt": "2024-01-15T12:00:00Z"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `404` - User not found
- `422` - Validation error

**Notes:**
- Set `completedAt` timestamp when hair profile is first completed
- All fields are optional (partial update)

---

### Goals Endpoints

#### GET /api/users/:userId/goals
Get all goals for a user.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "goal-123",
      "userId": "user-123",
      "name": "Grow hair 6 inches",
      "description": "Long-term hair growth goal",
      "targetDate": "2024-12-31",
      "successMetric": "Length measurement",
      "status": "active",
      "progress": 45,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden

---

#### GET /api/goals/:goalId
Get a specific goal by ID.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": {
    "id": "goal-123",
    "userId": "user-123",
    "name": "Grow hair 6 inches",
    "description": "Long-term hair growth goal",
    "targetDate": "2024-12-31",
    "successMetric": "Length measurement",
    "status": "active",
    "progress": 45,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Goal not found

---

#### POST /api/goals
Create a new goal.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "userId": "user-123",
  "name": "Grow hair 6 inches",
  "description": "Long-term hair growth goal",
  "targetDate": "2024-12-31",
  "successMetric": "Length measurement",
  "status": "active",
  "progress": 0
}
```

**Response (201):**
```json
{
  "data": {
    "id": "goal-123",
    "userId": "user-123",
    "name": "Grow hair 6 inches",
    "description": "Long-term hair growth goal",
    "targetDate": "2024-12-31",
    "successMetric": "Length measurement",
    "status": "active",
    "progress": 0,
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden (userId must match authenticated user)
- `422` - Validation error

**Notes:**
- `userId` should be extracted from JWT token, not from request body (security)
- Validate `targetDate` is in the future
- Validate `progress` is between 0-100

---

#### PATCH /api/goals/:goalId
Update a goal.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "name": "Grow hair 8 inches",
  "progress": 50,
  "status": "active"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "goal-123",
    "userId": "user-123",
    "name": "Grow hair 8 inches",
    "description": "Long-term hair growth goal",
    "targetDate": "2024-12-31",
    "successMetric": "Length measurement",
    "status": "active",
    "progress": 50,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Goal not found
- `422` - Validation error

---

#### DELETE /api/goals/:goalId
Delete a goal.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": null
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Goal not found

**Notes:**
- Cascade delete related photos and activities (or handle soft delete)

---

### Progress Photos Endpoints

#### GET /api/goals/:goalId/photos
Get all photos for a specific goal.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "photo-123",
      "goalId": "goal-123",
      "uri": "https://cdn.kalon.app/photos/photo-123.jpg",
      "thumbnailUri": "https://cdn.kalon.app/photos/thumbnails/photo-123.jpg",
      "date": "2024-01-15",
      "caption": "Progress after 2 weeks",
      "location": "Home",
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Notes:**
- Sort by date descending (newest first)

---

#### POST /api/photos
Upload a progress photo.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
goalId: "goal-123"
photo: <file>
date: "2024-01-15"
caption: "Progress after 2 weeks"
location: "Home"
```

**Response (201):**
```json
{
  "data": {
    "id": "photo-123",
    "goalId": "goal-123",
    "uri": "https://cdn.kalon.app/photos/photo-123.jpg",
    "thumbnailUri": "https://cdn.kalon.app/photos/thumbnails/photo-123.jpg",
    "date": "2024-01-15",
    "caption": "Progress after 2 weeks",
    "location": "Home",
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Goal not found
- `422` - Validation error

**Notes:**
- Accept image formats: JPEG, PNG, WebP
- Generate thumbnail automatically (recommended size: 300x300px)
- Store full-size image and thumbnail in CDN/storage
- Return URLs to both images

---

#### DELETE /api/photos/:photoId
Delete a progress photo.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": null
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Photo not found

**Notes:**
- Delete both full-size image and thumbnail from storage

---

### Activities Endpoints

#### GET /api/goals/:goalId/activities
Get all activities for a specific goal.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "activity-123",
      "goalId": "goal-123",
      "type": "trim",
      "date": "2024-01-15",
      "notes": "Trimmed 2 inches",
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Notes:**
- Sort by date descending (newest first)

---

#### POST /api/activities
Create a new activity.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "goalId": "goal-123",
  "type": "trim",
  "date": "2024-01-15",
  "notes": "Trimmed 2 inches"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "activity-123",
    "goalId": "goal-123",
    "type": "trim",
    "date": "2024-01-15",
    "notes": "Trimmed 2 inches",
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Goal not found
- `422` - Validation error

---

### Routines Endpoints

#### GET /api/users/:userId/routines
Get all routines for a user.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "routine-123",
      "userId": "user-123",
      "name": "Weekly Deep Condition",
      "description": "Deep conditioning routine",
      "frequency": "weekly",
      "steps": [
        {
          "id": "step-1",
          "name": "Shampoo",
          "duration": 5,
          "order": 0
        },
        {
          "id": "step-2",
          "name": "Deep Condition",
          "duration": 30,
          "order": 1
        }
      ],
      "scheduledTime": "20:00",
      "daysOfWeek": [0, 3],
      "reminderEnabled": true,
      "reminderTime": 15,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### GET /api/routines/:routineId
Get a specific routine by ID.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": {
    "id": "routine-123",
    "userId": "user-123",
    "name": "Weekly Deep Condition",
    "description": "Deep conditioning routine",
    "frequency": "weekly",
    "steps": [...],
    "scheduledTime": "20:00",
    "daysOfWeek": [0, 3],
    "reminderEnabled": true,
    "reminderTime": 15,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### POST /api/routines
Create a new routine.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "userId": "user-123",
  "name": "Weekly Deep Condition",
  "description": "Deep conditioning routine",
  "frequency": "weekly",
  "steps": [
    {
      "name": "Shampoo",
      "duration": 5,
      "order": 0
    },
    {
      "name": "Deep Condition",
      "duration": 30,
      "order": 1
    }
  ],
  "scheduledTime": "20:00",
  "daysOfWeek": [0, 3],
  "reminderEnabled": true,
  "reminderTime": 15
}
```

**Response (201):**
```json
{
  "data": {
    "id": "routine-123",
    "userId": "user-123",
    "name": "Weekly Deep Condition",
    "description": "Deep conditioning routine",
    "frequency": "weekly",
    "steps": [
      {
        "id": "step-1",
        "name": "Shampoo",
        "duration": 5,
        "order": 0
      },
      {
        "id": "step-2",
        "name": "Deep Condition",
        "duration": 30,
        "order": 1
      }
    ],
    "scheduledTime": "20:00",
    "daysOfWeek": [0, 3],
    "reminderEnabled": true,
    "reminderTime": 15,
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `422` - Validation error

**Notes:**
- Generate IDs for steps automatically
- Validate `scheduledTime` format (HH:mm)
- Validate `daysOfWeek` values (0-6)

---

#### PATCH /api/routines/:routineId
Update a routine.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "name": "Updated Routine Name",
  "reminderEnabled": false
}
```

**Response (200):**
```json
{
  "data": {
    "id": "routine-123",
    "userId": "user-123",
    "name": "Updated Routine Name",
    "description": "Deep conditioning routine",
    "frequency": "weekly",
    "steps": [...],
    "scheduledTime": "20:00",
    "daysOfWeek": [0, 3],
    "reminderEnabled": false,
    "reminderTime": 15,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

#### DELETE /api/routines/:routineId
Delete a routine.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": null
}
```

---

### Monthly Hairstyles Endpoints

#### GET /api/users/:userId/hairstyles
Get monthly hairstyles for a user, optionally filtered by month.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `month` (optional): Format "YYYY-MM" (e.g., "2024-01")

**Response (200):**
```json
{
  "data": [
    {
      "id": "hairstyle-123",
      "month": "2024-01",
      "userId": "user-123",
      "photoUri": "https://cdn.kalon.app/hairstyles/hairstyle-123.jpg",
      "thumbnailUri": "https://cdn.kalon.app/hairstyles/thumbnails/hairstyle-123.jpg",
      "notes": "January hairstyle",
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

---

#### GET /api/hairstyles/:hairstyleId
Get a specific monthly hairstyle by ID.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": {
    "id": "hairstyle-123",
    "month": "2024-01",
    "userId": "user-123",
    "photoUri": "https://cdn.kalon.app/hairstyles/hairstyle-123.jpg",
    "thumbnailUri": "https://cdn.kalon.app/hairstyles/thumbnails/hairstyle-123.jpg",
    "notes": "January hairstyle",
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

#### POST /api/hairstyles
Create a new monthly hairstyle.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
userId: "user-123"
month: "2024-01"
photo: <file>
notes: "January hairstyle"
```

**Response (201):**
```json
{
  "data": {
    "id": "hairstyle-123",
    "month": "2024-01",
    "userId": "user-123",
    "photoUri": "https://cdn.kalon.app/hairstyles/hairstyle-123.jpg",
    "thumbnailUri": "https://cdn.kalon.app/hairstyles/thumbnails/hairstyle-123.jpg",
    "notes": "January hairstyle",
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `422` - Validation error

**Notes:**
- Validate `month` format (YYYY-MM)
- Generate thumbnail automatically
- Only one hairstyle per user per month (enforce uniqueness)

---

#### PATCH /api/hairstyles/:hairstyleId
Update a monthly hairstyle.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data (if updating photo)
```

**Request Body (Form Data, all optional):**
```
photo: <file>
notes: "Updated notes"
```

**Response (200):**
```json
{
  "data": {
    "id": "hairstyle-123",
    "month": "2024-01",
    "userId": "user-123",
    "photoUri": "https://cdn.kalon.app/hairstyles/hairstyle-123.jpg",
    "thumbnailUri": "https://cdn.kalon.app/hairstyles/thumbnails/hairstyle-123.jpg",
    "notes": "Updated notes",
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T13:00:00Z"
  }
}
```

---

#### DELETE /api/hairstyles/:hairstyleId
Delete a monthly hairstyle.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": null
}
```

---

### Mood Board Endpoints

#### GET /api/users/:userId/moodboard
Get all mood board entries for a user, optionally filtered by month.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `month` (optional): Format "YYYY-MM" (e.g., "2024-01")

**Response (200):**
```json
{
  "data": [
    {
      "id": "moodboard-123",
      "userId": "user-123",
      "month": "2024-01",
      "name": "Curly Bob",
      "mainPhotoUri": "https://cdn.kalon.app/moodboard/moodboard-123-main.jpg",
      "photos": [
        "https://cdn.kalon.app/moodboard/moodboard-123-1.jpg",
        "https://cdn.kalon.app/moodboard/moodboard-123-2.jpg",
        "https://cdn.kalon.app/moodboard/moodboard-123-3.jpg"
      ],
      "stylistPrice": 150.00,
      "hairPrice": 200.00,
      "stylistLocation": "123 Main St, New York, NY",
      "appointmentTime": "2024-01-20T14:00:00Z",
      "monthColor": "#FF5733",
      "notes": "Love this style!",
      "completed": false,
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Notes:**
- Sort by `createdAt` descending (newest first)
- `photos` array should contain maximum 3 URLs

---

#### GET /api/moodboard/:entryId
Get a specific mood board entry by ID.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": {
    "id": "moodboard-123",
    "userId": "user-123",
    "month": "2024-01",
    "name": "Curly Bob",
    "mainPhotoUri": "https://cdn.kalon.app/moodboard/moodboard-123-main.jpg",
    "photos": [...],
    "stylistPrice": 150.00,
    "hairPrice": 200.00,
    "stylistLocation": "123 Main St, New York, NY",
    "appointmentTime": "2024-01-20T14:00:00Z",
    "monthColor": "#FF5733",
    "notes": "Love this style!",
    "completed": false,
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

#### POST /api/moodboard
Create a new mood board entry.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
userId: "user-123"
month: "2024-01"
name: "Curly Bob"
photos: <file1>, <file2>, <file3> (up to 3 files)
stylistPrice: "150.00"
hairPrice: "200.00"
stylistLocation: "123 Main St, New York, NY"
appointmentTime: "2024-01-20T14:00:00Z"
monthColor: "#FF5733"
notes: "Love this style!"
```

**Response (201):**
```json
{
  "data": {
    "id": "moodboard-123",
    "userId": "user-123",
    "month": "2024-01",
    "name": "Curly Bob",
    "mainPhotoUri": "https://cdn.kalon.app/moodboard/moodboard-123-main.jpg",
    "photos": [
      "https://cdn.kalon.app/moodboard/moodboard-123-1.jpg",
      "https://cdn.kalon.app/moodboard/moodboard-123-2.jpg"
    ],
    "stylistPrice": 150.00,
    "hairPrice": 200.00,
    "stylistLocation": "123 Main St, New York, NY",
    "appointmentTime": "2024-01-20T14:00:00Z",
    "monthColor": "#FF5733",
    "notes": "Love this style!",
    "completed": false,
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `422` - Validation error

**Notes:**
- First photo becomes `mainPhotoUri`
- Maximum 3 photos per entry
- Validate `month` format (YYYY-MM)
- Validate `appointmentTime` is ISO 8601 datetime
- Validate `monthColor` is valid hex color

---

#### PATCH /api/moodboard/:entryId
Update a mood board entry.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data (if updating photos)
```

**Request Body (Form Data, all optional):**
```
name: "Updated Name"
photos: <file1>, <file2> (replaces existing photos)
stylistPrice: "160.00"
hairPrice: "210.00"
stylistLocation: "Updated location"
appointmentTime: "2024-01-21T14:00:00Z"
monthColor: "#FF5734"
notes: "Updated notes"
completed: "true"
```

**Response (200):**
```json
{
  "data": {
    "id": "moodboard-123",
    "userId": "user-123",
    "month": "2024-01",
    "name": "Updated Name",
    "mainPhotoUri": "https://cdn.kalon.app/moodboard/moodboard-123-main.jpg",
    "photos": [...],
    "stylistPrice": 160.00,
    "hairPrice": 210.00,
    "stylistLocation": "Updated location",
    "appointmentTime": "2024-01-21T14:00:00Z",
    "monthColor": "#FF5734",
    "notes": "Updated notes",
    "completed": true,
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T13:00:00Z"
  }
}
```

---

#### POST /api/moodboard/:entryId/photos
Add a photo to an existing mood board entry.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
photo: <file>
```

**Response (200):**
```json
{
  "data": {
    "id": "moodboard-123",
    "userId": "user-123",
    "month": "2024-01",
    "name": "Curly Bob",
    "mainPhotoUri": "https://cdn.kalon.app/moodboard/moodboard-123-main.jpg",
    "photos": [
      "https://cdn.kalon.app/moodboard/moodboard-123-1.jpg",
      "https://cdn.kalon.app/moodboard/moodboard-123-2.jpg",
      "https://cdn.kalon.app/moodboard/moodboard-123-3.jpg"
    ],
    "stylistPrice": 150.00,
    "hairPrice": 200.00,
    "stylistLocation": "123 Main St, New York, NY",
    "appointmentTime": "2024-01-20T14:00:00Z",
    "monthColor": "#FF5733",
    "notes": "Love this style!",
    "completed": false,
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T13:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Maximum 3 photos already reached
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Entry not found

**Notes:**
- If entry already has 3 photos, replace the last one
- Update `mainPhotoUri` if this is the first photo

---

#### DELETE /api/moodboard/:entryId
Delete a mood board entry.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": null
}
```

**Notes:**
- Delete all associated photos from storage

---

### Treatments Endpoints

#### GET /api/users/:userId/treatments
Get all treatments for a user.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "treatment-123",
      "userId": "user-123",
      "name": "Deep Conditioning",
      "frequency": "weekly",
      "timeOfDay": "evening",
      "startDate": "2024-01-01",
      "endDate": "2024-03-31",
      "numberOfSessions": null,
      "duration": 30,
      "specificDays": null,
      "customFrequency": null,
      "reminderEnabled": true,
      "reminderTime": 15,
      "notes": "Use protein treatment",
      "sessions": [
        {
          "id": "session-1",
          "treatmentId": "treatment-123",
          "scheduledDate": "2024-01-08",
          "completed": true,
          "completedAt": "2024-01-08T20:00:00Z",
          "notes": "Great results!",
          "createdAt": "2024-01-01T00:00:00Z",
          "updatedAt": "2024-01-08T20:00:00Z"
        }
      ],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-08T20:00:00Z"
    }
  ]
}
```

**Notes:**
- Sort by `createdAt` descending (newest first)

---

#### GET /api/treatments/:treatmentId
Get a specific treatment by ID.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": {
    "id": "treatment-123",
    "userId": "user-123",
    "name": "Deep Conditioning",
    "frequency": "weekly",
    "timeOfDay": "evening",
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "numberOfSessions": null,
    "duration": 30,
    "specificDays": null,
    "customFrequency": null,
    "reminderEnabled": true,
    "reminderTime": 15,
    "notes": "Use protein treatment",
    "sessions": [...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-08T20:00:00Z"
  }
}
```

---

#### POST /api/treatments
Create a new treatment.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "userId": "user-123",
  "name": "Deep Conditioning",
  "frequency": "weekly",
  "timeOfDay": "evening",
  "startDate": "2024-01-01",
  "endDate": "2024-03-31",
  "duration": 30,
  "reminderEnabled": true,
  "reminderTime": 15,
  "notes": "Use protein treatment"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "treatment-123",
    "userId": "user-123",
    "name": "Deep Conditioning",
    "frequency": "weekly",
    "timeOfDay": "evening",
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "numberOfSessions": null,
    "duration": 30,
    "specificDays": null,
    "customFrequency": null,
    "reminderEnabled": true,
    "reminderTime": 15,
    "notes": "Use protein treatment",
    "sessions": [],
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `422` - Validation error

**Notes:**
- If `frequency` is "specific-days", `specificDays` array is required
- If `frequency` is "custom", `customFrequency` string is required
- Validate `startDate` and `endDate` are valid dates
- Validate `endDate` is after `startDate`

---

#### PATCH /api/treatments/:treatmentId
Update a treatment.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "name": "Updated Treatment Name",
  "reminderEnabled": false
}
```

**Response (200):**
```json
{
  "data": {
    "id": "treatment-123",
    "userId": "user-123",
    "name": "Updated Treatment Name",
    "frequency": "weekly",
    "timeOfDay": "evening",
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "numberOfSessions": null,
    "duration": 30,
    "specificDays": null,
    "customFrequency": null,
    "reminderEnabled": false,
    "reminderTime": 15,
    "notes": "Use protein treatment",
    "sessions": [...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T13:00:00Z"
  }
}
```

---

#### DELETE /api/treatments/:treatmentId
Delete a treatment.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": null
}
```

**Notes:**
- Cascade delete related sessions

---

### Content Endpoints

#### GET /api/content
Get all content items with optional filtering and pagination.

**Headers:**
```
Authorization: Bearer {accessToken} (optional - content is public)
```

**Query Parameters:**
- `hairType` (optional): Filter by hair type
- `topic` (optional): Filter by topic ('care', 'styling', 'products', 'treatments', 'color', 'growth', 'health', 'tips')
- `type` (optional): Filter by type ('article', 'video')
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "data": [
    {
      "id": "content-123",
      "title": "How to Care for Curly Hair",
      "description": "A comprehensive guide to curly hair care",
      "type": "article",
      "topic": "care",
      "hairTypes": ["curly", "coily"],
      "thumbnailUri": "https://cdn.kalon.app/content/content-123-thumb.jpg",
      "videoUri": null,
      "articleContent": "<p>Article content in HTML...</p>",
      "duration": null,
      "author": "Hair Expert",
      "publishedAt": "2024-01-01T00:00:00Z",
      "views": 1250,
      "likes": 89
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Notes:**
- Content is public (no authentication required)
- Support multiple filters (AND logic)
- Sort by `publishedAt` descending (newest first)

---

#### GET /api/content/:contentId
Get a specific content item by ID.

**Headers:**
```
Authorization: Bearer {accessToken} (optional)
```

**Response (200):**
```json
{
  "data": {
    "id": "content-123",
    "title": "How to Care for Curly Hair",
    "description": "A comprehensive guide to curly hair care",
    "type": "article",
    "topic": "care",
    "hairTypes": ["curly", "coily"],
    "thumbnailUri": "https://cdn.kalon.app/content/content-123-thumb.jpg",
    "videoUri": null,
    "articleContent": "<p>Article content in HTML...</p>",
    "duration": null,
    "author": "Hair Expert",
    "publishedAt": "2024-01-01T00:00:00Z",
    "views": 1250,
    "likes": 89
  }
}
```

**Notes:**
- Increment `views` count when content is viewed

---

#### GET /api/content/search
Search content by query string.

**Headers:**
```
Authorization: Bearer {accessToken} (optional)
```

**Query Parameters:**
- `q` (required): Search query string

**Response (200):**
```json
{
  "data": [
    {
      "id": "content-123",
      "title": "How to Care for Curly Hair",
      "description": "A comprehensive guide to curly hair care",
      "type": "article",
      "topic": "care",
      "hairTypes": ["curly", "coily"],
      "thumbnailUri": "https://cdn.kalon.app/content/content-123-thumb.jpg",
      "videoUri": null,
      "articleContent": "<p>Article content in HTML...</p>",
      "duration": null,
      "author": "Hair Expert",
      "publishedAt": "2024-01-01T00:00:00Z",
      "views": 1250,
      "likes": 89
    }
  ]
}
```

**Notes:**
- Search in `title` and `description` fields
- Case-insensitive search
- Return results sorted by relevance or date

---

### Favorites Endpoints

#### GET /api/users/:userId/favorites
Get all favorites for a user.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "favorite-123",
      "userId": "user-123",
      "contentId": "content-123",
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Notes:**
- Sort by `createdAt` descending (newest first)
- Optionally include full content objects in response (populate)

---

#### POST /api/favorites/toggle
Toggle favorite status for a content item.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "userId": "user-123",
  "contentId": "content-123"
}
```

**Response (200):**
```json
{
  "data": {
    "isFavorite": true
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - Content not found

**Notes:**
- If favorite exists, remove it and return `isFavorite: false`
- If favorite doesn't exist, create it and return `isFavorite: true`
- This is an idempotent operation

---

#### GET /api/favorites/check
Check if a content item is favorited by a user.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `userId` (required): User ID
- `contentId` (required): Content ID

**Response (200):**
```json
{
  "data": true
}
```

**Error Responses:**
- `401` - Unauthorized

---

### Products Endpoints

#### GET /api/content/:contentId/products
Get product recommendations for a content item.

**Headers:**
```
Authorization: Bearer {accessToken} (optional)
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "product-123",
      "name": "Deep Conditioner",
      "brand": "Hair Care Co",
      "description": "Intensive deep conditioning treatment",
      "imageUri": "https://cdn.kalon.app/products/product-123.jpg",
      "link": "https://example.com/product",
      "category": "treatment"
    }
  ]
}
```

**Notes:**
- Products are public (no authentication required)
- Products are associated with content items

---

## Error Handling

### Standard Error Response Format
```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "status": 400,
  "details": {
    "field": "Specific field error message"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict (e.g., email already exists)
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

### Validation Errors
When validation fails, return `422` status with detailed field errors:
```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "status": 422,
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

---

## Deep Linking

The app uses a custom URI scheme `kalon://` for deep linking.

### Mood Board Deep Links
**Format:** `kalon://moodboard/{entryId}?name={name}&location={location}&appointmentTime={time}&stylistPrice={price}&hairPrice={price}`

**Example:**
```
kalon://moodboard/moodboard-123?name=Curly%20Bob&location=123%20Main%20St&appointmentTime=2024-01-20T14:00:00Z&stylistPrice=150&hairPrice=200
```

**Query Parameters:**
- `name` - Mood board entry name
- `location` - Stylist location
- `appointmentTime` - ISO 8601 datetime
- `stylistPrice` - Stylist price (number)
- `hairPrice` - Hair price (number)
- `monthColor` - Hex color (optional)
- `notes` - Notes (optional)

**Backend Requirements:**
- No backend action required for deep links
- Deep links are handled entirely by the mobile app
- The app will parse the link and navigate to the appropriate screen
- If the entry doesn't exist, the app should handle gracefully

### Treatment Deep Links
**Format:** `kalon://treatment/{treatmentId}?name={name}&frequency={frequency}&timeOfDay={timeOfDay}`

**Example:**
```
kalon://treatment/treatment-123?name=Deep%20Conditioning&frequency=weekly&timeOfDay=evening&duration=30
```

**Query Parameters:**
- `name` - Treatment name
- `frequency` - Treatment frequency
- `timeOfDay` - Time of day
- `duration` - Duration in minutes (optional)
- `startDate` - Start date (optional)
- `endDate` - End date (optional)
- `notes` - Notes (optional)

**Backend Requirements:**
- No backend action required for deep links
- Deep links are handled entirely by the mobile app

---

## File Upload Requirements

### Supported Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### Image Size Limits
- **Maximum file size**: 10 MB per image
- **Recommended dimensions**: 
  - Full-size: 1920x1920px (square) or 1920x1080px (landscape)
  - Thumbnail: 300x300px (square)

### Upload Endpoints
1. **Progress Photos**: `POST /api/photos`
2. **Monthly Hairstyles**: `POST /api/hairstyles`
3. **Mood Board Photos**: `POST /api/moodboard` and `POST /api/moodboard/:entryId/photos`
4. **User Avatar**: `PATCH /api/users/:userId` (avatarUri field)
5. **Hair Profile Photo**: `PATCH /api/users/:userId/hair-profile` (photoUri field)

### Image Processing Requirements
1. **Automatic Thumbnail Generation**: Generate thumbnails for all uploaded images
2. **Image Optimization**: Compress images to reduce file size while maintaining quality
3. **CDN Storage**: Store images in a CDN (e.g., AWS S3 + CloudFront, Cloudinary, etc.)
4. **URL Format**: Return full URLs to both original and thumbnail images

### Example Upload Flow
1. Client sends `multipart/form-data` request with image file
2. Server validates file type and size
3. Server processes image (resize, optimize, generate thumbnail)
4. Server uploads to CDN/storage
5. Server returns URLs in response

---

## Security Considerations

### Authentication Security
1. **Password Hashing**: Use bcrypt with salt rounds (minimum 10)
2. **JWT Security**: 
   - Use strong secret key
   - Set appropriate expiration times
   - Include user ID and email in claims
   - Sign with RS256 or HS256
3. **Refresh Token Rotation**: Consider implementing refresh token rotation for enhanced security
4. **Token Storage**: Store refresh tokens securely (hashed in database)

### Authorization
1. **User Isolation**: Users can only access their own data
2. **Resource Ownership**: Validate user ownership on all update/delete operations
3. **JWT Validation**: Validate JWT on every authenticated request

### Input Validation
1. **Email Validation**: Validate email format
2. **Password Strength**: Enforce password requirements
3. **SQL Injection Prevention**: Use parameterized queries
4. **XSS Prevention**: Sanitize user input
5. **File Upload Security**: 
   - Validate file types
   - Scan for malware
   - Limit file sizes
   - Store files outside web root

### Rate Limiting
Implement rate limiting to prevent abuse:
- **Authentication endpoints**: 5 requests per minute per IP
- **General API**: 100 requests per minute per user
- **File uploads**: 10 uploads per minute per user

### CORS
Configure CORS appropriately:
- Allow requests from mobile app domains
- Restrict to necessary HTTP methods
- Set appropriate headers

### Data Privacy
1. **PII Protection**: Encrypt sensitive user data
2. **GDPR Compliance**: Implement data deletion and export features
3. **Data Retention**: Define data retention policies

### HTTPS
- **Require HTTPS**: All API endpoints must use HTTPS in production
- **Certificate Validation**: Use valid SSL certificates

---

## Additional Notes

### Date/Time Formats
- **ISO 8601**: Use ISO 8601 format for all datetime fields (e.g., "2024-01-15T12:00:00Z")
- **Date Only**: Use ISO 8601 date format (e.g., "2024-01-15")
- **Time Only**: Use 24-hour format (e.g., "20:00")

### Pagination
- Default page size: 20 items
- Maximum page size: 100 items
- Include pagination metadata in response

### Sorting
- Default sort: `createdAt` descending (newest first)
- Allow custom sorting where applicable

### Filtering
- Support filtering by user ID, date ranges, status, etc.
- Use query parameters for filters
- Support multiple filters (AND logic)

### Caching
- Consider caching public content (articles, videos)
- Cache user profiles and frequently accessed data
- Implement cache invalidation strategies

### Database Recommendations
- Use UUIDs for all IDs (not auto-incrementing integers)
- Index frequently queried fields (userId, createdAt, etc.)
- Use soft deletes where appropriate (for audit trails)
- Implement database migrations for schema changes

### Testing
- Provide test credentials for development
- Include API documentation for testing tools (Postman, Insomnia)
- Document expected test data

---

## Contact & Support

For questions or clarifications about this API specification, please contact the frontend development team.

**App Name**: Kalon  
**Package Name**: com.kalon.app  
**Deep Link Scheme**: kalon://

---

*Last Updated: November 2025*

