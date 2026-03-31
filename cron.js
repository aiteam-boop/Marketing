require('dotenv').config();
const cron = require('node-cron');
const { connectDB } = require('./db');
const { runSync } = require('./sync');

// Run every 12 minutes  (change as needed: "*/10" = every 10 min, "*/15" = every 15 min)
const CRON_SCHEDULE = '*/12 * * * *';

const startCron = async () => {
    try {
        await connectDB();
    } catch (err) {
        console.error('Cannot start — MongoDB connection failed:', err.message);
        return;
    }

    console.log(`\n🚀 Marketing Sheets Sync Service active.`);
    console.log(`   Schedule: every 12 minutes (${CRON_SCHEDULE})`);

    // Run immediately on startup
    await runSync().catch((err) => console.error('Initial sync error:', err));

    // Then run on schedule
    cron.schedule(CRON_SCHEDULE, async () => {
        await runSync().catch((err) => console.error('Scheduled sync error:', err));
    });
};

module.exports = { startCron };
