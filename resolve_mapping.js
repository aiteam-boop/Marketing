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

  const headerRow = await col.findOne({ Actual_Acheived_January_2026: "Spent Planned " });
  
  if (headerRow) {
      const valueToFields = {};
      Object.keys(headerRow).forEach(k => {
          const v = headerRow[k];
          if (!valueToFields[v]) valueToFields[v] = [];
          valueToFields[v].push(k);
      });
      console.log(JSON.stringify(valueToFields, null, 2));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
