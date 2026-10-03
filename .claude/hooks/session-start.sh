#!/bin/bash
# Install deps in fresh Claude Code on the web containers so the QUALITY.md
# gates (`npm run lint`, `npm run build`, `npm run test:unit`) work from the
# first turn. No-op locally or when node_modules is present.
# package.json pins node 24.x (.nvmrc); npm ci only warns on other versions.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR"
[ -d node_modules ] || npm ci --no-audit --no-fund
