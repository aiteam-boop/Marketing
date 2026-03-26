import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  DollarSign, PieChart as PieChartIcon, Target, TrendingUp, 
  ArrowUpDown, Filter, Loader2, AlertCircle 
} from 'lucide-react';

// ==========================================
// 🎨 UI COMPONENTS (Reusable)
// ==========================================

const Card = ({ children, className = '' }) => (
  <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

const ProgressBar = ({ value, max, type = 'budget' }) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  
  let colorClass = 'bg-blue-500';
  if (type === 'budget') {
    // Budget: High usage is bad (red)
    if (percentage > 90) colorClass = 'bg-red-500';
    else if (percentage > 75) colorClass = 'bg-yellow-500';
    else colorClass = 'bg-green-500';
  } else if (type === 'leads') {
    // Leads: High achievement is good (green)
    if (percentage >= 100) colorClass = 'bg-green-500';
    else if (percentage >= 70) colorClass = 'bg-yellow-500';
    else colorClass = 'bg-red-500';
  }

  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
      <div 
        className={`h-2.5 rounded-full transition-all duration-500 ease-out ${colorClass}`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

const StatusBadge = ({ percentage, type = 'budget' }) => {
  let status = '';
  let colorClass = '';

  if (type === 'budget') {
    if (percentage > 95) { status = 'Critical'; colorClass = 'bg-red-100 text-red-700'; }
    else if (percentage > 75) { status = 'Warning'; colorClass = 'bg-yellow-100 text-yellow-700'; }
    else { status = 'Healthy'; colorClass = 'bg-green-100 text-green-700'; }
  } else if (type === 'leads') {
    if (percentage >= 100) { status = 'Exceeded'; colorClass = 'bg-green-100 text-green-700'; }
    else if (percentage >= 75) { status = 'On Track'; colorClass = 'bg-yellow-100 text-yellow-700'; }
    else { status = 'Underperforming'; colorClass = 'bg-red-100 text-red-700'; }
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};

// ==========================================
// 📊 DASHBOARD MAIN COMPONENT
// ==========================================

export default function MarketingDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'spent_amount', direction: 'desc' });

  // 1. Fetch Data (Replace with real API URL)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // FIXME: Replace with your actual backend endpoint
        const response = await fetch('/api/marketing/cost-plan');
        
        // --- Fallback mock data if API fails (for demonstration) ---
        if (!response.ok) throw new Error('API not reachable. Using mock data.');
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.warn(err.message);
        // Using realistic mock data based on the Google sheets context
        setData([
          { _id: '1', portal_name: 'IndiaMART', total_budget: 50000, spent_amount: 45000, remaining_budget: 5000, target_leads: 1000, achieved_leads: 950, month: 'January' },
          { _id: '2', portal_name: 'Google Ads', total_budget: 100000, spent_amount: 60000, remaining_budget: 40000, target_leads: 2000, achieved_leads: 1800, month: 'January' },
          { _id: '3', portal_name: 'Meta Ads', total_budget: 80000, spent_amount: 75000, remaining_budget: 5000, target_leads: 1500, achieved_leads: 1600, month: 'January' },
          { _id: '4', portal_name: 'TradeIndia', total_budget: 30000, spent_amount: 10000, remaining_budget: 20000, target_leads: 500, achieved_leads: 200, month: 'January' },
          { _id: '5', portal_name: 'SEO/Organic', total_budget: 20000, spent_amount: 19000, remaining_budget: 1000, target_leads: 800, achieved_leads: 850, month: 'February' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Memoized Calculations & Filtering
  const months = useMemo(() => {
    const m = [...new Set(data.filter(d => d.month).map(d => d.month))];
    return ['All', ...m];
  }, [data]);

  const filteredData = useMemo(() => {
    return selectedMonth === 'All' 
      ? data 
      : data.filter(d => d.month === selectedMonth);
  }, [data, selectedMonth]);

  const summary = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      totalBudget: acc.totalBudget + (curr.total_budget || 0),
      totalSpent: acc.totalSpent + (curr.spent_amount || 0),
      totalRemaining: acc.totalRemaining + (curr.remaining_budget || 0),
      targetLeads: acc.targetLeads + (curr.target_leads || 0),
      achievedLeads: acc.achievedLeads + (curr.achieved_leads || 0),
    }), { totalBudget: 0, totalSpent: 0, totalRemaining: 0, targetLeads: 0, achievedLeads: 0 });
  }, [filteredData]);

  // 3. Sorting Logic for Table
  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key] || 0;
        const valB = b[sortConfig.key] || 0;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // 4. Chart Colors (Tailwind palette)
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const formattedCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  // ==========================================
  // 🔄 LOADING / ERROR STATES
  // ==========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-500 space-x-2">
        <AlertCircle /> <span>Failed to load dashboard data.</span>
      </div>
    );
  }

  // ==========================================
  // 🖥️ MAIN RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 font-sans text-gray-800">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
            Marketing Cost & Performance
          </h1>
          <p className="text-gray-500 mt-1">2026 Budget tracking across all acquisition channels</p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 outline-none cursor-pointer"
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* --- TOP SUMMARY CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Budget</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-800">{formattedCurrency(summary.totalBudget)}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><DollarSign className="w-5 h-5"/></div>
          </div>
        </Card>

        <Card className="hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Spent</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-800">{formattedCurrency(summary.totalSpent)}</h3>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><PieChartIcon className="w-5 h-5"/></div>
          </div>
          <ProgressBar value={summary.totalSpent} max={summary.totalBudget} type="budget" />
          <p className="text-xs text-gray-400 mt-2 text-right">
            {((summary.totalSpent / summary.totalBudget) * 100 || 0).toFixed(1)}% utilized
          </p>
        </Card>

        <Card className="hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Remaining Budget</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-800">{formattedCurrency(summary.totalRemaining)}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl"><TrendingUp className="w-5 h-5"/></div>
          </div>
        </Card>

        <Card className="hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Leads (Target vs Achieved)</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-800">
                {summary.achievedLeads.toLocaleString()} <span className="text-sm text-gray-400 font-normal">/ {summary.targetLeads.toLocaleString()}</span>
              </h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Target className="w-5 h-5"/></div>
          </div>
          <ProgressBar value={summary.achievedLeads} max={summary.targetLeads} type="leads" />
          <p className="text-xs text-gray-400 mt-2 text-right">
            {((summary.achievedLeads / summary.targetLeads) * 100 || 0).toFixed(1)}% achieved
          </p>
        </Card>
      </div>

      {/* --- CHARTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Bar Chart: Budget vs Spent */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-bold mb-6 text-gray-800">Portal Spend Analysis</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="portal_name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(val) => `₹${val/1000}k`} />
                <RechartsTooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [formattedCurrency(value)]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="total_budget" name="Total Budget" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent_amount" name="Spent Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie Chart: Budget Distribution */}
        <Card>
          <h3 className="text-lg font-bold mb-6 text-gray-800">Budget Distribution</h3>
          <div className="h-80 flex justify-center items-center">
            {summary.totalSpent === 0 ? (
              <p className="text-gray-400 text-sm">No spend data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredData.filter(d => d.spent_amount > 0)}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={5}
                    dataKey="spent_amount"
                    nameKey="portal_name"
                    stroke="none"
                  >
                    {filteredData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => [formattedCurrency(value), 'Spent']} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* --- DATA TABLE --- */}
      <Card className="overflow-hidden p-0">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Portal Performance Details</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Portal Name</th>
                
                <th className="px-6 py-4 font-semibold cursor-pointer group" onClick={() => requestSort('total_budget')}>
                  <div className="flex items-center space-x-1">
                    <span>Budget / Spent</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </th>
                
                <th className="px-6 py-4 font-semibold cursor-pointer group" onClick={() => requestSort('achieved_leads')}>
                  <div className="flex items-center space-x-1">
                    <span>Target / Achieved Leads</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </th>

                <th className="px-6 py-4 font-semibold text-right">Performance Status</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-50">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No data found for the selected period.</td>
                </tr>
              ) : (
                sortedData.map((row, idx) => (
                  <tr key={row._id || idx} className="hover:bg-blue-50/30 transition-colors">
                    
                    {/* Portal Name & Month */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800">{row.portal_name || 'Unknown Portal'}</p>
                      {row.month && <p className="text-xs text-gray-400 mt-0.5">{row.month}</p>}
                    </td>

                    {/* Spend Progress */}
                    <td className="px-6 py-4 min-w-[200px]">
                      <div className="flex justify-between items-end mb-1">
                        <span className="font-medium text-gray-800">{formattedCurrency(row.spent_amount || 0)}</span>
                        <span className="text-xs text-gray-400">of {formattedCurrency(row.total_budget || 0)}</span>
                      </div>
                      <ProgressBar value={row.spent_amount || 0} max={row.total_budget || 1} type="budget" />
                    </td>

                    {/* Leads Progress */}
                    <td className="px-6 py-4 min-w-[200px]">
                      <div className="flex justify-between items-end mb-1">
                        <span className="font-medium text-gray-800">{row.achieved_leads?.toLocaleString() || 0}</span>
                        <span className="text-xs text-gray-400">of {row.target_leads?.toLocaleString() || 0}</span>
                      </div>
                      <ProgressBar value={row.achieved_leads || 0} max={row.target_leads || 1} type="leads" />
                    </td>

                    {/* Status Badges */}
                    <td className="px-6 py-4 text-right space-y-2">
                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge 
                          percentage={((row.spent_amount || 0) / (row.total_budget || 1)) * 100} 
                          type="budget" 
                        />
                        <StatusBadge 
                          percentage={((row.achieved_leads || 0) / (row.target_leads || 1)) * 100} 
                          type="leads" 
                        />
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
    </div>
  );
}
