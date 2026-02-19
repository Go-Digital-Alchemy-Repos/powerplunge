# Local / Codex development commands
# These do NOT affect Replit workspace or deployment behavior.
# Equivalent npm scripts also exist: npm run dev:local, npm run dev:all, etc.

.PHONY: setup dev dev-server dev-client

# First-time local setup: install deps, create placeholder assets, copy env template
setup:
	npm install
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from template — edit it with your values."; fi

# Run backend + frontend together (local only)
dev:
	npx concurrently --names server,client \
	  "PORT=5001 NODE_ENV=development npx tsx server/index.ts" \
	  "npx vite dev --port 5002"

# Run backend only (local)
dev-server:
	PORT=5001 NODE_ENV=development npx tsx server/index.ts

# Run frontend only (local)
dev-client:
	npx vite dev --port 5002
