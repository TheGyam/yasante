# API Integration Documentation

## Overview

This document describes the integration with the backend API based on the Swagger specification.

**Swagger URL**: https://yasante.com/swagger/  
**Base Path**: `/api`  
**API Version**: v1

## Configuration

### Base URL

- **Base URL**: `https://yasante.com`

The base URL does NOT include `/api` as it's handled by the basePath in Swagger.

## Content API Endpoints

### List Content

- **Endpoint**: `GET /api/content/content/`
- **Query Parameters**:
  - `topic` (optional): Filter by topic (enum: care, styling, products, treatments, color, growth, health, tips)
  - `type` (optional): Filter by type (enum: article, video)
  - `search` (optional): Search term
  - `cursor` (optional): Cursor for pagination (ISO 8601 timestamp)
  - `limit` (optional): Number of items per page (default: 20)
- **Response**: Array of Content objects (direct array, not wrapped)

### Get Content by ID

- **Endpoint**: `GET /api/content/content/{id}/`
- **Path Parameters**:
  - `id` (required): UUID string
- **Response**: Content object

### Search Content

- **Endpoint**: `GET /api/content/content/search/`
- **Query Parameters**:
  - `search` (required): Search term
  - `topic` (optional): Filter by topic
  - `type` (optional): Filter by type
- **Response**: Array of Content objects

## Response Format Handling

The backend returns direct arrays for list/search endpoints, but the frontend expects cursor-based pagination format. The API service layer handles this transformation:

1. Receives array from backend
2. Applies client-side filtering (excludeId, cursor-based pagination)
3. Transforms to `CursorPaginatedResponse` format for frontend compatibility

## Field Name Mapping

The backend uses snake_case while the frontend uses camelCase. The API client handles this automatically through Axios response interceptors if needed, or the backend may return camelCase directly.

**Backend Fields** (from Swagger):

- `article_content` → `articleContent`
- `published_at` → `publishedAt`
- `thumbnail_uri` → `thumbnailUri`
- `video_uri` → `videoUri`
- `hair_types` → `hairTypes`

## Authentication

Most endpoints require JWT authentication via Bearer token:

```
Authorization: Bearer {accessToken}
```

The API client automatically adds the authorization header from the auth store.

## Error Handling

The API client includes comprehensive error handling:

- Network errors are logged with full details
- HTTP errors include status codes and response data
- All errors are properly typed and thrown for React Query to handle

## Debugging

In development mode, all API requests and responses are logged to the console:

- 📤 Request logs show method, URL, and headers
- ✅ Response logs show status and data length
- ❌ Error logs show full error details

## Testing

To test the API integration:

1. Ensure the backend is running and accessible
2. Check console logs for API requests
3. Verify responses match expected format
4. Test error scenarios (network failures, 404s, etc.)

## Next Steps

1. ✅ Content API endpoints implemented
2. ⏳ Implement other API services (auth, user, goals, etc.)
3. ⏳ Add response transformation for field name mapping if needed
4. ⏳ Add retry logic for failed requests
5. ⏳ Implement request/response caching strategies
