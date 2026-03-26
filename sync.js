require('dotenv').config();
const crypto = require('crypto');
const { getDb } = require('./db');
const { getSheetNames, getSheetData } = require('./sheets');

/**
 * Sanitize a sheet name into a valid MongoDB collection name.
 * e.g.  "WA campaigns and plan" → "WA_campaigns_and_plan"
 */
function toCollectionName(sheetName) {
  return sheetName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Create a stable hash for a document row to use as a unique key
 * when there is no obvious ID column.
 */
function rowHash(doc) {
  const str = JSON.stringify(doc, Object.keys(doc).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Detect a potential unique key in a document (case-insensitive).
 * Looks for common identifiers; falls back to a computed hash.
 */
const CANDIDATE_ID_KEYS = [
  'id', 'ID', '_id', 'Id',
  'email', 'Email', 'EMAIL',
  'enquiry_code', 'Enquiry_Code', 'code', 'Code',
  'phone', 'Phone', 'mobile', 'Mobile',
  'name', 'Name',
];

function getUniqueKey(doc) {
  for (const key of CANDIDATE_ID_KEYS) {
    if (doc[key] !== undefined && doc[key] !== '') {
      return { field: key, value: doc[key] };
    }
  }
  return null;
}

/**
 * Sync a single sheet into the corresponding MongoDB collection.
 */
async function syncSheet(db, sheetName, records) {
  const collectionName = toCollectionName(sheetName);
  const collection = db.collection(collectionName);
  const now = new Date();

  if (records.length === 0) {
    console.log(`  ℹ️  "${sheetName}" → no data rows, skipping.`);
    return { upserted: 0, matched: 0, failed: 0 };
  }

  const operations = records.map((doc) => {
    const uid = getUniqueKey(doc);

    // Enrich with metadata
    const enriched = {
      ...doc,
      sheetName,
      lastSyncedAt: now,
    };

    let filter;
    let update;

    if (uid) {
      filter = { [uid.field]: uid.value };
      update = { $set: enriched };
    } else {
      // Use a hash of the original row content (without metadata)
      const hash = rowHash(doc);
      filter = { _rowHash: hash };
      update = { $set: { ...enriched, _rowHash: hash } };
    }

    return {
      updateOne: {
        filter,
        update,
        upsert: true,
      },
    };
  });

  // Split into chunks of 500 for large datasets
  const CHUNK = 500;
  let upserted = 0;
  let matched = 0;
  let failed = 0;

  for (let i = 0; i < operations.length; i += CHUNK) {
    const chunk = operations.slice(i, i + CHUNK);
    try {
      const result = await collection.bulkWrite(chunk, { ordered: false });
      upserted += result.upsertedCount;
      matched += result.matchedCount;
    } catch (err) {
      console.error(`  ❌  bulkWrite error for "${sheetName}" chunk ${i / CHUNK + 1}:`, err.message);
      failed += chunk.length;
    }
  }

  return { upserted, matched, failed };
}

/**
 * Main sync function — fetches all sheets and upserts into MongoDB.
 */
async function runSync() {
  console.log(`\n🔄 [${new Date().toISOString()}] Starting sync…`);

  const db = await getDb();
  let sheetNames;

  // ── Fetch sheet list ─────────────────────────────────────────────
  try {
    sheetNames = await getSheetNames();
    console.log(`📋 Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}`);
  } catch (err) {
    console.error('❌ Failed to fetch sheet list:', err.message);
    return;
  }

  let totalUpserted = 0;
  let totalMatched = 0;
  let totalFailed = 0;

  // ── Sync each sheet ──────────────────────────────────────────────
  for (const sheetName of sheetNames) {
    console.log(`\n  📄 Syncing "${sheetName}"…`);
    let records = [];
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        records = await getSheetData(sheetName);
        break; // success
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          console.warn(`     ⚠️  Attempt ${attempt} failed, retrying in 5s… (${err.message})`);
          await new Promise((r) => setTimeout(r, 5000));
        } else {
          console.error(`     ❌  All ${MAX_RETRIES} attempts failed for "${sheetName}":`, err.message);
          records = null;
        }
      }
    }

    if (records === null) continue; // sheet fetch permanently failed

    try {
      const { upserted, matched, failed } = await syncSheet(db, sheetName, records);
      console.log(
        `     ✅ upserted: ${upserted}, matched: ${matched}, failed: ${failed} | rows: ${records.length}`
      );
      totalUpserted += upserted;
      totalMatched += matched;
      totalFailed += failed;
    } catch (err) {
      console.error(`     ❌ DB error for "${sheetName}":`, err.message);
    }
  }

  console.log(
    `\n✅ Sync complete — upserted: ${totalUpserted}, matched: ${totalMatched}, failed: ${totalFailed}`
  );
}

// Allow direct run: `node sync.js`
if (require.main === module) {
  const { connectDB } = require('./db');
  (async () => {
    try {
      await connectDB();
      await runSync();
      process.exit(0);
    } catch (err) {
      console.error('Fatal error:', err);
      process.exit(1);
    }
  })();
}

module.exports = { runSync };
