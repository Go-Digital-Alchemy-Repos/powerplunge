# Troubleshooting: Top 10 Issues

Common issues encountered during development and deployment, with diagnostic steps and fixes.

## 1. Server Fails to Start — Missing DATABASE_URL

**Symptom:** Server crashes immediately with `Error: DATABASE_URL is not set` or a Drizzle connection error.

**Cause:** The PostgreSQL connection string is not configured.

**Fix:**
1. Verify the database exists (check Replit Database tool)
2. Ensure `DATABASE_URL` is set in environment variables
3. Run `npx tsx scripts/doctor.ts` to check all required env vars

**File:** `server/src/config/env.ts`

## 2. CMS Routes Return 404

**Symptom:** All `/api/admin/cms/*` endpoints return 404.

**Cause:** CMS routes may not be mounted properly, or admin authentication is blocking the request.

**Fix:**
1. Check that CMS router imports are present in `server/routes.ts`
2. Restart the server
3. Verify with `GET /api/admin/cms/health` — should return `{ "status": "ok", "version": "2.0" }`

**Note:** CMS is always active and does not require a feature flag. If you get 404s, check that admin authentication middleware is not blocking the request.

## 3. Page Blocks Not Rendering — Empty Page

**Symptom:** A CMS page loads but shows nothing, even though blocks were saved.

**Diagnostic steps:**
1. Check the page's `contentJson` via `GET /api/admin/cms/pages/:id`
2. Verify `contentJson.blocks` is a non-empty array
3. Verify each block has `id`, `type`, and `data` fields
4. Check if block types are registered — unknown types render the yellow `UnknownBlock` fallback

**Common causes:**
- `contentJson` is `null` (page was never saved with blocks)
- `contentJson.blocks` is an empty array
- Block data was saved with a type name that does not match the registry (e.g., `Hero` instead of `hero`)

**Rendering decision logic:**
```
contentJson.blocks exists and non-empty → render blocks
else legacy content exists              → render sanitized HTML
else                                    → render empty placeholder
```

**Files:** `client/src/components/PageRenderer.tsx`, `client/src/pages/page-view.tsx`

## 4. contentJson Validation Rejects Page Save

**Symptom:** `POST /api/admin/cms/pages` or `PUT /pages/:id` returns 400 with a validation error.

**Diagnostic steps:**
1. Check the error message — it describes exactly which field is invalid
2. Common validation failures:

| Error | Cause | Fix |
|-------|-------|-----|
| `contentJson must be a JSON object` | Sent a string, number, or array | Wrap blocks in `{ "blocks": [...] }` |
| `contentJson.blocks must be an array` | Missing `blocks` key | Add `"blocks": []` to contentJson |
| `blocks[N].id must be a non-empty string` | Block missing or empty `id` | Generate a UUID for the block |
| `blocks[N].type must be a non-empty string` | Block missing or empty `type` | Set a valid block type string |
| `blocks[N].data must be a JSON object` | `data` is a string or array | Ensure `data` is `{}` or an object |

**Note:** Unknown block types produce warnings but are never rejected. If you see a warning like `Unknown block type "myWidget"`, the page will save successfully.

**File:** `server/src/utils/contentValidation.ts`

## 5. Theme Not Applying on Public Pages

**Symptom:** Admin activates a theme but public pages still show default colors.

**Diagnostic steps:**
1. Verify activation: `GET /api/admin/cms/themes/active` should return the selected theme
2. Check `site_settings` table: `active_theme_id` should match the preset ID
3. Check that the public `ThemeProvider` component is mounted (wraps the app root)
4. ThemeProvider refetches every 30 seconds — wait or hard-refresh the page

**Common causes:**
- Theme was previewed but never activated (preview is DOM-only, not persisted)
- `active_theme_id` in `site_settings` references an unknown preset — falls back to `ocean-blue`
- ThemeProvider fetch to `GET /api/theme/active` fails silently — check network tab

**Files:** `client/src/cms/themes/applyTheme.ts`, `client/src/cms/themes/presets.ts`

## 6. Stripe Webhook Errors

**Symptom:** Orders not updating after payment, webhook endpoint returning 400/500.

