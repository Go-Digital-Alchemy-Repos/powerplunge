# Meta Catalog + CAPI Rollout Checklist

## Pre-Deployment
- [ ] Confirm commit `009e912` is deployed to target environment.
- [ ] Ensure `DATABASE_URL` and encryption-related env vars are present in target runtime.
- [ ] Confirm background job runner starts successfully.

## Deploy (Safe Defaults)
- [ ] Deploy with `meta_capi_enabled = false`.
- [ ] Verify runtime migration applied (`meta` columns + `meta_capi_events` table).

## Admin Configuration
- [ ] Open Admin -> Integrations -> Meta Catalog + CAPI.
- [ ] Enter and save:
  - [ ] Pixel ID
  - [ ] Catalog ID
  - [ ] Product Feed ID
  - [ ] Access Token
  - [ ] App Secret (recommended)
  - [ ] Test Event Code (recommended for validation)
- [ ] Click **Verify** and confirm success.

## Catalog Validation
- [ ] Copy catalog feed URL from UI.
- [ ] Open feed URL and verify TSV response and product rows.
- [ ] Click **Sync Now** and confirm `meta_catalog_last_sync_status=success`.
- [ ] Confirm feed ingestion status in Meta Commerce Manager.

## CAPI Validation (Before Enable)
- [ ] Click **Send Test Event** and validate in Meta Test Events.
- [ ] Place one paid test order with marketing consent enabled.
- [ ] Place one paid test order with marketing consent disabled.
- [ ] Confirm consent=true order enqueues/sends CAPI event.
- [ ] Confirm consent=false order does not send CAPI event.

## Enable + Monitor
- [ ] Enable CAPI switch in Admin.
- [ ] Monitor for 24-48 hours:
  - [ ] `/api/admin/integrations/meta-marketing/stats`
  - [ ] Error alerts (`meta_catalog_*`, `meta_capi_*`)
  - [ ] Queue depth and failed events

## Acceptance Criteria
- [ ] Hourly catalog sync runs and succeeds.
- [ ] Minute dispatcher drains queue without unbounded retries.
- [ ] Duplicate purchase/refund sources produce single outbox event per deterministic event key.
- [ ] No CAPI sends occur without explicit marketing consent.
