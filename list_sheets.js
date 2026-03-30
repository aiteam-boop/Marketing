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

  // List all sheets
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties.title',
  });
  const sheetNames = meta.data.sheets.map(s => s.properties.title);
  process.stdout.write('SHEET_NAMES:' + JSON.stringify(sheetNames) + '\n');

  // Fetch ALL sheet data in one go
  for (const sheetName of sheetNames) {
    process.stdout.write('\n===SHEET_START:' + sheetName + '===\n');
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      });
      const rows = response.data.values || [];
      process.stdout.write('ROW_COUNT:' + rows.length + '\n');
      // Print first 5 rows
      rows.slice(0, 5).forEach((row, i) => {
        process.stdout.write('ROW_' + i + ':' + JSON.stringify(row) + '\n');
      });
    } catch(e) {
      process.stdout.write('ERROR:' + e.message + '\n');
    }
    process.stdout.write('===SHEET_END===\n');
  }
}

main().catch(e => { process.stderr.write('FATAL:' + e.message + '\n'); process.exit(1); });
