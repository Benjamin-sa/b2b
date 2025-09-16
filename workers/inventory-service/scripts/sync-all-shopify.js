#!/usr/bin/env node

const WORKER_URL =
  process.env.WORKER_URL || "https://your-worker.your-subdomain.workers.dev";
const ADMIN_KEY = process.env.ADMIN_KEY;
const BATCH_SIZE = 10; // Keep it small to avoid rate limits

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncBatch(offset) {
  const url = `${WORKER_URL}/api/inventory/sync-shopify?batch_size=${BATCH_SIZE}&offset=${offset}`;

  console.log(`🔄 Syncing batch at offset ${offset}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Admin-Key": ADMIN_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    const batchInfo = data.data.batch_info;
    console.log(
      `✅ Batch complete: Processed ${batchInfo.processed_in_batch} variants (${
        batchInfo.current_offset
      }-${batchInfo.current_offset + batchInfo.current_batch_size})`
    );
    console.log(
      `📊 Progress: ${
        batchInfo.current_offset + batchInfo.current_batch_size
      }/${batchInfo.total_variants} variants`
    );

    if (batchInfo.has_more) {
      console.log(`⏳ ${batchInfo.remaining_variants} variants remaining...`);
      return batchInfo.next_offset;
    } else {
      console.log(
        `🎉 All done! Synced ${batchInfo.total_variants} total variants.`
      );
      return null;
    }
  } catch (error) {
    console.error(`❌ Error syncing batch at offset ${offset}:`, error.message);
    throw error;
  }
}

async function syncAllVariants() {
  if (!ADMIN_KEY) {
    console.error("❌ Error: ADMIN_KEY environment variable is required");
    console.log(
      "Usage: ADMIN_KEY=your-key WORKER_URL=https://your-worker.com node sync-all-shopify.js"
    );
    process.exit(1);
  }

  console.log(`🚀 Starting full Shopify sync...`);
  console.log(`📍 Worker URL: ${WORKER_URL}`);
  console.log(`📦 Batch size: ${BATCH_SIZE} variants per request`);
  console.log("");

  let offset = 0;
  let totalSynced = 0;
  let batchCount = 0;

  try {
    while (offset !== null) {
      batchCount++;
      console.log(`--- Batch #${batchCount} ---`);

      const nextOffset = await syncBatch(offset);

      if (nextOffset !== null) {
        offset = nextOffset;
        totalSynced += BATCH_SIZE;

        // Add a small delay between batches to be nice to the API
        console.log("⏸️  Waiting 2 seconds before next batch...");
        await sleep(2000);
        console.log("");
      } else {
        offset = null;
      }
    }

    console.log("");
    console.log("🎊 SUCCESS! All variants have been synced to the database.");
    console.log(`📊 Total batches processed: ${batchCount}`);
  } catch (error) {
    console.error("");
    console.error("💥 Sync failed:", error.message);
    console.error(
      `📊 Progress before failure: ${totalSynced}+ variants synced`
    );
    console.error(
      "💡 You can resume from where it left off by running the script again."
    );
    process.exit(1);
  }
}

// Run the script
syncAllVariants();
