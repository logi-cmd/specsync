---
title: User Management API
version: 1.0.0
---

## API: GET /api/users

### Request
- page: number (default: 1)
- limit: number (1-100, default: 20)

### Response
- users: array
- total: number

### Business Rules
1. Maximum 100 users per request

## API: POST /api/users

### Request
- name: string (2-50 characters, required)
- email: string (email format, required)
- age: number (18-120, optional)
- role: enum (admin, user, guest)

### Response
- id: string
- createdAt: string

### Business Rules
1. Email must be unique
2. Name cannot contain special characters
3. Only admin can create admin users

## API: DELETE /api/users/:id

### Request
- id: string (required)

### Response
- success: boolean

### Business Rules
1. Cannot delete yourself
2. Admin can delete any user
3. User can only delete their own account
