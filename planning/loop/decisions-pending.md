# Decisions Pending (delete entries when resolved; git history keeps them)

None. (D1 resolved 2026-07-13: Tommy approved program "Complete the money
path", chunks A+C+D -> B -> F, grilling decisions delegated to director.)

## D2: Webhook retry semantics (2026-07-13, from R2/P12)

- Context: POST /stripe marks delivery dedupe BEFORE dispatch and
  swallows refund/Connect handler failures into 200 acks. A handler
  crash after dedupe-marking gets no Stripe retry; the failure is only
  visible in logs. Pinned as current behavior by P12 characterizations
  (candidate-bug comments).
- Options: (a) keep as-is (log-only visibility); (b) move dedupe-mark
  after successful dispatch so Stripe retries transient failures —
  requires idempotent handlers (largely true already); (c) selective:
  5xx on finalization-path failures only, keep swallowing refund/Connect.
- Recommendation: (b) as a small behavior-changing slice AFTER chunk 3's
  extractions land (services make idempotency auditable); not urgent
  while order volume is zero.
- Needs: Tommy's pick. Does NOT block chunk 3.
