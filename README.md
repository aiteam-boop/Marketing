# Marketing Google Sheets → MongoDB Sync

## What this does
Continuously syncs every tab in your Google Spreadsheet into the **`marketing`** MongoDB database.
Each sheet becomes its own collection, and the data is kept fresh every **12 minutes**.

---

## Prerequisites
- Node.js 18+
- The service account JSON file already in this folder (`ai-team-482111-c8e74cbc1e22.json`)
- The service account email **must have Viewer access** to the spreadsheet

## Setup

### 1. Update `.env`
Your `.env` is already partially configured. Ensure it contains:

```
MONGODB_URI=mongodb+srv://aiteamcrystal_db_user:bX0q9ZNUad5gTUbP@salescrystal.0f9uk0t.mongodb.net/sales_crm?retryWrites=true&w=majority
GOOGLE_SHEETS_KEY_FILE=ai-team-482111-c8e74cbc1e22.json
SPREADSHEET_ID=1XaHu2np9_ZYye-fRpi0-EHGX8bD7ZR1gpIpQzIE8JUc
```

> **SPREADSHEET_ID** is the long string from your sheet URL:
> `https://docs.google.com/spreadsheets/d/`**`1XaHu2np9_ZYye-fRpi0-EHGX8bD7ZR1gpIpQzIE8JUc`**`/edit…`

### 2. Install dependencies
```bash
cd "C:\Users\Crystal MSI 1\Downloads\Marketing"
npm install
```

### 3. Run a one-time sync (test)
```bash
node sync.js
```

### 4. Start the continuous sync service
```bash
npm start
```

---

## File Structure

| File | Purpose |
|------|---------|
| `db.js` | MongoDB connection (auto-selects `marketing` DB) |
| `sheets.js` | Google Sheets API integration |
| `sync.js` | Sync logic with upserts & retry |
| `cron.js` | Scheduler (every 12 min, runs immediately on start) |
| `.env` | Environment variables |
| `ai-team-482111-c8e74cbc1e22.json` | Google service account key |

---

## MongoDB Collections Created

Each sheet tab → one collection. Sheet names are lowercased & spaces→underscores:

| Sheet Name | MongoDB Collection |
|------------|-------------------|
| WA campaigns and plan | `wa_campaigns_and_plan` |
| Cold emailing data | `cold_emailing_data` |
| Auto email campaign | `auto_email_campaign` |
| SM tracker | `sm_tracker` |
| Content calendar | `content_calendar` |
| New product update | `new_product_update` |
| 2026 cost plan | `2026_cost_plan` |
| Budget | `budget` |
| *(any new sheet added later)* | *(auto-created)* |

---

## How Deduplication Works

1. **If a column like `ID`, `Email`, `Phone`, or `Code` exists** → used as the upsert key (no duplicates).
2. **Otherwise** → a SHA-256 hash of the entire row is computed and stored as `_rowHash`.
   Re-syncing the same row updates it in-place (no duplicate documents).

---

## Metadata Fields Added
Every document gets two extra fields:
- `sheetName` — name of the originating sheet
- `lastSyncedAt` — UTC timestamp of the last sync

---

## Changing Sync Frequency
Edit the `CRON_SCHEDULE` constant in `cron.js`:
```js
const CRON_SCHEDULE = '*/12 * * * *'; // every 12 min
// '*/10 * * * *'  → every 10 min
// '*/15 * * * *'  → every 15 min
```
