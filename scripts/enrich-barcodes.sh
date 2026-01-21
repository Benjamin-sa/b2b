#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment (dev or prod)
ENV="${1:-dev}"

if [ "$ENV" = "prod" ]; then
    DB_NAME="b2b-prod"
    echo -e "${RED}⚠️  WARNING: Running on PRODUCTION database!${NC}"
    echo -n "Type 'yes' to confirm: "
    read CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi
else
    DB_NAME="b2b-dev"
    echo -e "${BLUE}ℹ️  Operating on DEV environment${NC}"
fi

# ============================================================================
# STEP 1: Check if barcode column exists
# ============================================================================
echo -e "${BLUE}📋 Checking barcode column...${NC}"
COLUMN_CHECK=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT COUNT(*) as has_column FROM pragma_table_info('products') WHERE name='barcode'" --json | grep -oP '"has_column":\s*\K[0-9]+' | head -1)

if [ "$COLUMN_CHECK" = "0" ]; then
    echo -e "${RED}❌ Column 'barcode' does not exist!${NC}"
    echo -e "${YELLOW}Run: wrangler d1 execute $DB_NAME --remote --file ./migrations/009_add_barcode.sql${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Column exists${NC}"

# ============================================================================
# STEP 2: Count products without barcode
# ============================================================================
echo -e "${BLUE}📊 Counting products without barcode...${NC}"
PRODUCT_COUNT=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT COUNT(*) as count FROM products WHERE barcode IS NULL" --json | grep -oP '"count":\s*\K[0-9]+' | head -1)

if [ "$PRODUCT_COUNT" = "0" ]; then
    echo -e "${GREEN}✅ All products have barcodes!${NC}"
    exit 0
fi

echo -e "${YELLOW}Found $PRODUCT_COUNT products without barcode${NC}"

# ============================================================================
# STEP 3: Find highest existing barcode
# ============================================================================
echo -e "${BLUE}🔍 Finding highest barcode...${NC}"
HIGHEST=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT barcode FROM products WHERE barcode LIKE '2%' ORDER BY barcode DESC LIMIT 1" --json | grep -oP '"barcode":\s*"\K[0-9]+' | head -1)

if [ -z "$HIGHEST" ]; then
    START=1
    echo -e "${BLUE}Starting from sequence 1${NC}"
else
    # Extract sequence number (skip first '2', take next 11 digits)
    SEQUENCE_PART="${HIGHEST:1:11}"
    START=$((10#$SEQUENCE_PART + 1))
    echo -e "${BLUE}Starting from sequence $START${NC}"
fi

# ============================================================================
# STEP 4: EAN-13 Check Digit Calculation Function
# ============================================================================
calculate_check_digit() {
    local first12=$1
    local sum=0
    
    for i in {0..11}; do
        digit="${first12:$i:1}"
        if [ $((i % 2)) -eq 0 ]; then
            sum=$((sum + digit))
        else
            sum=$((sum + digit * 3))
        fi
    done
    
    check_digit=$(( (10 - (sum % 10)) % 10 ))
    echo $check_digit
}

# ============================================================================
# STEP 5: Fetch products without barcode
# ============================================================================
echo -e "${BLUE}📦 Fetching product IDs...${NC}"
IDS=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT id FROM products WHERE barcode IS NULL ORDER BY created_at ASC" --json | grep -oP '"id":\s*"\K[^"]+')

if [ -z "$IDS" ]; then
    echo -e "${GREEN}✅ No products to enrich${NC}"
    exit 0
fi

IDS_ARRAY=($IDS)
TOTAL=${#IDS_ARRAY[@]}
echo -e "${BLUE}Processing $TOTAL products...${NC}"

# ============================================================================
# STEP 6: Generate and assign barcodes in batches
# ============================================================================
CURRENT=$START
BATCH_SIZE=50
BATCH_COUNT=0
STATEMENTS=""

for PRODUCT_ID in "${IDS_ARRAY[@]}"; do
    # Generate EAN-13 barcode
    # Format: 2 + 11-digit sequence + check digit
    FIRST_12="2$(printf "%011d" $CURRENT)"
    CHECK_DIGIT=$(calculate_check_digit "$FIRST_12")
    BARCODE="${FIRST_12}${CHECK_DIGIT}"
    
    STATEMENTS="$STATEMENTS
UPDATE products SET barcode = '$BARCODE' WHERE id = '$PRODUCT_ID';"
    
    BATCH_COUNT=$((BATCH_COUNT + 1))
    CURRENT=$((CURRENT + 1))
    
    # Execute batch when reaching batch size
    if [ $((BATCH_COUNT % BATCH_SIZE)) -eq 0 ]; then
        BATCH_NUM=$((BATCH_COUNT / BATCH_SIZE))
        TOTAL_BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))
        echo -e "${YELLOW}⏳ Batch ${BATCH_NUM}/${TOTAL_BATCHES}${NC}"
        wrangler d1 execute "$DB_NAME" --remote --command="$STATEMENTS" > /dev/null
        STATEMENTS=""
    fi
done

# Execute remaining statements
if [ -n "$STATEMENTS" ]; then
    echo -e "${YELLOW}⏳ Final batch...${NC}"
    wrangler d1 execute "$DB_NAME" --remote --command="$STATEMENTS" > /dev/null
fi

# ============================================================================
# STEP 7: Verify results
# ============================================================================
echo -e "${BLUE}🔍 Verifying...${NC}"
NULL_COUNT=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT COUNT(*) as count FROM products WHERE barcode IS NULL" --json | grep -oP '"count":\s*\K[0-9]+' | head -1)
ENRICHED=$(wrangler d1 execute "$DB_NAME" --remote --command="SELECT COUNT(*) as count FROM products WHERE barcode IS NOT NULL" --json | grep -oP '"count":\s*\K[0-9]+' | head -1)

echo -e "${GREEN}✅ Barcode enrichment complete!${NC}"
echo -e "${GREEN}   - With barcode: $ENRICHED${NC}"
echo -e "${GREEN}   - Without: $NULL_COUNT${NC}"

if [ "$NULL_COUNT" != "0" ]; then
    echo -e "${YELLOW}⚠️  $NULL_COUNT products still without barcode${NC}"
    exit 1
fi

# Calculate last barcode generated
LAST_SEQ=$((START + TOTAL - 1))
LAST_FIRST_12="2$(printf "%011d" $LAST_SEQ)"
LAST_CHECK=$(calculate_check_digit "$LAST_FIRST_12")
LAST_BARCODE="${LAST_FIRST_12}${LAST_CHECK}"

# Calculate first barcode
FIRST_FIRST_12="2$(printf "%011d" $START)"
FIRST_CHECK=$(calculate_check_digit "$FIRST_FIRST_12")
FIRST_BARCODE="${FIRST_FIRST_12}${FIRST_CHECK}"

echo -e "${GREEN}🎉 Success! Range: ${FIRST_BARCODE} to ${LAST_BARCODE}${NC}"
