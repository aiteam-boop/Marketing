require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const imLead = await db.collection('indiamart_leads').findOne({ senderMobile: { $exists: true } });
  if (!imLead) return console.log('No IM lead found');
  
  const phone = imLead.senderMobile.replace(/[^\d]/g, '').slice(-10); // Extract last 10 digits
  console.log(`Searching for pattern matching last 10 digits: ${phone} for IM lead ${imLead.senderName}`);

  const match = await db.collection('leads_master').findOne({
    Client_Number: { $regex: phone }
  });

  if (match) {
    console.log('Match Found in CRM:');
    console.log(JSON.stringify(match, null, 2));
  } else {
    console.log('No match found in CRM using last 10 digits.');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
