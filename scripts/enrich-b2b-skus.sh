#!/bin/bash
set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV="${1:-dev}"
if [ "$ENV" = "prod" ]; then
    DB_NAME="b2b-prod"
    echo -e "${RED}⚠️  WARNING: PRODUCTION database!${NC}"
    echo -n "Type 'yes' to confirm: "
    read CONFIRM
    [ "$CONFIRM" != "yes" ] && exit 1
else
    DB_NAME="b2b-dev"
    echo -e "${BLUE}ℹ️  Operating on DEV environment${NC}"
fi

echo -e "${BLUE}📋 Checking b2b_sku column...${NC}"
COLUMN_CHECK=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT COUNT(*) as has_column FROM pragma_table_info('products') WHERE name='b2b_sku'" --json | grep -oP '"has_column":\s*\K[0-9]+' | head -1)
if [ "$COLUMN_CHECK" = "0" ]; then
    echo -e "${RED}❌ Column missing! Run: wrangler d1 execute $DB_NAME --remote --file ./migrations/007_add_b2b_sku.sql${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Column exists${NC}"

echo -e "${BLUE}📊 Counting products...${NC}"
PRODUCT_COUNT=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT COUNT(*) as count FROM products WHERE b2b_sku IS NULL" --json | grep -oP '"count":\s*\K[0-9]+' | head -1)
if [ "$PRODUCT_COUNT" = "0" ]; then
    echo -e "${GREEN}✅ All products have B2B SKUs!${NC}"
    exit 0
fi
echo -e "${YELLOW}Found $PRODUCT_COUNT products without B2B SKU${NC}"

echo -e "${BLUE}🔍 Finding highest SKU...${NC}"
HIGHEST=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT b2b_sku FROM products WHERE b2b_sku LIKE 'TP-%' ORDER BY b2b_sku DESC LIMIT 1" --json | grep -oP '"b2b_sku":\s*"TP-\K[0-9]+' | head -1)
if [ -z "$HIGHEST" ]; then
    START=1
    echo -e "${BLUE}Starting from TP-00001${NC}"
else
    START=$((HIGHEST + 1))
    echo -e "${BLUE}Starting from TP-$(printf "%05d" $START)${NC}"
fi

echo -e "${BLUE}📦 Fetching product IDs...${NC}"
IDS=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT id FROM products WHERE b2b_sku IS NULL ORDER BY created_at ASC" --json | grep -oP '"id":\s*"\K[^"]+')
if [ -z "$IDS" ]; then
    echo -e "${GREEN}✅ No products to enrich${NC}"
    exit 0
fi

IDS_ARRAY=($IDS)
TOTAL=${#IDS_ARRAY[@]}
echo -e "${BLUE}Processing $TOTAL products...${NC}"

CURRENT=$START
BATCH_SIZE=10
BATCH_COUNT=0
STATEMENTS=""

for PRODUCT_ID in "${IDS_ARRAY[@]}"; do
    SKU="TP-$(printf "%05d" $CURRENT)"
    STATEMENTS="$STATEMENTS
UPDATE products SET b2b_sku = '$SKU' WHERE id = '$PRODUCT_ID';"
    BATCH_COUNT=$((BATCH_COUNT + 1))
    CURRENT=$((CURRENT + 1))
    
    if [ $((BATCH_COUNT % BATCH_SIZE)) -eq 0 ]; then
        BATCH_NUM=$((BATCH_COUNT / BATCH_SIZE))
        TOTAL_BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))
        echo -e "${YELLOW}⏳ Batch ${BATCH_NUM}/${TOTAL_BATCHES}${NC}"
        wrangler d1 execute "$DB_NAME" --remote --command="$STATEMENTS" > /dev/null
        STATEMENTS=""
    fi
done

if [ -n "$STATEMENTS" ]; then
    echo -e "${YELLOW}⏳ Final batch...${NC}"
    wrangler d1 execute "$DB_NAME" --remote --command="$STATEMENTS" > /dev/null
fi

echo -e "${BLUE}🔍 Verifying...${NC}"
NULL_COUNT=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT COUNT(*) as count FROM products WHERE b2b_sku IS NULL" --json | grep -oP '"count":\s*\K[0-9]+' | head -1)
ENRICHED=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT COUNT(*) as count FROM products WHERE b2b_sku IS NOT NULL" --json | grep -oP '"count":\s*\K[0-9]+' | head -1)

echo -e "${GREEN}✅ Enrichment complete!${NC}"
echo -e "${GREEN}   - With B2B SKU: $ENRICHED${NC}"
echo -e "${GREEN}   - Without: $NULL_COUNT${NC}"
[ "$NULL_COUNT" != "0" ] && echo -e "${YELLOW}⚠️  $NULL_COUNT products still without SKU${NC}" && exit 1
echo -e "${GREEN}🎉 Success! Range: TP-$(printf "%05d" $START) to TP-$(printf "%05d" $((CURRENT - 1)))${NC}"
