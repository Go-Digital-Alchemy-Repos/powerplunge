# PowerPlunge Repo Instructions

## Localhost Testing Protocol

- Prefer the stable Caddy browser URL: `http://powerplunge.localhost`.
- The direct local app port for this repo is `http://localhost:5011`.
- Start the local app with `npm run local:start`.
- `npm run dev` aliases the same Caddy-compatible local start path.
- Print the current local URL map with `npm run local:urls`.
- Do not start this repo on `5001`; that port is reserved for `nano-shield-railway`.
- Do not use random fallback ports for normal browser testing. If `5011` is busy, identify the process and stop it or state the conflict.
