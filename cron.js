require('dotenv').config();
const cron = require('node-cron');
const { connectDB } = require('./db');
const { runSync } = require('./sync');

// Run every 12 minutes  (change as needed: "*/10" = every 10 min, "*/15" = every 15 min)
const CRON_SCHEDULE = '*/12 * * * *';

(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Cannot start — MongoDB connection failed:', err.message);
    process.exit(1);
  }

  console.log(`\n🚀 Marketing Sheets Sync Service started.`);
  console.log(`   Schedule: every 12 minutes (${CRON_SCHEDULE})`);
  console.log(`   Press Ctrl+C to stop.\n`);

  // Run immediately on startup
  await runSync().catch((err) => console.error('Initial sync error:', err));

  // Then run on schedule
  cron.schedule(CRON_SCHEDULE, async () => {
    await runSync().catch((err) => console.error('Scheduled sync error:', err));
  });
})();
