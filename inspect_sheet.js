require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const KEY_FILE = process.env.GOOGLE_SHEETS_KEY_FILE || 'ai-team-482111-c8e74cbc1e22.json';

function getAuthClient() {
  const keyFilePath = path.isAbsolute(KEY_FILE)
    ? KEY_FILE
    : path.join(__dirname, KEY_FILE);
  return new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

async function main() {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  // Get all sheet names first
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties.title',
  });
  const sheetNames = meta.data.sheets.map(s => s.properties.title);
  console.log('📋 All sheet names:', sheetNames);

  // Find the cost plan sheet
  const targetSheet = sheetNames.find(name => 
    name.toLowerCase().includes('cost') || 
    name.toLowerCase().includes('budget') ||
    name.toLowerCase().includes('plan') ||
    name.toLowerCase().includes('2026')
  );
  console.log(`\n🎯 Target sheet: "${targetSheet}"`);

  // Get raw rows with headers
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: targetSheet,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const rows = response.data.values || [];
  console.log(`\n📊 Total rows (including header): ${rows.length}`);
  
  if (rows.length < 1) {
    console.log('No data found!');
    return;
  }

  // Print header row(s) — first 3 rows for context
  console.log('\n🔑 Row 1 (likely headers):');
  console.log(JSON.stringify(rows[0]));
  
  if (rows.length > 1) {
    console.log('\n🔑 Row 2:');
    console.log(JSON.stringify(rows[1]));
  }
  if (rows.length > 2) {
    console.log('\n🔑 Row 3:');
    console.log(JSON.stringify(rows[2]));
  }
  if (rows.length > 3) {
    console.log('\n🔑 Row 4:');
    console.log(JSON.stringify(rows[3]));
  }
  if (rows.length > 4) {
    console.log('\n🔑 Row 5:');
    console.log(JSON.stringify(rows[4]));
  }

  // Print ALL rows as JSON
  console.log('\n\n====== ALL ROWS ======');
  rows.forEach((row, i) => {
    console.log(`Row ${i + 1}: ${JSON.stringify(row)}`);
  });
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
