# Findings Waived (review-lane packets cite this file; keep entries current)

- W1 (2026-07-13, chunk-1 review): payments.routes.test.ts uppercase-USD /
  checkout-session characterizations stub finalization and pin guard
  placement. WAIVED for chunk 1: the pinned shim is deliberately kept this
  chunk (review's own recommendation) and chunk 2 (checkout service
  extraction) rebuilds the confirm-payment handler and revisits these
  tests. Expiry: chunk 2 gate — the chunk-2 review must confirm the shim
  was simplified and these characterizations replaced or re-grounded.
