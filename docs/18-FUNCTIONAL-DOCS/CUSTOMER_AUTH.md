# Customer Authentication

## Overview

Power Plunge uses a custom authentication system for customer accounts, supporting email/password registration, magic link (passwordless) login, and JWT-based session management. Session tokens are stored in localStorage on the client and passed as Bearer tokens in API requests.

## Authentication Methods

### Email & Password

**Registration** (`POST /api/customer/auth/register`):
- Requires: email, password (min 8 characters), name
- Email is normalized (lowercase, trimmed)
- Password is hashed using `bcrypt` with salt rounds of 10
- If an account exists without a password (created via guest checkout), the password is added
- Returns a session token on success

**Login** (`POST /api/customer/auth/login`):
- Validates email and password against stored hash
- Checks account is not disabled
- Returns session token and customer profile on success
- Rate limited to prevent brute force attacks

### Magic Link (Passwordless)

**Request Link** (`POST /api/customer/auth/magic-link`):
- Accepts an email address
- Generates a time-limited token and sends an email with a login link
- Response is deliberately vague to prevent email enumeration
- Rate limited separately from password login

**Verify Link** (`POST /api/customer/auth/verify-magic-link`):
- Validates the magic link token
- Checks token hasn't expired
- Checks customer account is not disabled
- Creates a session token on success

### Password Reset

**Request Reset** (`POST /api/customer/auth/forgot-password`):
- Sends a password reset email with a time-limited token
- Same vague response pattern as magic links

**Reset Password** (`POST /api/customer/auth/reset-password`):
- Validates reset token
- Updates password hash
- Invalidates the reset token after use

## Session Management

### Token Format

Sessions use JWT tokens containing:
- `customerId` - The customer's UUID
- `email` - Customer email address
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp

### Client-Side Storage

- Tokens are stored in `localStorage` under a consistent key
- The `useAuth` hook manages token lifecycle on the frontend
- Tokens are included in requests via `Authorization: Bearer <token>` header

### Session Verification

`POST /api/customer/auth/verify-session`:
- Validates the JWT token signature and expiration
- Confirms the customer still exists and is not disabled
- Returns customer profile data if valid

### Middleware

The `requireCustomerAuth` middleware (in `server/src/middleware/customer-auth.middleware.ts`):
- Extracts Bearer token from Authorization header
- Verifies JWT validity
- Attaches `customerSession` to the request object
- Returns 401 for missing/invalid tokens

## Account Management

### Profile Updates

Authenticated customers can update their profile via the customer profile routes:
- Name, email, phone number
- Shipping address
- Password change (requires current password)

### Account Security

- Accounts can be disabled by admins (blocks all login attempts)
- Force logout invalidates all active sessions for a customer
- Rate limiting on auth endpoints prevents abuse
- Failed login attempts are logged

## Admin Controls

Admins can manage customer accounts through the Customer Profile Drawer:
- View customer details and order history
- Disable/enable accounts
- Force logout (invalidate all sessions)
- View authentication activity

## Related Files

- `server/src/routes/customer/auth.routes.ts` - All auth endpoints
- `server/src/middleware/customer-auth.middleware.ts` - Auth middleware
- `server/src/utils/session.ts` - JWT creation and verification
- `client/src/hooks/use-auth.ts` - Frontend auth state management
