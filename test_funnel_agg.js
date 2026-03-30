require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const selectedMonth = "2026-01"; // January 2026

  const pipeline = [
    // 1. Start with IndiaMART leads in the selected month
    {
      $match: {
        queryTime: {
          $gte: new Date("2026-01-01T00:00:00.000Z"),
          $lt: new Date("2026-02-01T00:00:00.000Z")
        }
      }
    },
    // 2. Clean/Normalize phone number for joining
    {
      $addFields: {
        cleanPhone: {
          $trim: {
            input: {
              $replaceAll: {
                input: { $replaceAll: { input: "$senderMobile", find: "+91-", replacement: "" } },
                find: "+91",
                replacement: ""
              }
            }
          }
        }
      }
    },
    // 3. Lookup in Sales Pipeline (leads_master)
    {
      $lookup: {
        from: "leads_master",
        let: { leadPhone: "$cleanPhone" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                   { $eq: ["$Client_Number", "$$leadPhone"] },
                   // Handle cases where Client_Number might still have +91
                   { $regexMatch: { input: "$Client_Number", regex: { $concat: ["$$leadPhone", "$"] } } }
                ]
              }
            }
          }
        ],
        as: "sales_info"
      }
    },
    // 4. Flatten the sales info (if match exists)
    {
      $addFields: {
        sales: { $arrayElemAt: ["$sales_info", 0] }
      }
    },
    // 5. Group by month and platform to get funnel stats
    {
      $group: {
        _id: { month: "January", platform: "IndiaMART" },
        total_leads: { $sum: 1 },
        mql_count: {
          $sum: {
            $cond: [
              { $or: [
                { $eq: ["$sales.actual_mql", "1"] },
                { $eq: ["$sales.actual_mql", 1] }
              ]},
              1, 0
            ]
          }
        },
        sql_count: {
          $sum: {
            $cond: [
              { $or: [
                { $eq: ["$sales.actual_sql", "1"] },
                { $eq: ["$sales.actual_sql", 1] }
              ]},
              1, 0
            ]
          }
        },
        po_count: {
          $sum: {
            $cond: [
              { $gt: [{ $toDouble: { $ifNull: ["$sales.PO_Value", 0] } }, 0] },
              1, 0
            ]
          }
        },
        total_po_value: {
          $sum: { $toDouble: { $ifNull: ["$sales.PO_Value", 0] } }
        }
      }
    },
    // 6. Project final structure
    {
      $project: {
        _id: 0,
        month: "$_id.month",
        platform: "$_id.platform",
        leads_summary: {
          total_leads: "$total_leads",
          mql_count: "$mql_count",
          sql_count: "$sql_count",
          po_count: "$po_count"
        },
        revenue: {
          total_po_value: "$total_po_value"
        }
      }
    }
  ];

  const results = await db.collection('indiamart_leads').aggregate(pipeline).toArray();
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
