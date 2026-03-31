require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI
    ? process.env.MONGODB_URI.replace(/\/[^/?]+(\?|$)/, '/marketing$1')
    : null;

  if (!uri) throw new Error('MONGODB_URI not set');

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ Connected to MongoDB → marketing database');

  const db = mongoose.connection.db;
  const col = db.collection('2026_cost_plan_budget');

  // Total count
  const count = await col.countDocuments();
  console.log(`\n📊 Total documents: ${count}`);

  // Fetch ALL documents
  const docs = await col.find({}).toArray();

  // Collect all unique field keys across all docs
  const allKeys = new Set();
  docs.forEach(doc => {
    Object.keys(doc).forEach(k => allKeys.add(k));
  });

  console.log('\n🔑 All unique field names found across all documents:');
  console.log([...allKeys].sort().join('\n'));

  console.log('\n📄 ALL DOCUMENTS (raw):');
  docs.forEach((doc, i) => {
    console.log(`\n--- Document ${i + 1} ---`);
    console.log(JSON.stringify(doc, null, 2));
  });

  // Field presence analysis
  console.log('\n📈 Field Presence Analysis:');
  [...allKeys].sort().forEach(key => {
    const presentIn = docs.filter(d => d[key] !== undefined && d[key] !== '').length;
    const missingIn = count - presentIn;
    console.log(`  ${key}: present in ${presentIn}/${count} docs (missing: ${missingIn})`);
  });

  await mongoose.disconnect();
  console.log('\n✅ Done.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
