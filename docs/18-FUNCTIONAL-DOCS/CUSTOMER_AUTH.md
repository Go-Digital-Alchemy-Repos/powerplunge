# Customer Authentication

## Overview

Power Plunge customer accounts use Better Auth. Customer sessions are stored in secure HTTP-only cookies and resolved on the server through `getCustomerAuthContext`, `getAttachedCustomerAuthContext`, `requireCustomerAuth`, or `customerIdentityService`.

## Authentication Methods

### Email & Password

**Registration** (`POST /api/customer/auth/register`):
- Requires email, password (min 8 characters), and name.
- Creates or links a customer profile.
- Syncs the profile to Better Auth.
- Sets Better Auth session cookies on success.

**Login** (`POST /api/customer/auth/login`):
- Validates credentials through Better Auth.
- Rejects disabled or merged customer accounts.
- Sets Better Auth session cookies and returns the customer profile.
- Rate limited to reduce brute-force risk.

### Magic Link

**Request Link** (`POST /api/customer/auth/magic-link`):
- Accepts an email address.
- Sends a Better Auth magic-link email through the existing Mailgun/email-outbox integration.
- Uses a vague response to prevent email enumeration.

**Verify Link** (`POST /api/customer/auth/verify-magic-link`):
- Validates the Better Auth magic-link token.
- Resolves or creates the customer profile.
- Sets Better Auth session cookies.

### Password Reset

**Request Reset** (`POST /api/customer/auth/forgot-password`):
- Sends a Better Auth password reset link.
- Uses the same vague response pattern as magic links.

**Reset Password** (`POST /api/customer/auth/reset-password`):
- Validates the Better Auth reset token.
- Updates the Better Auth credential password.
- Signs the customer in after a successful reset.

## Session Management

Customer routes authenticate by resolving Better Auth cookies. `server/src/middleware/customer-auth.middleware.ts` calls `getAttachedCustomerAuthContext`, which attaches canonical `req.customerAuth` plus compatibility `req.customerSession`, and preserves Better Auth error semantics:

- `401` for missing or invalid sessions.
- `403` for disabled accounts.
- `409` for merged accounts.
- `503` when Better Auth is not configured.

`customerIdentityService` is used by routes that need customer identity without mount-level middleware. It uses preattached `req.customerAuth` when present, otherwise resolves the same Better Auth session and returns the linked customer profile.

## Account Management

Authenticated customers can update their profile, view orders, manage support tickets, and access affiliate/VIP views through customer routes. Better Auth owns password changes, password resets, magic links, login, logout, and session cookies.

## Admin Controls

Admins can manage customer accounts through admin customer management screens:
- View customer details and order history.
- Disable or enable accounts.
- Trigger password reset flows.
- Invalidate Better Auth sessions where supported by the route.

## Related Files

- `server/src/routes/customer/auth.routes.ts` - Customer auth endpoints.
- `server/src/auth/customerBetterAuth.ts` - Better Auth customer helpers.
- `server/src/middleware/customer-auth.middleware.ts` - Customer route middleware.
- `server/src/services/customer-identity.service.ts` - Shared customer identity resolver.
- `client/src/hooks/use-customer-auth.ts` - Frontend customer auth state.
