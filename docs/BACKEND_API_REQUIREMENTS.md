# Backend API Requirements

## Overview

This document outlines the API requirements for the Beauty app frontend, including cursor-based pagination, performance optimizations, and new features that require backend support.

---

## 1. Cursor-Based Pagination

### Implementation Status

✅ **Frontend**: Fully implemented with cursor-based pagination using `publishedAt` timestamps as cursors.

### API Requirements

#### Endpoint: `GET /api/content`

Supports both **offset-based** (legacy) and **cursor-based** pagination.

#### Query Parameters

| Parameter   | Type              | Required | Description                                                               |
| ----------- | ----------------- | -------- | ------------------------------------------------------------------------- |
| `cursor`    | string (ISO 8601) | No       | Timestamp cursor for pagination. Fetch items where `publishedAt < cursor` |
| `limit`     | number            | No       | Number of items per page (default: 20, max: 50)                           |
| `page`      | number            | No       | Page number (legacy offset-based pagination)                              |
| `hairType`  | string            | No       | Filter by hair type                                                       |
| `topic`     | string            | No       | Filter by topic (e.g., "tips", "care", "styling")                         |
| `type`      | string            | No       | Filter by content type (e.g., "video", "article")                         |
| `excludeId` | string            | No       | Exclude specific content ID (for related content)                         |

#### Response Format: Cursor-Based Pagination

```json
{
  "data": [
    {
      "id": "content-1",
      "title": "Hair Care Tips",
      "thumbnailUri": "https://example.com/image.jpg",
      "publishedAt": "2024-01-15T10:00:00Z",
      "topic": "tips",
      "type": "article",
      "hairTypes": ["curly", "straight"]
      // ... other content fields
    }
  ],
  "pagination": {
    "cursor": "2024-01-15T10:00:00Z",
    "nextCursor": "2024-01-14T15:30:00Z",
    "hasMore": true,
    "limit": 20
  }
}
```

#### Response Format: Offset-Based Pagination (Legacy)

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Implementation Notes

1. **Cursor Logic**:
   - When `cursor` is provided, use cursor-based pagination
   - Sort by `publishedAt DESC` (newest first)
   - Filter: `WHERE publishedAt < cursor`
   - Return items ordered by `publishedAt DESC`
   - `nextCursor` = `publishedAt` of the last item in the response
   - `hasMore` = `true` if there are more items after the current page

2. **Backward Compatibility**:
   - If `page` is provided without `cursor`, use offset-based pagination
   - This ensures existing endpoints continue to work

3. **Related Content**:
   - When `excludeId` is provided, exclude that content ID from results
   - Used for "More to explore" sections on detail pages

---

## 2. New Posts Detection

### Implementation Status

✅ **Frontend**: Polling mechanism implemented (15-second interval)

### API Requirements

#### Option A: Polling (Current Implementation)

Frontend polls the first page every 15 seconds to detect new posts.

**Recommended**: Implement a dedicated endpoint for efficiency.

#### Option B: Dedicated Endpoint (Recommended)

**Endpoint**: `GET /api/content/new-posts`

**Query Parameters**:

- `since`: ISO 8601 timestamp - Return posts published after this timestamp
- `limit`: number (default: 10)

**Response**:

```json
{
  "data": [...],
  "count": 5,
  "latestTimestamp": "2024-01-15T12:00:00Z"
}
```

#### Option C: WebSocket (Future Enhancement)

**WebSocket Endpoint**: `ws://api.example.com/ws/new-posts`

**Events**:

- `new_post`: Emitted when new content is published
  ```json
  {
    "type": "new_post",
    "content": { ... }
  }
  ```

**Implementation Priority**:

1. ✅ Polling (current)
2. 🔄 Dedicated endpoint (recommended)
3. ⏳ WebSocket (future)

---

## 3. Image Optimization

### Implementation Status

✅ **Frontend**: Using `expo-image` with aggressive caching (`memory-disk` policy)

### Backend Requirements

#### Image CDN & Optimization

1. **CDN**: Serve images through a CDN (CloudFront, Cloudflare, etc.)
2. **Image Formats**: Support WebP with fallback to JPEG/PNG
3. **Responsive Images**: Provide multiple sizes (thumbnail, medium, large)
4. **Cache Headers**: Set appropriate cache headers
   ```
   Cache-Control: public, max-age=31536000, immutable
   ```

#### Image Endpoints

Consider providing image URLs with size parameters:

- `/api/images/{id}?size=thumbnail` (300x300)
- `/api/images/{id}?size=medium` (800x800)
- `/api/images/{id}?size=large` (1200x1200)

#### Blurhash Support (Optional)

For better loading experience, include `blurhash` in content responses:

```json
{
  "id": "content-1",
  "thumbnailUri": "https://example.com/image.jpg",
  "blurhash": "LGF5]+Yk^6#M@-5c,1J5@[or[Q6.",
  ...
}
```

