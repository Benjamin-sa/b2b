#!/bin/bash
# Setup Service Authentication for All Workers
# 
# This script:
# 1. Generates a secure SERVICE_SECRET
# 2. Sets it for all workers in dev and prod environments
# 3. Validates the setup

set -e

echo "🔐 B2B Workers - Service Authentication Setup"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}Project root: ${PROJECT_ROOT}${NC}"
echo ""

# Generate a secure random secret (32 bytes = 256 bits)
echo -e "${BLUE}Generating SERVICE_SECRET...${NC}"
SERVICE_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✓ Generated 256-bit secret${NC}"
echo ""

# List of all workers (API Gateway also needs it to pass to services)
WORKERS=(
  "api-gateway"
  "auth-service"
  "email-service"
  "inventory-service"
  "shopify-sync-service"
  "stripe-service"
  "telegram-service"
)

# Ask for confirmation
echo -e "${YELLOW}This will set SERVICE_SECRET for ${#WORKERS[@]} workers${NC}"
echo -e "${YELLOW}Total secrets to set: $(( ${#WORKERS[@]} * 2 )) (dev + prod)${NC}"
echo ""
echo "Workers to update:"
for worker in "${WORKERS[@]}"; do
  echo "  - $worker"
done
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo -e "${BLUE}Setting secrets for all workers...${NC}"
echo ""

SUCCESS_COUNT=0
FAILED_WORKERS=()

# Set secret for each worker
for worker in "${WORKERS[@]}"; do
  echo "📦 $worker"
  
  WORKER_DIR="$PROJECT_ROOT/workers/$worker"
  
  if [ ! -d "$WORKER_DIR" ]; then
    echo -e "  ${RED}✗ Directory not found: $WORKER_DIR${NC}"
    FAILED_WORKERS+=("$worker (directory not found)")
    continue
  fi
  
  # Production - use printf to avoid echo interpretation issues
  if printf "%s" "$SERVICE_SECRET" | wrangler secret put SERVICE_SECRET --config "$WORKER_DIR/wrangler.toml" 2>&1 | grep -q "Success"; then
    echo -e "  ${GREEN}✓${NC} Production secret set"
    ((SUCCESS_COUNT++))
  else
    echo -e "  ${YELLOW}⚠${NC}  Production secret failed (worker may not be deployed yet)"
  fi
  
  # Development
  if printf "%s" "$SERVICE_SECRET" | wrangler secret put SERVICE_SECRET --config "$WORKER_DIR/wrangler.toml" --env dev 2>&1 | grep -q "Success"; then
    echo -e "  ${GREEN}✓${NC} Development secret set"
    ((SUCCESS_COUNT++))
  else
    echo -e "  ${YELLOW}⚠${NC}  Development secret failed (worker may not be deployed yet)"
  fi
done

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Summary:"
echo "  - Secrets set successfully: $SUCCESS_COUNT"
echo "  - Workers configured: ${#WORKERS[@]}"
if [ ${#FAILED_WORKERS[@]} -gt 0 ]; then
  echo -e "  ${YELLOW}- Failed workers: ${#FAILED_WORKERS[@]}${NC}"
  for failed in "${FAILED_WORKERS[@]}"; do
    echo "    • $failed"
  done
fi
echo ""
echo "Next steps:"
echo "1. Verify middleware is applied to all workers (check src/index.ts)"
echo "2. Test locally: npm run dev in each worker"
echo "3. Deploy to dev: cd workers/<service> && npm run deploy:dev"
echo "4. Test protection:"
echo "   curl https://b2b-inventory-service-dev.workers.dev/products"
echo "   Should return 403 Forbidden"
echo "5. Deploy to prod: cd workers/<service> && npm run deploy"
echo ""
echo -e "${YELLOW}⚠️  SAVE THIS SECRET (for manual configuration if needed):${NC}"
echo "$SERVICE_SECRET"
echo ""
