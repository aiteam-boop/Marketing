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

/**
 * Returns the list of all sheet names in the spreadsheet.
 */
async function getSheetNames(spreadsheetId = SPREADSHEET_ID) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.get({
    spreadsheetId: spreadsheetId,
    fields: 'sheets.properties.title,sheets.properties.sheetId',
  });

  return response.data.sheets.map((s) => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId
  }));
}

/**
 * Fetches all rows from a single sheet.
 * Returns an array of plain JS objects (header row = keys).
 */
async function getSheetData(sheetName, spreadsheetId = SPREADSHEET_ID) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: sheetName,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    console.log(`  ⚠️  Sheet "${sheetName}" is empty or has no data rows.`);
    return [];
  }

  // First row → headers; clean them up
  const headers = rows[0].map((h) =>
    String(h).trim().replace(/\s+/g, '_').replace(/[^\w]/g, '') || `col_${Math.random().toString(36).slice(2, 7)}`
  );

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip entirely empty rows
    if (!row || row.every((cell) => cell === '' || cell == null)) continue;

    const doc = {};
    headers.forEach((key, idx) => {
      const val = row[idx];
      doc[key] = val !== undefined && val !== null ? val : '';
    });
    records.push(doc);
  }

  return records;
}

module.exports = { getSheetNames, getSheetData };
