# Backend API Quick Reference

## 🚨 Priority 1: Critical for Current Features

### 1. Cursor-Based Pagination
**Status**: ✅ Frontend implemented, ⚠️ Backend needs to support

**Required Changes**:
- Support `cursor` query parameter (ISO 8601 timestamp)
- Return `nextCursor` and `hasMore` in pagination response
- Sort by `publishedAt DESC`
- Filter: `WHERE publishedAt < cursor`

**Example Request**:
```
GET /api/content?cursor=2024-01-15T10:00:00Z&limit=20
```

**Example Response**:
```json
{
  "data": [...],
  "pagination": {
    "cursor": "2024-01-15T10:00:00Z",
    "nextCursor": "2024-01-14T15:30:00Z",
    "hasMore": true,
    "limit": 20
  }
}
```

---

## 🔄 Priority 2: Performance Optimizations

### 2. New Posts Detection Endpoint
**Status**: ✅ Frontend polling implemented, 🔄 Backend endpoint recommended

**Recommended Endpoint**:
```
GET /api/content/new-posts?since=2024-01-15T10:00:00Z&limit=10
```

**Benefits**:
- More efficient than polling full first page
- Reduces server load
- Faster response times

---

### 3. Cache Headers
**Status**: ⚠️ Backend needs to implement

**Required Headers**:
```
Content List: Cache-Control: public, max-age=300, stale-while-revalidate=600
Content Detail: Cache-Control: public, max-age=1800, stale-while-revalidate=3600
Images: Cache-Control: public, max-age=31536000, immutable
```

---

## 📊 Priority 3: Nice to Have

### 4. Image Optimization
- Serve images through CDN
- Support WebP format
- Provide multiple sizes (thumbnail, medium, large)
- Include blurhash in responses (optional)

### 5. Batch Endpoint
```
GET /api/content/batch?ids=id1,id2,id3
```
For prefetching multiple items at once.

---

## 🗄️ Database Requirements

### Required Indexes
```sql
CREATE INDEX idx_content_published_at ON content(published_at DESC);
CREATE INDEX idx_content_topic ON content(topic);
CREATE INDEX idx_content_topic_published_at ON content(topic, published_at DESC);
```

---

## ⚡ Performance Targets

| Endpoint | Target | Current |
|----------|--------|---------|
| Content List | < 200ms | ? |
| Content Detail | < 150ms | ? |
| Related Content | < 250ms | ? |

---

## 📝 Testing Checklist

- [ ] Cursor pagination works correctly
- [ ] `hasMore` is accurate
- [ ] `nextCursor` is correct
- [ ] Filtering works with cursor pagination
- [ ] Response times meet targets
- [ ] Cache headers are set correctly
- [ ] Database indexes are created

---

## 🔗 Full Documentation

See `BACKEND_API_REQUIREMENTS.md` for complete details.

