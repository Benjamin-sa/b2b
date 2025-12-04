#!/bin/bash

# Deploy all workers to production
# Usage: ./scripts/deploy-all-prod.sh

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Deploying all workers to PRODUCTION"
echo "======================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Workers to deploy (in dependency order)
WORKERS=(
  "auth-service"
  "inventory-service"
  "stripe-service"
  "email-service"
  "telegram-service"
  "shopify-sync-service"
  "r2-bucket"
  "api-gateway"  # Deploy last - depends on other services
)

# Track results
SUCCEEDED=()
FAILED=()

# Confirmation prompt
echo -e "${YELLOW}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 0
fi

echo ""
echo "Starting deployment..."
echo ""

for WORKER in "${WORKERS[@]}"; do
  WORKER_DIR="$PROJECT_ROOT/workers/$WORKER"
  
  if [ ! -d "$WORKER_DIR" ]; then
    echo -e "${YELLOW}⏭️  Skipping $WORKER (directory not found)${NC}"
    continue
  fi
  
  echo "📦 Deploying $WORKER..."
  
  cd "$WORKER_DIR"
  
  if npm run deploy 2>&1 | tail -5; then
    echo -e "${GREEN}✅ $WORKER deployed successfully${NC}"
    SUCCEEDED+=("$WORKER")
  else
    echo -e "${RED}❌ $WORKER deployment failed${NC}"
    FAILED+=("$WORKER")
  fi
  
  echo ""
done

# Summary
echo "======================================="
echo "📊 Deployment Summary"
echo "======================================="
echo ""

if [ ${#SUCCEEDED[@]} -gt 0 ]; then
  echo -e "${GREEN}✅ Succeeded (${#SUCCEEDED[@]}):${NC}"
  for w in "${SUCCEEDED[@]}"; do
    echo "   - $w"
  done
  echo ""
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo -e "${RED}❌ Failed (${#FAILED[@]}):${NC}"
  for w in "${FAILED[@]}"; do
    echo "   - $w"
  done
  echo ""
  exit 1
fi

echo -e "${GREEN}🎉 All workers deployed successfully!${NC}"
