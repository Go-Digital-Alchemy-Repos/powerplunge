# Admin Role-Based Access Control (RBAC)

## Overview

The admin panel uses a role-based access control system to restrict functionality based on the authenticated admin user's role. Permissions are enforced at both the API middleware layer and the frontend UI layer.

## Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| `admin` / `super_admin` | Full system access | All features |
| `store_manager` | Manages products, orders, customers, content | Most features except team management |
| `fulfillment` | Processes and ships orders | Order viewing and status updates only |

## Middleware Functions

Defined in `server/src/middleware/auth.middleware.ts`:

### `requireAdmin`
- Base authentication check
- Verifies admin session exists and admin user is in the database
- Used for read-only endpoints accessible to all admin roles

### `requireRole(...allowedRoles)`
- Parameterized role check
- `admin` and `super_admin` roles bypass the role check (always allowed)
- Other roles must be explicitly listed in `allowedRoles`

### `requireFullAccess`
- Shorthand for `requireRole("super_admin", "admin", "store_manager")`
- Used for product management, customer management, CMS editing, settings
- Blocks `fulfillment` role

### `requireOrderAccess`
- Shorthand for `requireRole("super_admin", "admin", "store_manager", "fulfillment")`
- Used for order listing and status updates
- Allows all roles including fulfillment

## Permission Matrix

| Feature | admin | store_manager | fulfillment |
|---------|-------|--------------|-------------|
| Dashboard | Yes | Yes | Yes |
| View Orders | Yes | Yes | Yes |
| Update Order Status | Yes | Yes | Yes |
| Create Manual Orders | Yes | Yes | No |
| Manage Products | Yes | Yes | No |
| Manage Customers | Yes | Yes | No |
| CMS / Content | Yes | Yes | No |
| Affiliate Management | Yes | Yes | No |
| Coupon Management | Yes | Yes | No |
| Team Management | Yes | No | No |
| System Settings | Yes | No | No |
| View Reports | Yes | Yes | No |
| Documentation | Yes | Yes | No |

## Frontend Enforcement

The admin frontend uses the `useAdmin` hook to determine the current user's role and conditionally render UI elements:

- `hasFullAccess` - True for admin, super_admin, store_manager
- `hasOrderAccess` - True for all admin roles including fulfillment
- Navigation items are filtered based on role
- Action buttons (create, edit, delete) are conditionally shown
- The `AdminGuard` component prevents unauthenticated access to admin pages

## Admin Authentication Flow

1. Admin navigates to `/admin/login`
2. Enters email and password
3. Server validates credentials against `admin_users` table
4. On success, creates a server-side session (`req.session.adminId`)
5. Frontend stores session state and redirects to dashboard
6. All subsequent API calls include the session cookie

## Admin User Management

The team management page (`/admin/team`) allows `admin` role users to:
- View all admin users with their roles
- Create new admin accounts
- Update admin roles
- Disable/enable admin accounts
- Reset admin passwords

## Session Security

- Admin sessions use server-side session storage (not JWT)
- Sessions expire after inactivity timeout
- Session is destroyed on logout
- Invalid sessions redirect to login page

## Related Files

- `server/src/middleware/auth.middleware.ts` - Role middleware definitions
- `server/src/routes/admin/auth.routes.ts` - Admin login/logout endpoints
- `server/src/routes/admin/team.routes.ts` - Admin user CRUD
- `client/src/hooks/use-admin.ts` - Frontend role management
- `client/src/components/admin/AdminGuard.tsx` - Route protection component
