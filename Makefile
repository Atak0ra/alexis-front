.PHONY: install dev-front build start test clean

# ── Install ────────────────────────────────────────────────────────────────────
install:
	@npm install

# ── Dev server (localhost:3000) ────────────────────────────────────────────────
dev-front: install
	@echo ""
	@echo "  Front dispo sur http://localhost:3000"
	@echo "  API backend attendue sur $${NEXT_PUBLIC_API_URL:-http://localhost:8000}"
	@echo ""
	@npm run dev

# ── Build prod ─────────────────────────────────────────────────────────────────
build:
	@npm run build

start: build
	@npm run start

# ── Tests (vitest) ─────────────────────────────────────────────────────────────
test:
	@npm run test

# ── Clean ──────────────────────────────────────────────────────────────────────
clean:
	@rm -rf .next node_modules/.cache tsconfig.tsbuildinfo
	@echo "Clean complete."
