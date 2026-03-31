require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { getDb, getCrmDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve static files from the Vite build in 'dist' (so you only need one server for production)
const path = require('path');
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * Dynamically discover the mapping from header labels in the "2026 Cost Plan Budget " sheet
 */
async function getMonthMapping(col) {
  // Find the header row identifying itself via index 9
  const headerRow = await col.findOne({ 
    $or: [
        { "Actual_Acheived_January_2026": "Spent Planned " },
        { "Actual_Achieved_January_2026": "Spent Planned " } // handling potential typos
    ]
  });

  if (!headerRow) return null;

  // We rely on the fact that headers are shared across all rows.
  // We need to identify which col_XXXX key corresponds to which label.
  const mapping = {
    months: {
      "January": { 
        planned: "Actual_Acheived_January_2026",
        actual: null, po_planned: null, po_actual: null, po_value: null
      },
      "February": {
        planned: "Actual_Acheived_Feburay_2026",
        actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null
      },
      "March": {
        planned: "Actual_Acheived_March_2026",
        actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null
      },
      "April": {
        planned: "Actual_Acheived_April_2026",
        actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null
      },
      "May": {
        planned: "Actual_Acheived_May_2026",
        actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null
      },
      "June": {
        planned: "Actual_Acheived_June_2026",
        actual: null, po_planned: null, leads: null, sql: null, po_actual: null, po_value: null
      }
    },
    meta: {
      platform: "col_iqmbq", // Based on inspection, but we should find it.
      accountable: "col_sny8k",
      target_mql: "col_vt0ts"
    }
  };

  // Find keys corresponding to labels by searching through the headerRow
  const labelsToFind = [
    { label: "Spent Actual ", key: "actual" },
    { label: "PO Planned ", key: "po_planned" },
    { label: "PO Actual ", key: "po_actual" },
    { label: "PO Value ", key: "po_value" },
    { label: "Leads", key: "leads" },
    { label: "SQL", key: "sql" }
  ];

  // We need to group these col_ keys by month order.
  // We know Jan has 5, Feb onwards has 7 columns.
  // Since columns are added to MongoDB in order, we can attempt to find them.
  // However, simple matching by value is safer.
  
  const entries = Object.entries(headerRow);
  
  // Map based on the resolved_mapping.txt logic (order of discovery)
  const actuals = entries.filter(([k, v]) => v === "Spent Actual ").map(([k, v]) => k);
  const v_pos = entries.filter(([k, v]) => v === "PO Planned ").map(([k, v]) => k);
  const leads = entries.filter(([k, v]) => v === "Leads").map(([k, v]) => k);
  const sqls = entries.filter(([k, v]) => v === "SQL").map(([k, v]) => k);
  const po_actuals = entries.filter(([k, v]) => v === "PO Actual ").map(([k, v]) => k);
  const po_values = entries.filter(([k, v]) => v === "PO Value ").map(([k, v]) => k);

  // Assignment based on identified ordering
  mapping.months.January.actual = actuals[0];
  mapping.months.January.po_planned = v_pos[0];
  mapping.months.January.po_actual = po_actuals[0];
  mapping.months.January.po_value = po_values[0];

  const nextMonths = ["February", "March", "April", "May", "June"];
  nextMonths.forEach((m, i) => {
    mapping.months[m].actual = actuals[i+1];
    mapping.months[m].po_planned = v_pos[i+1];
    mapping.months[m].leads = leads[i];
    mapping.months[m].sql = sqls[i];
    mapping.months[m].po_actual = po_actuals[i+1];
    mapping.months[m].po_value = po_values[i+1];
  });

  return mapping;
}

app.get('/api/marketing/cost-plan', async (req, res) => {
  try {
    const db = await getDb();
    const col = db.collection('2026_cost_plan_budget');
    
    // Discover mapping
    const mapping = await getMonthMapping(col);
    if (!mapping) return res.status(404).send('Mapping not found');

    // Aggregate into normalized vertical format
    const facets = {};
    Object.keys(mapping.months).forEach(month => {
      const m = mapping.months[month];
      
      const safeToDouble = (field) => ({
        $convert: {
          input: field,
          to: "double",
          onError: 0.0,
          onNull: 0.0
        }
      });

      facets[month.toLowerCase()] = [
        { $match: { [mapping.meta.platform]: { $nin: ["Marketing Channel", "", null] } } },
        { $project: {
          platform: `$${mapping.meta.platform}`,
          accountable: `$${mapping.meta.accountable}`,
          month: month,
          total_budget: safeToDouble(`$${m.planned}`),
          spent_amount: safeToDouble(`$${m.actual}`),
          remaining_budget: { $subtract: [safeToDouble(`$${m.planned}`), safeToDouble(`$${m.actual}`)] },
          target_leads: safeToDouble(`$${mapping.meta.target_mql}`),
          achieved_leads: safeToDouble(`$${m.leads || 0}`),
          sql: safeToDouble(`$${m.sql || 0}`),
          po_actual: safeToDouble(`$${m.po_actual || 0}`),
          po_value: safeToDouble(`$${m.po_value || 0}`)
        }}
      ];
    });

    const pipeline = [
      { $match: { sheetName: "2026 Cost Plan Budget " } },
      { $facet: facets }
    ];

    const results = await col.aggregate(pipeline).toArray();
    
    // Combine results from facets
    let combined = [];
    Object.keys(results[0]).forEach(key => {
        combined = combined.concat(results[0][key]);
    });

    res.json(combined);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * IndiaMART Funnel Summary API
 * Returns aggregated stats for IndiaMART funnel (Leads -> MQL -> SQL -> PO)
 */
app.get('/api/marketing/indiamart-summary', async (req, res) => {
  try {
    const crmDb = await getCrmDb();
    const month = req.query.month || "March";
    
    // Mapping for month (2026-03 for March)
    const monthMap = { "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6 };
    const monthNum = monthMap[month] || 3;
    const year = 2026;

    const pipeline = [
      {
        $match: {
          queryTime: {
            $gte: new Date(year, monthNum - 1, 1),
            $lt: new Date(year, monthNum, 1)
          }
        }
      },
      {
        $addFields: {
          cleanPhone: {
            $arrayElemAt: [
              { $split: [ { $replaceAll: { input: "$senderMobile", find: "-", replacement: "" } }, " " ] },
              { $subtract: [ { $size: { $split: [ { $replaceAll: { input: "$senderMobile", find: "-", replacement: "" } }, " " ] } }, 1 ] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: "leads_master",
          localField: "cleanPhone",
          foreignField: "Client_Number",
          as: "crm_info"
        }
      },
      { $addFields: { crm: { $arrayElemAt: ["$crm_info", 0] } } },
      {
        $group: {
          _id: null,
          total_leads: { $sum: 1 },
          mql_count: { $sum: { $cond: [{ $eq: ["$crm.actual_mql", "1"] }, 1, 0] } },
          sql_count: { $sum: { $cond: [{ $eq: ["$crm.actual_sql", "1"] }, 1, 0] } },
          po_count: { $sum: { $cond: [{ $gt: [{ $toDouble: { $ifNull: ["$crm.PO_Value", 0] } }, 0] }, 1, 0] } },
          total_po_value: { $sum: { $toDouble: { $ifNull: ["$crm.PO_Value", 0] } } }
        }
      }
    ];

    const results = await crmDb.collection('indiamart_leads').aggregate(pipeline).toArray();
    const summary = results[0] || { total_leads: 0, mql_count: 0, sql_count: 0, po_count: 0, total_po_value: 0 };
    
    res.json({
        month,
        platform: "IndiaMART",
        leads_summary: summary,
        conversion_rates: {
            lead_to_mql: summary.total_leads > 0 ? (summary.mql_count / summary.total_leads * 100).toFixed(1) + "%" : "0%",
            mql_to_sql: summary.mql_count > 0 ? (summary.sql_count / summary.mql_count * 100).toFixed(1) + "%" : "0%",
            sql_to_po: summary.sql_count > 0 ? (summary.po_count / summary.sql_count * 100).toFixed(1) + "%" : "0%"
        },
        revenue: { total_po_value: summary.total_po_value }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * IndiaMART Granular Leads API (for Table drill-down)
 */
app.get('/api/marketing/indiamart-leads', async (req, res) => {
    try {
        const crmDb = await getCrmDb();
        const month = req.query.month || "March";
        const monthMap = { "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6 };
        const monthNum = monthMap[month] || 3;
        
        const leads = await crmDb.collection('indiamart_leads').aggregate([
            {
                $match: {
                    queryTime: {
                        $gte: new Date(2026, monthNum - 1, 1),
                        $lt: new Date(2026, monthNum, 1)
                    }
                }
            },
            {
                $addFields: {
                  cleanPhone: {
                    $arrayElemAt: [
                      { $split: [ { $replaceAll: { input: "$senderMobile", find: "-", replacement: "" } }, " " ] },
                      { $subtract: [ { $size: { $split: [ { $replaceAll: { input: "$senderMobile", find: "-", replacement: "" } }, " " ] } }, 1 ] }
                    ]
                  }
                }
            },
            {
                $lookup: {
                    from: "leads_master",
                    localField: "cleanPhone",
                    foreignField: "Client_Number",
                    as: "crm"
                }
            },
            { $unwind: { path: "$crm", preserveNullAndEmptyArrays: true } },
            { $project: {
                name: "$senderName",
                phone: "$senderMobile",
                email: "$senderEmail",
                date: "$queryTime",
                status: { $ifNull: ["$crm.Status", "New Lead"] },
                inquiry_code: { $ifNull: ["$crm.Enquiry Code", "N/A"] },
                po_value: { $ifNull: ["$crm.PO_Value", 0] }
            }}
        ]).toArray();
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Single Lead Lifecycle Details API
 */
app.get('/api/marketing/lead-details', async (req, res) => {
    try {
        const crmDb = await getCrmDb();
        const { phone } = req.query;
        // Normalize the incoming phone number for lookup
        const normalizedPhone = phone.replace(/-/g, '').split(' ').pop();
        const details = await crmDb.collection('leads_master').findOne({ Client_Number: normalizedPhone });
        if (!details) return res.status(404).send('Lead not found in CRM');
        res.json(details);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