---

## 4. Cache Headers & ETags

### Implementation Status

✅ **Frontend**: React Query configured with 10-minute stale time, 30-minute cache time

### Backend Requirements

#### HTTP Cache Headers

Set appropriate cache headers for different endpoints:

**Content List** (frequently updated):

```
Cache-Control: public, max-age=300, stale-while-revalidate=600
ETag: "content-list-v1-abc123"
```

**Individual Content** (less frequently updated):

```
Cache-Control: public, max-age=1800, stale-while-revalidate=3600
ETag: "content-{id}-v1-xyz789"
```

**Static Assets** (images, etc.):

```
Cache-Control: public, max-age=31536000, immutable
```

#### ETag Support

- Implement ETag generation for content endpoints
- Support `If-None-Match` header for conditional requests
- Return `304 Not Modified` when content hasn't changed

---

## 5. Prefetching Support

### Implementation Status

✅ **Frontend**: Prefetching content detail and related content on item press

### Backend Requirements

#### Prefetch Endpoints

No special endpoints needed, but ensure:

1. **Fast Response Times**: Optimize database queries for prefetch requests
2. **Batch Support**: Consider batch endpoints for multiple content items
   ```
   GET /api/content/batch?ids=id1,id2,id3
   ```

#### Database Optimization

- Index `publishedAt` for cursor-based pagination
- Index `topic` for related content queries
- Use database connection pooling
- Consider read replicas for content queries

---

## 6. API Response Times

### Performance Targets

| Endpoint                  | Target Response Time | Priority |
| ------------------------- | -------------------- | -------- |
| Content List (first page) | < 200ms              | High     |
| Content List (paginated)  | < 300ms              | High     |
| Content Detail            | < 150ms              | High     |
| Related Content           | < 250ms              | Medium   |
| New Posts Check           | < 100ms              | Medium   |

### Optimization Strategies

1. **Database Indexing**: Ensure proper indexes on frequently queried fields
2. **Query Optimization**: Use efficient queries, avoid N+1 problems
3. **Caching**: Implement Redis/Memcached for frequently accessed data
4. **Pagination**: Use cursor-based pagination for better performance with large datasets

---

## 7. Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "CONTENT_NOT_FOUND",
    "message": "Content with ID 'xyz' not found",
    "status": 404
  }
}
```

### Error Codes

| Code                  | Status | Description           |
| --------------------- | ------ | --------------------- |
| `INVALID_CURSOR`      | 400    | Invalid cursor format |
| `CONTENT_NOT_FOUND`   | 404    | Content not found     |
| `RATE_LIMIT_EXCEEDED` | 429    | Too many requests     |
| `INTERNAL_ERROR`      | 500    | Server error          |

---

## 8. Rate Limiting

### Requirements

- Implement rate limiting to prevent abuse
- Return `429 Too Many Requests` with `Retry-After` header
- Recommended limits:
  - Content list: 60 requests/minute per IP
  - Content detail: 120 requests/minute per IP
  - New posts check: 30 requests/minute per IP

---

## 9. WebSocket Support (Future)

### Implementation Status

⏳ **Frontend**: Not yet implemented, but structure is ready

### WebSocket Events

#### New Post Notification

```json
{
  "type": "new_post",
  "payload": {
    "content": { ... },
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

#### Content Updated

```json
{
  "type": "content_updated",
  "payload": {
    "contentId": "content-1",
    "changes": { ... }
  }
}
```

---

## 10. Testing & Validation

### Test Cases for Backend

1. **Cursor Pagination**:
   - ✅ First page (no cursor)
   - ✅ Subsequent pages (with cursor)
   - ✅ Last page (hasMore: false)
   - ✅ Empty results
   - ✅ Invalid cursor format

2. **Filtering**:
   - ✅ Filter by topic
   - ✅ Filter by hairType
   - ✅ Filter by type
   - ✅ Exclude ID
   - ✅ Combined filters

3. **Performance**:
   - ✅ Response time < 300ms for paginated requests
   - ✅ Handles 1000+ items efficiently
   - ✅ Database query optimization

---

## 11. Migration Guide

### From Offset to Cursor Pagination

1. **Phase 1**: Support both pagination methods (current state)
2. **Phase 2**: Migrate all endpoints to cursor-based
3. **Phase 3**: Deprecate offset-based pagination

### Database Changes Required

```sql
-- Add index for cursor-based pagination
CREATE INDEX idx_content_published_at ON content(published_at DESC);

-- Add index for topic filtering
CREATE INDEX idx_content_topic ON content(topic);

-- Composite index for common queries
CREATE INDEX idx_content_topic_published_at ON content(topic, published_at DESC);
```

---

## 12. Contact & Questions

For questions or clarifications about these requirements, please contact the frontend team.

**Last Updated**: January 2024
**Frontend Version**: v2.0.0 (with cursor pagination & performance optimizations)