**Diagnostic steps:**
1. Check `STRIPE_WEBHOOK_SECRET` is set and matches the Stripe dashboard webhook signing secret
2. Check server logs for `[STRIPE-WEBHOOK]` entries
3. Verify the webhook endpoint URL in Stripe dashboard points to your deployment
4. Test with Stripe CLI: `stripe trigger checkout.session.completed`

**Common causes:**
- Webhook secret mismatch (rotated in Stripe but not updated in env vars)
- Request body parsed as JSON before Stripe signature verification (raw body required)
- Webhook URL not updated after redeployment

**File:** `server/routes.ts` (webhook handler section)

## 7. Background Jobs Not Running

**Symptom:** Affiliate payouts, commission approvals, or metrics not being processed.

**Diagnostic steps:**
1. Check server startup logs for `[SCHEDULED-JOBS] All jobs registered`
2. Check job status via `GET /api/admin/jobs/status`
3. Look for `[JOB-RUNNER]` entries in server logs

**Common causes:**
- Server restarted and jobs haven't hit their next scheduled time yet
- Job threw an error — check logs for `[JOB-RUNNER] Job X failed`
- Duplicate prevention blocked a run — each job uses unique run keys

**Note:** Jobs run in-process (no separate worker). If the server restarts, all job timers reset.

## 8. Admin Login Fails — "Invalid Credentials"

**Symptom:** Cannot log into the admin panel at `/admin/login`.

**Diagnostic steps:**
1. Verify admin user exists: check `admin_users` table
2. Verify password hash is valid (bcrypt format starting with `$2b$`)
3. Check that the admin user's `isActive` field is `true`
4. Try the default admin credentials if this is a fresh install

**Fix for locked-out admin:**
```sql
-- Check admin users
SELECT id, username, role, is_active FROM admin_users;
```

If no admin exists, use the seed script or create one via the API.

## 9. Saved Sections Not Appearing in Builder

**Symptom:** Sections were created but don't show up in the page builder's section picker.

**Diagnostic steps:**
1. Verify sections exist: `GET /api/admin/cms/sections`
2. Check that each section has a `name` and non-empty `blocks` array
3. Section kits can be re-seeded: `POST /api/admin/cms/sections/seed-kits`

**Common causes:**
- Sections were created with empty `blocks` arrays
- Section category filter is active in the picker UI
- Database was reset without re-running seeds

## 10. Build Fails — TypeScript Errors

**Symptom:** `npm run build` fails with TypeScript compilation errors.

**Diagnostic steps:**
1. Run `npm run build` and read the first error
2. Most common causes:
   - Missing import for a newly added component
   - Schema mismatch between `shared/schema.ts` and a route handler
   - Drizzle type inference issues after schema changes

**Quick fixes:**
```bash
# Check for LSP errors in a specific file
# (use your editor's TypeScript integration)

# Full build check
npm run build

# Database schema sync (if schema changed)
npm run db:push
```

**Note:** Full `npm run check` (typecheck) can take over 100 seconds on this codebase. `npm run build` is faster and catches the same compilation errors.

## General Diagnostic Commands

| Command | Purpose |
|---------|---------|
| `npx tsx scripts/doctor.ts` | Full environment health check |
| `npx tsx scripts/db/verifySchema.ts` | Verify all 65 database tables exist |
| `npx tsx scripts/cmsParityCheck.ts` | Check legacy vs CMS data consistency |
| `npx tsx scripts/smoke/cmsContentSafety.ts` | Run content safety regression tests (21 assertions) |
| `curl localhost:5000/api/admin/cms/health` | Check CMS is responding |
| `curl localhost:5000/api/admin/jobs/status` | Check background job status |

## Related Documentation

- [System Overview](../01-GETTING-STARTED/SYSTEM_OVERVIEW.md) — Full system description
- [Scripts Reference](../09-TESTING/SCRIPTS.md) — All diagnostic scripts
- [Rendering Rules](../19-CMS/23-RENDERING-RULES.md) — How CMS pages render
- [CMS API Reference](../19-CMS/09-API-REFERENCE.md) — All CMS endpoints
