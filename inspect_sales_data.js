require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('\n--- IndiaMART Leads Sample ---');
  const imLead = await db.collection('indiamart_leads').findOne({});
  console.log(JSON.stringify(imLead, null, 2));

  console.log('\n--- Leads Master Sample ---');
  const masterLead = await db.collection('leads_master').findOne({});
  console.log(JSON.stringify(masterLead, null, 2));

  console.log('\n--- Leads (Alternative CRM) Sample ---');
  const altLead = await db.collection('leads').findOne({});
  console.log(JSON.stringify(altLead, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
