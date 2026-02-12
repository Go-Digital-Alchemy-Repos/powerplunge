# SMS Invite Affiliate Flow (Twilio) — Evaluation & Critique

## Scope reviewed
- Admin invite creation/send endpoint (`POST /api/admin/affiliates/affiliate-invites/send`)
- Public phone verification endpoints (`POST /api/affiliate-signup/send-verification`, `POST /api/affiliate-signup/verify-phone`)
- Twilio integration (`sms.service.ts`)
- Storage + schema behavior for invite and verification data

## What is working well
1. **Basic verification controls exist**
   - Verification codes are time-limited (10 minutes) and failed attempts are counted.
   - A resend request invalidates previous non-verified codes for the invite+phone tuple.
2. **Invite-gated signup enforcement exists**
   - Signup/join blocks proceed only when invite constraints are met (expiration/usage/email lock), and phone-verification status is checked when `targetPhone` is set.
3. **Operational observability for invites**
   - Audit logs are written for invite-sent events with important metadata.

## Key architecture finding
The current implementation is **not an SMS invite sender flow**. It is an **email/manual-link invite flow plus SMS OTP verification**:
- Admin endpoint creates invite + optional email send.
- `targetPhone` is captured, but the invite itself is not sent via SMS.
- Twilio is used only for verification-code delivery after user opens the invite link.

If product intent is "send affiliate invite by SMS," this is a feature gap.

## Risks and weaknesses

### 1) Verification state is attached to the invite, not the person/session
`affiliate_invites.phoneVerified` is a single boolean on the invite record. For multi-use invites, once one person verifies phone, later signups can bypass phone verification because the invite is now globally marked verified.

**Impact:** Authorization bypass for phone gate on shared/multi-use invites.

**Recommendation:** Track phone verification per redemption attempt (or per customer/session) instead of a global invite-level flag.

---

### 2) OTP is stored in plaintext
`phone_verification_codes.code` appears persisted directly and compared as plaintext.

**Impact:** Database read exposure means live OTP exposure during validity window.

**Recommendation:** Store `hash(code + server_secret)` and compare hash on verify.

---

### 3) Rate limiting is incomplete for Twilio abuse protection
Current resend protection uses recent count by `inviteCode` over 5 minutes, but does not strongly combine IP/device/global phone safeguards.

**Impact:** Attackers with many invite codes can still create high outbound SMS volume and cost risk.

**Recommendation:** Add layered throttles:
- Per-IP and per-device fingerprint
- Per-target-phone daily caps
- Global account-level SMS budget guardrail/circuit breaker
- Country allowlist + input validation

---

### 4) Twilio send failure leaves created verification record
Flow creates/stores code first, then sends SMS. If send fails, a non-delivered active code remains.

**Impact:** User confusion, wasted attempts, potential false lockouts/rate-limit pressure.

**Recommendation:** Either:
- send first then persist on success, or
- persist with `deliveryStatus=pending`, update to `sent/failed`, and invalidate failed rows.

---

### 5) Phone normalization is permissive, not true validation
`normalizePhone` mainly prepends `+`/`+1`; no authoritative E.164 validation or libphonenumber parsing.

**Impact:** More Twilio errors, inconsistent behavior, avoidable spend.

**Recommendation:** Validate to strict E.164 via `libphonenumber-js` (or Twilio Lookup) before creating invite or sending OTP.

---

### 6) No explicit anti-enumeration posture
API responses vary by invalid invite / expired / etc. This may disclose invite validity patterns.

**Impact:** Potential invite-code probing signal (especially if invite code entropy is ever reduced elsewhere).

**Recommendation:** Use more uniform public-facing error responses and log specifics server-side.

---

### 7) No delivery-state feedback loop
No callback/webhook processing for Twilio message status (`queued/sent/delivered/undelivered/failed`).

**Impact:** Limited support visibility and poor incident triage for carrier failures.

**Recommendation:** Store message SID and ingest status callbacks for ops analytics and automated retries.

## Product/UX observations
- The current UX is coherent for "verify phone tied to invite," but should clearly communicate:
  - whether phone verification is one-time for this signup only,
  - resend cooldown timer, and
  - what to do when SMS is delayed.
- Consider an alternative channel fallback (email OTP or voice call) for carrier-delivery failures.

## Priority fixes (suggested order)
1. **Critical:** Move from invite-level `phoneVerified` to per-attempt/per-user verification binding.
2. **Critical:** Hash OTP at rest.
3. **High:** Harden rate limits and add cost guardrails.
4. **High:** Add robust E.164 validation.
5. **Medium:** Handle Twilio delivery lifecycle and failed-send cleanup.
6. **Medium:** Decide and implement true "SMS invite send" capability if required by product.

## Suggested target design (brief)
- `affiliate_invite_verifications` table keyed by `{inviteId, phone, sessionNonce}` with status lifecycle.
- OTP hash + attempt counters + expiry in that table.
- Verification token (short-lived signed JWT) issued after successful OTP; signup endpoint requires token that matches invite/session.
- Twilio Messaging Service SID (instead of raw number), status callbacks persisted, and alerting thresholds.
