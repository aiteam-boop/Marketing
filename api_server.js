require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { getDb, getCrmDb } = require('./db');
const { startCron } = require('./cron');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// DATE-FILTER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS_2026 = ['January', 'February', 'March', 'April', 'May', 'June'];

/**
 * Returns a MongoDB $match fragment for leads_master.Date scoped to a single
 * 2026 month.  Returns {} when month is falsy / "All" (no date restriction).
 */
function buildCrmDateMatch(month) {
  if (!month || month === 'All') return {};
  const idx = MONTHS_2026.indexOf(month);
  if (idx === -1) return {};
  return {
    Date: {
      $gte: new Date(2026, idx, 1),
      $lte: new Date(2026, idx + 1, 0, 23, 59, 59, 999),
    },
  };
}

/**
 * Returns the cost-plan months whose spend columns should be summed.
 * "All" → all six months; otherwise the single named month.
 */
function getActiveMonths(month) {
  if (!month || month === 'All') return MONTHS_2026;
  return MONTHS_2026.includes(month) ? [month] : MONTHS_2026;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN-MAPPING DISCOVERY (cost-plan sheet)
// ─────────────────────────────────────────────────────────────────────────────

async function getMonthMapping(col) {
  const headerRow = await col.findOne({
    $or: [
      { Actual_Acheived_January_2026: 'Spent Planned ' },
      { Actual_Achieved_January_2026: 'Spent Planned ' },
    ],
  });

  if (!headerRow) return null;

  const mapping = {
    months: {
      January:  { planned: 'Actual_Acheived_January_2026',  actual: null, po_planned: null, po_actual: null, po_value: null },
      February: { planned: 'Actual_Acheived_Feburay_2026',  actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null },
      March:    { planned: 'Actual_Acheived_March_2026',    actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null },
      April:    { planned: 'Actual_Acheived_April_2026',    actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null },
      May:      { planned: 'Actual_Acheived_May_2026',      actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null },
      June:     { planned: 'Actual_Acheived_June_2026',     actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null },
    },
    meta: {
      platform:    'col_iqmbq',
      accountable: 'col_sny8k',
      target_mql:  'col_vt0ts',
    },
  };

  const entries = Object.entries(headerRow);
  const actuals    = entries.filter(([, v]) => v === 'Spent Actual ').map(([k]) => k);
  const v_pos      = entries.filter(([, v]) => v === 'PO Planned ').map(([k]) => k);
  const leads      = entries.filter(([, v]) => v === 'Leads').map(([k]) => k);
  const sqls       = entries.filter(([, v]) => v === 'SQL').map(([k]) => k);
  const po_actuals = entries.filter(([, v]) => v === 'PO Actual ').map(([k]) => k);
  const po_values  = entries.filter(([, v]) => v === 'PO Value ').map(([k]) => k);

  mapping.months.January.actual    = actuals[0];
  mapping.months.January.po_planned = v_pos[0];
  mapping.months.January.po_actual  = po_actuals[0];
  mapping.months.January.po_value   = po_values[0];

  const nextMonths = ['February', 'March', 'April', 'May', 'June'];
  nextMonths.forEach((m, i) => {
    mapping.months[m].actual    = actuals[i + 1];
    mapping.months[m].po_planned = v_pos[i + 1];
    mapping.months[m].leads     = leads[i];
    mapping.months[m].sql       = sqls[i];
    mapping.months[m].po_actual  = po_actuals[i + 1];
    mapping.months[m].po_value   = po_values[i + 1];
  });

  return mapping;
}

// ─────────────────────────────────────────────────────────────────────────────
// COST-PLAN ENDPOINT (legacy)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/marketing/cost-plan', async (req, res) => {
  try {
    const db = await getDb();
    const col = db.collection('2026_cost_plan_budget');
    const mapping = await getMonthMapping(col);
    if (!mapping) return res.status(404).send('Mapping not found');

    const facets = {};
    Object.keys(mapping.months).forEach((month) => {
      const m = mapping.months[month];
      const safeToDouble = (field) => ({
        $convert: { input: field, to: 'double', onError: 0.0, onNull: 0.0 },
      });

      facets[month.toLowerCase()] = [
        { $match: { [mapping.meta.platform]: { $nin: ['Marketing Channel', '', null] } } },
        {
          $project: {
            platform:        `$${mapping.meta.platform}`,
            accountable:     `$${mapping.meta.accountable}`,
            month,
            total_budget:    safeToDouble(`$${m.planned}`),
            spent_amount:    safeToDouble(`$${m.actual}`),
            remaining_budget: { $subtract: [safeToDouble(`$${m.planned}`), safeToDouble(`$${m.actual}`)] },
            target_leads:    safeToDouble(`$${mapping.meta.target_mql}`),
            achieved_leads:  safeToDouble(`$${m.leads || 0}`),
            sql:             safeToDouble(`$${m.sql || 0}`),
            po_actual:       safeToDouble(`$${m.po_actual || 0}`),
            po_value:        safeToDouble(`$${m.po_value || 0}`),
          },
        },
      ];
    });

    const pipeline = [
      { $match: { sheetName: '2026 Cost Plan Budget ' } },
      { $facet: facets },
    ];

    const results = await col.aggregate(pipeline).toArray();
    let combined = [];
    Object.keys(results[0]).forEach((key) => {
      combined = combined.concat(results[0][key]);
    });
    res.json(combined);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME DASHBOARD APIs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/dashboard/summary?month=March
 * High-level KPIs; month param restricts both CRM (Date) and spend columns.
 */
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const { month } = req.query;
    const crmDb = await getCrmDb();
    const mktDb = await getDb();

    const dateMatch    = buildCrmDateMatch(month);
    const activeMonths = getActiveMonths(month);

    const crmStats = await crmDb.collection('leads_master').aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id:          null,
          totalLeads:   { $sum: 1 },
          mqlCount:     { $sum: { $cond: [{ $eq: ['$actual_mql', '1'] }, 1, 0] } },
          sqlCount:     { $sum: { $cond: [{ $eq: ['$actual_sql', '1'] }, 1, 0] } },
          poCount:      { $sum: { $cond: [{ $eq: ['$actual_PO',  '1'] }, 1, 0] } },
          totalRevenue: { $sum: { $toDouble: { $ifNull: ['$PO_Value', 0] } } },
        },
      },
    ]).toArray();

    const mktCol  = mktDb.collection('2026_cost_plan_budget');
    const mapping = await getMonthMapping(mktCol);

    let totalSpend = 0;
    if (mapping) {
      const expenseFields = activeMonths.map((m) => mapping.months[m]?.actual).filter(Boolean);
      const mktDocs = await mktCol.find({ sheetName: '2026 Cost Plan Budget ' }).toArray();
      mktDocs.forEach((doc) => {
        expenseFields.forEach((field) => {
          const val = parseFloat(doc[field]);
          if (!isNaN(val)) totalSpend += val;
        });
      });
    }

    const summary = crmStats[0] || { totalLeads: 0, mqlCount: 0, sqlCount: 0, poCount: 0, totalRevenue: 0 };
    res.json({
      ...summary,
      totalSpend,
      roi:        totalSpend > 0 ? (summary.totalRevenue / totalSpend).toFixed(2) : 0,
      costPerSql: summary.sqlCount > 0 ? (totalSpend / summary.sqlCount).toFixed(0) : 0,
      costPerPo:  summary.poCount  > 0 ? (totalSpend / summary.poCount).toFixed(0)  : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/indiamart-data?month=March
 */
app.get('/api/dashboard/indiamart-data', async (req, res) => {
  try {
    const { month } = req.query;
    const crmDb = await getCrmDb();
    const mktDb = await getDb();

    const dateMatch    = buildCrmDateMatch(month);
    const activeMonths = getActiveMonths(month);

    const imStats = await crmDb.collection('leads_master').aggregate([
      { $match: { ...dateMatch, Lead_Source: { $regex: /indiamart/i } } },
      {
        $group: {
          _id:          null,
          totalLeads:   { $sum: 1 },
          mqlCount:     { $sum: { $cond: [{ $eq: ['$actual_mql', '1'] }, 1, 0] } },
          sqlCount:     { $sum: { $cond: [{ $eq: ['$actual_sql', '1'] }, 1, 0] } },
          poCount:      { $sum: { $cond: [{ $eq: ['$actual_PO',  '1'] }, 1, 0] } },
          totalRevenue: { $sum: { $toDouble: { $ifNull: ['$PO_Value', 0] } } },
        },
      },
    ]).toArray();

    const mktCol  = mktDb.collection('2026_cost_plan_budget');
    const mapping = await getMonthMapping(mktCol);
    let imSpend = 0;
    if (mapping) {
      const imDoc = await mktCol.findOne({
        sheetName: '2026 Cost Plan Budget ',
        [mapping.meta.platform]: { $regex: /indiamart/i },
      });
      if (imDoc) {
        activeMonths.forEach((m) => {
          const val = parseFloat(imDoc[mapping.months[m]?.actual]);
          if (!isNaN(val)) imSpend += val;
        });
      }
    }

    const data = imStats[0] || { totalLeads: 0, mqlCount: 0, sqlCount: 0, poCount: 0, totalRevenue: 0 };
    res.json({
      ...data,
      spend: imSpend,
      conversions: {
        leadToSql: data.totalLeads > 0 ? (data.sqlCount / data.totalLeads * 100).toFixed(1) + '%' : '0%',
        sqlToPo:   data.sqlCount   > 0 ? (data.poCount  / data.sqlCount   * 100).toFixed(1) + '%' : '0%',
        leadToPo:  data.totalLeads > 0 ? (data.poCount  / data.totalLeads * 100).toFixed(1) + '%' : '0%',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/funnel-data?month=March
 */
app.get('/api/dashboard/funnel-data', async (req, res) => {
  try {
    const { month } = req.query;
    const crmDb = await getCrmDb();
    const dateMatch = buildCrmDateMatch(month);

    const results = await crmDb.collection('leads_master').aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id:  null,
          Leads: { $sum: 1 },
          MQL:   { $sum: { $cond: [{ $eq: ['$actual_mql', '1'] }, 1, 0] } },
          SQL:   { $sum: { $cond: [{ $eq: ['$actual_sql', '1'] }, 1, 0] } },
          PO:    { $sum: { $cond: [{ $eq: ['$actual_PO',  '1'] }, 1, 0] } },
        },
      },
      { $project: { _id: 0 } },
    ]).toArray();

    const funnel    = results[0] || { Leads: 0, MQL: 0, SQL: 0, PO: 0 };
    const formatted = Object.entries(funnel).map(([name, value], index) => ({
      name,
      value,
      fill: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981'][index],
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/roi-metrics?month=March
 */
app.get('/api/dashboard/roi-metrics', async (req, res) => {
  try {
    const { month } = req.query;
    const crmDb = await getCrmDb();
    const mktDb = await getDb();

    const dateMatch    = buildCrmDateMatch(month);
    const activeMonths = getActiveMonths(month);

    const platformCrmData = await crmDb.collection('leads_master').aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id:     '$Lead_Source',
          leads:   { $sum: 1 },
          sql:     { $sum: { $cond: [{ $eq: ['$actual_sql', '1'] }, 1, 0] } },
          po:      { $sum: { $cond: [{ $eq: ['$actual_PO',  '1'] }, 1, 0] } },
          revenue: { $sum: { $toDouble: { $ifNull: ['$PO_Value', 0] } } },
        },
      },
    ]).toArray();

    const mktCol  = mktDb.collection('2026_cost_plan_budget');
    const mapping = await getMonthMapping(mktCol);
    const metrics = [];

    for (const platform of platformCrmData) {
      if (!platform._id) continue;
      let spend = 0;
      if (mapping) {
        const mktDoc = await mktCol.findOne({
          sheetName: '2026 Cost Plan Budget ',
          [mapping.meta.platform]: { $regex: new RegExp(platform._id.split('/')[0].trim(), 'i') },
        });
        if (mktDoc) {
          activeMonths.forEach((m) => {
            const val = parseFloat(mktDoc[mapping.months[m]?.actual]);
            if (!isNaN(val)) spend += val;
          });
        }
      }
      metrics.push({
        platform: platform._id,
        leads:    platform.leads,
        sql:      platform.sql,
        po:       platform.po,
        revenue:  platform.revenue,
        spend,
        roi: spend > 0 ? (platform.revenue / spend).toFixed(2) : 0,
      });
    }

    res.json(metrics.sort((a, b) => b.revenue - a.revenue));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE ADS PERFORMANCE  (NEW)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/google-ads/performance?month=February
 *
 * Returns:
 *   - monthly[]  : per-month planned / actual spend + leads / SQL from cost plan
 *   - summary    : aggregated totals + CRM stats for google-sourced leads
 */
app.get('/api/google-ads/performance', async (req, res) => {
  try {
    const { month } = req.query;
    const crmDb = await getCrmDb();
    const mktDb = await getDb();

    const mktCol  = mktDb.collection('2026_cost_plan_budget');
    const mapping = await getMonthMapping(mktCol);
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });

    const gadsDoc = await mktCol.findOne({
      sheetName: '2026 Cost Plan Budget ',
      [mapping.meta.platform]: { $regex: /google ads/i },
    });

    const activeMonths = getActiveMonths(month);
    const dateMatch    = buildCrmDateMatch(month);

    // CRM stats for Google-sourced leads
    const crmStats = await crmDb.collection('leads_master').aggregate([
      { $match: { ...dateMatch, Lead_Source: { $regex: /google/i } } },
      {
        $group: {
          _id:        null,
          totalLeads: { $sum: 1 },
          sql:        { $sum: { $cond: [{ $eq: ['$actual_sql', '1'] }, 1, 0] } },
          po:         { $sum: { $cond: [{ $eq: ['$actual_PO',  '1'] }, 1, 0] } },
          revenue:    { $sum: { $toDouble: { $ifNull: ['$PO_Value', 0] } } },
        },
      },
    ]).toArray();

    const safeNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

    // Full monthly breakdown (all 6 months always returned for the chart)
    const allMonthly = MONTHS_2026.map((m) => {
      const md = mapping.months[m];
      const planned  = safeNum(gadsDoc?.[md.planned]);
      const actual   = safeNum(gadsDoc?.[md.actual]);
      const planLeads = safeNum(gadsDoc?.[md.leads]);
      const planSql   = safeNum(gadsDoc?.[md.sql]);
      const poValue   = safeNum(gadsDoc?.[md.po_value]);
      return {
        month: m,
        planned,
        actual,
        planLeads,
        planSql,
        poValue,
        roi: actual > 0 ? +(poValue / actual).toFixed(2) : 0,
      };
    });

    // Filtered slice (respects month param)
    const monthly = activeMonths.length < MONTHS_2026.length
      ? allMonthly.filter((r) => activeMonths.includes(r.month))
      : allMonthly;

    const stats       = crmStats[0] || { totalLeads: 0, sql: 0, po: 0, revenue: 0 };
    const totalSpend  = monthly.reduce((s, r) => s + r.actual,   0);
    const totalBudget = monthly.reduce((s, r) => s + r.planned,  0);
    const planLeads   = monthly.reduce((s, r) => s + r.planLeads, 0);
    const planSql     = monthly.reduce((s, r) => s + r.planSql,   0);

    res.json({
      allMonthly,
      monthly,
      summary: {
        totalSpend,
        totalBudget,
        planLeads,
        planSql,
        ...stats,
        roi: totalSpend > 0 ? +(stats.revenue / totalSpend).toFixed(2) : 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PROOF / TRACEABILITY  (NEW)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/proof/leads?platform=Google+Ads&month=February&filter=sql
 *
 * Returns raw CRM lead records that prove the attribution chain:
 *   marketing_spend → Lead_Source → CRM lead → PO
 *
 * Query params:
 *   platform  – partial match against Lead_Source (omit for all sources)
 *   month     – restrict by Date (omit for all time)
 *   filter    – "sql" | "po" | "" (no restriction)
 */
app.get('/api/proof/leads', async (req, res) => {
  try {
    const { platform, month, filter } = req.query;
    const crmDb = await getCrmDb();

    const matchCriteria = { ...buildCrmDateMatch(month) };

    if (platform && platform.trim()) {
      const keyword = platform.split('/')[0].trim();
      matchCriteria.Lead_Source = { $regex: new RegExp(keyword, 'i') };
    }

    if (filter === 'sql') matchCriteria.actual_sql = '1';
    if (filter === 'po')  matchCriteria.actual_PO  = '1';

    const leads = await crmDb.collection('leads_master')
      .find(matchCriteria)
      .project({
        'Enquiry Code': 1,
        Date:                1,
        Lead_Source:         1,
        Client_Person_Name:  1,
        Client_Company_Name: 1,
        Client_Number:       1,
        Status:              1,
        actual_mql:          1,
        actual_sql:          1,
        actual_PO:           1,
        PO_Value:            1,
        Remarks:             1,
        Lead_Owner:          1,
      })
      .sort({ Date: -1 })
      .limit(500)
      .toArray();

    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD-COMPAT + INDIAMART ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/marketing/indiamart-summary', async (req, res) => {
  res.redirect('/api/dashboard/indiamart-data');
});

app.get('/api/marketing/indiamart-leads', async (req, res) => {
  try {
    const { month } = req.query;
    const crmDb = await getCrmDb();
    const dateMatch = buildCrmDateMatch(month);

    const leads = await crmDb.collection('leads_master').aggregate([
      { $match: { ...dateMatch, Lead_Source: { $regex: /indiamart/i } } },
      {
        $project: {
          name:         '$Client_Person_Name',
          phone:        '$Client_Number',
          email:        '$Email',
          date:         '$Date',
          status:       { $ifNull: ['$status', 'New'] },
          inquiry_code: { $ifNull: ['$Enquiry Code', 'N/A'] },
          po_value:     { $ifNull: ['$PO_Value', 0] },
        },
      },
    ]).toArray();

    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marketing/lead-details', async (req, res) => {
  try {
    const crmDb = await getCrmDb();
    const { phone } = req.query;
    const normalizedPhone = phone.replace(/-/g, '').split(' ').pop();
    const details = await crmDb.collection('leads_master').findOne({ Client_Number: normalizedPhone });
    if (!details) return res.status(404).send('Lead not found in CRM');
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STATIC FILES + SPA FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback — RegExp form is Express 5 safe (avoids path-to-regexp wildcard bug).
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Catch-all route to serve the frontend (index.html) for any unhandled routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📡 Background Sync initialized`);
  startCron();
});
