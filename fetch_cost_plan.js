require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const KEY_FILE = process.env.GOOGLE_SHEETS_KEY_FILE || 'ai-team-482111-c8e74cbc1e22.json';

function getAuthClient() {
  const keyFilePath = path.isAbsolute(KEY_FILE)
    ? KEY_FILE : path.join(__dirname, KEY_FILE);
  return new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

async function main() {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const sheetName = '2026 Cost Plan Budget ';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const rows = response.data.values || [];
  console.log('TOTAL_ROWS:' + rows.length);
  
  rows.forEach((row, i) => {
    process.stdout.write('ROW_' + i + ':' + JSON.stringify(row) + '\n');
  });
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
