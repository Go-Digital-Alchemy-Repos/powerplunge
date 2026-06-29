# Better Auth E2E Coverage Gaps

This Better Auth verification slice covers local seeded admin, customer, and affiliate-capable customer accounts with cookie-backed login/session behavior.

## Covered

- Admin, customer, and affiliate seed fixtures are expected to be Better Auth managed.
- Playwright setup starts with Better Auth enabled for local e2e runs.
- Customer login/register, account access, support tab access, checkout identity prefill, affiliate portal access, and logout have focused e2e coverage.
- Existing support and order email e2e API flows use Better Auth cookies.

## Accepted Gaps

- Stripe payment confirmation and Stripe Connect onboarding are not fully exercised without real test-mode Stripe keys and external redirect handling.
- Twilio/SMS invite delivery is not exercised in local e2e because it requires provider credentials and should not send real messages from test runs.
- Email delivery assertions use the local e2e outbox (`E2E_EMAIL_MODE=outbox`) rather than Mailgun delivery.
- `scripts/db/verifySchema.ts` can fail on local database drift unrelated to this slice; use `npm run verify:seed-auth` for the seed-auth fixture invariant checks introduced here.

These gaps should be rechecked during staging regression passes with explicit test credentials.
