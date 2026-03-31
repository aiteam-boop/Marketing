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

  // We know ROW_1 has the labels.
  // We know ROW_2 has unique numeric values.
  const row1 = await col.findOne({ Actual_Acheived_January_2026: "Spent Planned " });
  const row2 = await col.findOne({ col_iqmbq: "Google Ads/Overall Marketing" });

  // Use a script to fetch the RAW ROW 2 from the sheet to compare
  const rawRow2 = ["Google Ads/Overall Marketing","Bunty",75000,600000,150,10,5,15,7500,75000,23000,"",1,450000,75000,54871.52,15,64,4,0,0,75000,0,15,0,0,0,0,75000,0,15,0,0,0,0,75000,0,15,0,0,0,0,75000,0,15,0,0,0,0];

  const mapping = {};
  Object.keys(row2).forEach(key => {
      const val = row2[key];
      // Find which index in rawRow2 matches this value.
      // Since many columns have the same value (e.g. 75000, 15, 0), we need more info.
      // We can use row1[key] to narrow down the label.
  });

  // Actually, I'll just write a script that iterates through ALL records 
  // and tries to reconstruct the month-wise data.
}
