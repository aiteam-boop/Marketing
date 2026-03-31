require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI
    ? process.env.MONGODB_URI.replace(/\/[^/?]+(\?|$)/, '/marketing$1')
    : null;

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const col = db.collection('2026_cost_plan_budget');

  // The record at ROW_1 had the labels
  // Let's find it. It has "Spent Planned " in Actual_Acheived_January_2026
  const headerRow = await col.findOne({ Actual_Acheived_January_2026: "Spent Planned " });
  
  if (headerRow) {
      console.log('Complete Mapping from Header Record:');
      // Sort keys to see if there's an index pattern in the col_ names (likely not)
      const sortedKeys = Object.keys(headerRow).sort();
      sortedKeys.forEach(k => {
          console.log(`${k}: "${headerRow[k]}"`);
      });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
