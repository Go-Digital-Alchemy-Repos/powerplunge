# Decisions Pending (delete entries when resolved; git history keeps them)

## D1: Refactor program target (2026-07-13)

- Context: Architecture survey found 6 candidates (report served via
  lavish; summary in loop-state.md standing facts).
- Options: A fulfillment-notification extraction / B checkout service /
  C dedupe paid-state guards / D claim vocabulary split / E storage.ts
  repos / F stripe webhook service — or a chunked combination.
- Recommendation: Program = "complete the money path": Chunk 1 = A+C+D
  (small unlocks), Chunk 2 = B (checkout service), Chunk 3 = F (webhook
  refund/connect service). E stays out of scope except repos touched en
  route.
- Needs: Tommy's pick.
