# CMS Feature Flag (Deprecated)

> **⚠️ DEPRECATED:** The `CMS_V2_ENABLED` / `CMS_ENABLED` feature flag has been removed. CMS is now always active and no longer requires a feature flag to enable. This document is retained for historical reference only.

## Summary

The `CMS_ENABLED` / `CMS_V2_ENABLED` feature flag was used during initial CMS development to gate access to the block-based page builder. It has since been removed from the codebase:

- The `isCmsEnabled()` helper in `server/src/config/env.ts` no longer exists.
- CMS admin routes are always mounted and accessible to admins.
- CMS sidebar items are always visible in the admin navigation.
- No environment variable is needed to enable CMS.

## Historical Context

During development, the feature flag controlled:
- Server-side: `isCmsEnabled()` read `process.env.CMS_ENABLED` and gated API responses.
- Client-side: `AdminNav.tsx` fetched `/api/health/config` to conditionally show CMS links.
- The flag defaulted to `false` and required explicitly setting `CMS_ENABLED=true`.

This mechanism was removed once CMS reached production readiness.

## Related Docs
- CMS Overview (`docs/19-CMS/01-OVERVIEW.md`)
