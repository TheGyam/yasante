# Yasante App - Backend API Documentation

Welcome! This folder contains comprehensive API documentation for the Yasante mobile app backend implementation.

## Documentation Files

### 📘 [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md)
**Complete API Specification** - This is the main documentation file containing:
- Detailed endpoint specifications
- Request/response formats
- Data models and TypeScript interfaces
- Authentication and authorization details
- Error handling guidelines
- Security considerations
- File upload requirements
- Deep linking information

**Start here for comprehensive understanding.**

### ⚡ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
**Quick Reference Guide** - A condensed version for quick lookups:
- Endpoint summary
- Key data models
- Security checklist
- Common status codes
- Testing credentials

**Use this for quick reference during development.**

## Getting Started

1. **Read the Overview** in `BACKEND_API_DOCUMENTATION.md` to understand the app architecture
2. **Review Authentication** section to understand the JWT flow
3. **Study Data Models** to understand the data structures
4. **Reference Endpoints** as you implement each feature
5. **Check Security Considerations** before deploying

## Key Points

- **Base URL**: `https://yasante.com`
- **Authentication**: JWT Bearer tokens (15 min access, 7-30 day refresh)
- **Response Format**: All responses wrapped in `{ data: ... }` format
- **File Uploads**: Use `multipart/form-data` for images
- **Date Format**: ISO 8601 for all dates/times

## Questions?

If you have questions or need clarifications:
1. Check the detailed documentation first
2. Review the TypeScript types in the frontend codebase (`src/types/`)
3. Contact the frontend development team

## App Information

- **App Name**: Yasante
- **Package**: com.yasante.app
- **Deep Link Scheme**: yasante://
- **Framework**: React Native with Expo

---

Happy coding! 🚀

