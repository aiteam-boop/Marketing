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

  const googleAds = await col.findOne({ col_iqmbq: "Google Ads/Overall Marketing" });
  if (googleAds) {
      console.log('Google Ads Record:');
      console.log(JSON.stringify(googleAds, null, 2));
      console.log('Total keys:', Object.keys(googleAds).length);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
