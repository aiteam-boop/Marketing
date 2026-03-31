require('dotenv').config();
const { getDb } = require('./db');
const { getSheetData, getSheetNames } = require('./sheets');

const GOOGLE_ADS_SHEET_ID = '1pi-tezHB3Hatm-eVD0tWjvSrW9YIqnhA5wEz_kkt_Ls';
const GOOGLE_ADS_GID = 1485054800;

async function runGoogleAdsSync() {
    console.log(`\n🔄 Starting Google Ads Performance Sync...`);
    
    try {
        const db = await getDb();
        const collection = db.collection('google_ads_live');

        // 1. Get sheet name from GID
        const sheets = await getSheetNames(GOOGLE_ADS_SHEET_ID);
        const targetSheet = sheets.find(s => s.sheetId === GOOGLE_ADS_GID);
        
        if (!targetSheet) {
            console.error(`   ❌ Could not find sheet with GID: ${GOOGLE_ADS_GID}`);
            return 0;
        }

        console.log(`   Found sheet: "${targetSheet.title}"`);

        // 2. Fetch data
        const data = await getSheetData(targetSheet.title, GOOGLE_ADS_SHEET_ID);
        console.log(`   Fetched ${data.length} performance rows from Google Sheets.`);

        if (data.length === 0) return 0;

        // 3. Sync to MongoDB (Upsert by Date + Ad_Group)
        let syncedCount = 0;
        const operations = data.map(row => {
            // Standardize row data
            const enrichedRow = {
                ...row,
                lastSyncedAt: new Date()
            };

            // Use Date + Ad_Group as unique key for performance data
            return {
                updateOne: {
                    filter: { 
                        Date: row.Date, 
                        Ad_Group: row.Ad_Group,
                        Campaign: row.Campaign
                    },
                    update: { $set: enrichedRow },
                    upsert: true
                }
            };
        });

        // 4. Bulk Write
        if (operations.length > 0) {
            const result = await collection.bulkWrite(operations, { ordered: false });
            syncedCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
        }

        console.log(`✅ Google Ads Sync Complete. Rows Updated: ${syncedCount}`);
        return syncedCount;

    } catch (err) {
        console.error(`❌ Google Ads Sync Failed:`, err.message);
        throw err;
    }
}

module.exports = { runGoogleAdsSync };
