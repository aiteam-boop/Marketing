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

  const doc = await col.findOne({ Marketing_Channel: { $ne: null } });
  if (!doc) {
      // Maybe the key isn't Marketing_Channel because index 0 was empty?
      // Let's just get the first doc.
      const firstDoc = await col.findOne({});
      console.log('Sample Document:');
      console.log(JSON.stringify(firstDoc, null, 2));
  } else {
      console.log('Sample Document:');
      console.log(JSON.stringify(doc, null, 2));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
