import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, FunnelChart, Funnel, LabelList
} from 'recharts';
import { 
  DollarSign, PieChart as PieChartIcon, Target, TrendingUp, 
  ArrowUpDown, Filter, Loader2, AlertCircle, Search, 
  Activity, Users, Zap, ExternalLink, Calendar, ChevronRight, X
} from 'lucide-react';

// ==========================================
// 🎨 UI COMPONENTS (Reusable)
// ==========================================

const Card = ({ children, className = '', title, subtitle, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 p-6 flex flex-col ${className} ${onClick ? 'cursor-pointer hover:border-indigo-400' : ''} hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300`}
  >
    {(title || subtitle) && (
      <div className="mb-6">
        {title && <h3 className="text-lg font-bold text-gray-800 tracking-tight">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-400 mt-1 font-medium">{subtitle}</p>}
      </div>
    )}
    <div className="flex-grow">
      {children}
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-slate-800">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><X /></button>
                </div>
                <div className="flex-grow overflow-auto p-8">
                    {children}
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, subValue, icon: Icon, trend, colorClass = 'blue', onClick }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 shadow-blue-100',
    orange: 'bg-orange-50 text-orange-600 shadow-orange-100',
    green: 'bg-teal-50 text-teal-600 shadow-teal-100',
    purple: 'bg-indigo-50 text-indigo-600 shadow-indigo-100',
    red: 'bg-rose-50 text-rose-600 shadow-rose-100'
  };

  return (
    <Card onClick={onClick} className="hover:-translate-y-1 transition-transform duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-black mt-2 text-slate-800">{value}</h3>
          {subValue && <div className="mt-1 flex items-center">{subValue}</div>}
        </div>
        <div className={`p-4 rounded-2xl shadow-lg ${colorMap[colorClass] || colorMap.blue}`}>
          <Icon className="w-6 h-6 stroke-[2.5px]"/>
        </div>
      </div>
      {trend && (
        <div className="flex items-center text-sm font-bold pt-2 border-t border-slate-50">
          <span className={trend > 0 ? 'text-teal-500' : 'text-rose-500'}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-slate-400 font-medium ml-2">vs last month</span>
        </div>
      )}
    </Card>
  );
};

const ProgressBar = ({ value, max, type = 'budget' }) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  
  let colorClass = 'bg-indigo-500';
  if (type === 'budget') {
    if (percentage > 90) colorClass = 'bg-rose-500';
    else if (percentage > 75) colorClass = 'bg-amber-500';
    else colorClass = 'bg-teal-500';
  } else if (type === 'leads') {
    if (percentage >= 100) colorClass = 'bg-teal-500';
    else if (percentage >= 70) colorClass = 'bg-amber-400';
    else colorClass = 'bg-rose-500';
  }

  return (
    <div className="w-full bg-slate-100/50 rounded-full h-2 mt-3 overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-700 ease-in-out ${colorClass} shadow-sm`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

const Badge = ({ children, color = 'blue' }) => {
  const styles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-teal-50 text-teal-700 border-teal-100',
    yellow: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-rose-50 text-rose-700 border-rose-100',
    gray: 'bg-slate-50 text-slate-700 border-slate-200'
  };
  return (
    <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border border-transparent uppercase tracking-tight ${styles[color] || styles.blue}`}>
      {children}
    </span>
  );
};

// ==========================================
// 📊 DASHBOARD MAIN COMPONENT
// ==========================================

export default function MarketingDashboard() {
  const [data, setData] = useState([]);
  const [imSummary, setImSummary] = useState(null);
  const [imLeads, setImLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('March');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'spent_amount', direction: 'desc' });
  
  // Modals state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [leadDetails, setLeadDetails] = useState(null);

  // 1. Fetch Master Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/marketing/cost-plan`);
        if (!response.ok) throw new Error('API server unreachable');
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error(err);
        setError('Data Engine Unreachable. Ensure API server is active.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Fetch IndiaMART Data
  useEffect(() => {
    const fetchIM = async () => {
        try {
            const sumRes = await fetch(`/api/marketing/indiamart-summary?month=${selectedMonth}`);
            const sumData = await sumRes.json();
            setImSummary(sumData);

            const leadsRes = await fetch(`/api/marketing/indiamart-leads?month=${selectedMonth}`);
            const leadsData = await leadsRes.json();
            setImLeads(leadsData);
        } catch (e) {
            console.error("Funnel fetch error", e);
        }
    };
    if (data.length > 0) fetchIM();
  }, [selectedMonth, data]);

  // 3. Multi-stage Filtering
  const months = useMemo(() => ['All', ...new Set(data.map(d => d.month))], [data]);
  const platforms = useMemo(() => [...new Set(data.map(d => d.platform))], [data]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchMonth = selectedMonth === 'All' || d.month === selectedMonth;
      const matchPlatform = selectedPlatforms.length === 0 || selectedPlatforms.includes(d.platform);
      const matchSearch = d.platform.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchPlatform && matchSearch;
    });
  }, [data, selectedMonth, selectedPlatforms, searchQuery]);

  const summary = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      totalBudget: acc.totalBudget + (curr.total_budget || 0),
      totalSpent: acc.totalSpent + (curr.spent_amount || 0),
      totalRemaining: acc.totalRemaining + (curr.remaining_budget || 0),
      targetLeads: acc.targetLeads + (curr.target_leads || 0),
      achievedLeads: acc.achievedLeads + (curr.achieved_leads || 0),
      poValue: acc.poValue + (curr.po_value || 0),
    }), { totalBudget: 0, totalSpent: 0, totalRemaining: 0, targetLeads: 0, achievedLeads: 0, poValue: 0 });
  }, [filteredData]);

  const funnelData = useMemo(() => {
    if (!imSummary) return [];
    return [
      { value: imSummary.leads_summary.total_leads, name: 'Leads', fill: '#6366f1' },
      { value: imSummary.leads_summary.mql_count, name: 'MQL', fill: '#8b5cf6' },
      { value: imSummary.leads_summary.sql_count, name: 'SQL', fill: '#ec4899' },
      { value: imSummary.leads_summary.po_count, name: 'PO', fill: '#10b981' },
    ];
  }, [imSummary]);

  const sortedData = useMemo(() => {
    let sorted = [...filteredData];
    sorted.sort((a, b) => {
      const valA = a[sortConfig.key] || 0;
      const valB = b[sortConfig.key] || 0;
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
  const formattedCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const fetchLeadDetails = async (phone) => {
      try {
          const res = await fetch(`/api/marketing/lead-details?phone=${phone}`);
          if (res.ok) {
              const d = await res.json();
              setLeadDetails(d);
          }
      } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
      <span className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Initializing Data Engine</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-10">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 text-center max-w-md">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-slate-800 mb-2">Data Engine Outage</h2>
        <p className="text-slate-500 mb-6 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-600 transition-colors">Reconnect</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans text-slate-900 selection:bg-indigo-100 pb-20">
      
      {/* --- STICKY HEADER --- */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
        <div className="container mx-auto">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Marketing Intelligence</h1>
                <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-2 shadow-[0_0_8px_rgba(20,184,166,0.5)]"></span>
                  Connected CRM Funnel • 2026
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <div className="relative flex-grow lg:flex-grow-0 group">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Seach Platform..." 
                  className="pl-11 pr-4 py-2.5 bg-slate-100/50 border-transparent border focus:border-indigo-100 focus:bg-white rounded-2xl text-sm font-semibold outline-none transition-all w-full lg:w-48 placeholder:text-slate-400 focus:shadow-[0_0_20px_rgba(99,102,241,0.06)]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                <select 
                  className="pl-11 pr-10 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors appearance-none shadow-lg shadow-slate-200"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {months.map(m => <option key={m} value={m} className="bg-white text-slate-900">{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50 overflow-x-auto pb-2 scrollbar-hide">
            {platforms.map(p => (
              <button
                key={p}
                onClick={() => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedPlatforms.includes(p) 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {p}
              </button>
            ))}
            {selectedPlatforms.length > 0 && (
              <button onClick={() => setSelectedPlatforms([])} className="text-[10px] font-black uppercase tracking-tighter text-rose-500 ml-2">Clear Chips</button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        
        {/* --- FUNNEL DASHBOARD OVERVIEW --- */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Attribution Cards */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard 
                    title="IndiaMART Lead Volume" 
                    value={imSummary?.leads_summary.total_leads || 0}
                    subValue={<span className="text-indigo-500 text-[10px] font-black uppercase flex items-center">{imSummary?.conversion_rates.lead_to_mql} MQL Rate</span>}
                    icon={Users}
                    colorClass="blue"
                    onClick={() => setDrilldownOpen(true)}
                />
                <MetricCard 
                    title="Revenue Attributed" 
                    value={formattedCurrency(imSummary?.revenue.total_po_value || 0)}
                    subValue={<span className="text-emerald-500 text-[10px] font-black uppercase flex items-center">{imSummary?.leads_summary.po_count} Deals Closed</span>}
                    icon={Zap}
                    colorClass="green"
                    onClick={() => setDrilldownOpen(true)}
                />
                <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4" title={<span className="text-[10px] uppercase text-slate-400 tracking-widest font-black">Planned Budget</span>}>
                        <p className="text-lg font-black">{formattedCurrency(summary.totalBudget / 10)}</p>
                    </Card>
                    <Card className="p-4" title={<span className="text-[10px] uppercase text-slate-400 tracking-widest font-black">MQL Counts</span>}>
                        <p className="text-lg font-black text-indigo-500">{imSummary?.leads_summary.mql_count || 0}</p>
                    </Card>
                    <Card className="p-4" title={<span className="text-[10px] uppercase text-slate-400 tracking-widest font-black">SQL Metrics</span>}>
                        <p className="text-lg font-black text-rose-500">{imSummary?.leads_summary.sql_count || 0}</p>
                    </Card>
                    <Card className="p-4" title={<span className="text-[10px] uppercase text-slate-400 tracking-widest font-black">PO Conversion</span>}>
                        <p className="text-lg font-black text-teal-600">{imSummary?.leads_summary.po_count || 0}</p>
                    </Card>
                </div>
            </div>

            {/* Funnel Chart */}
            <Card title="Acquisition Funnel" subtitle="IndiaMART Attribution Flow" className="lg:col-span-4 shadow-indigo-200/20">
                <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                            <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)'}} />
                            <Funnel dataKey="value" data={funnelData} isAnimationActive>
                                <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" fontStyle="bold" fontSize={10} />
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    <span>Funnel Efficiency: {imSummary?.conversion_rates.sql_to_po} SQL → PO</span>
                </div>
            </Card>
        </section>

        {/* --- GRANULAR PORTAL BREAKDOWN --- */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                Financial Traceability 
                <span className="ml-4 px-3 py-1 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Live Engine</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {sortedData.map((row) => {
              const leadRate = Math.min(100, (row.achieved_leads / row.target_leads) * 100);
              const isIM = row.platform === "IndiaMART" || row.platform === "Indiamart";
              
              return (
                <div key={row.platform + row.month} className={`group bg-white rounded-3xl p-6 border transition-all duration-500 ${isIM ? 'border-indigo-100 shadow-[0_20px_50px_-15px_rgba(99,102,241,0.12)]' : 'border-slate-100 hover:shadow-xl'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-10">
                    
                    <div className="lg:w-48">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isIM ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-indigo-400'} transition-all`}>
                           {isIM ? <Zap className="w-5 h-5 fill-current" /> : <Activity className="w-5 h-5" />}
                        </div>
                        <h4 className="font-black text-slate-800 tracking-tight uppercase text-sm">{row.platform}</h4>
                      </div>
                      <Badge color={isIM ? 'blue' : 'gray'}>{row.month} Performance</Badge>
                    </div>

                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spend Utilization</span>
                          <span className="text-sm font-black text-slate-800 tracking-tighter">{formattedCurrency(row.spent_amount)}</span>
                        </div>
                        <ProgressBar value={row.spent_amount} max={row.total_budget} type="budget" />
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Target Match</span>
                          <span className="text-sm font-black text-slate-800 tracking-tighter">{row.achieved_leads.toLocaleString()} <span className="text-slate-300 font-normal">/ {row.target_leads}</span></span>
                        </div>
                        <ProgressBar value={row.achieved_leads} max={row.target_leads} type="leads" />
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                       <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">ROI Score</p>
                          <p className="text-lg font-black text-indigo-600">{(row.po_value / (row.spent_amount || 1)).toFixed(2)}x</p>
                       </div>
                       <div className="w-px h-12 bg-slate-100 hidden lg:block"></div>
                       <button 
                        onClick={() => { if(isIM) setDrilldownOpen(true); }}
                        className={`p-4 rounded-2xl ${isIM ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-slate-900' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'} transition-all`}
                       >
                          <ChevronRight className="w-6 h-6" />
                       </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* --- DRILL DOWN MODAL (IndiaMART Table) --- */}
      <Modal isOpen={drilldownOpen} onClose={() => setDrilldownOpen(false)} title={`IndiaMART Leads Analysis - ${selectedMonth}`}>
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4">Lead Detail</th>
                        <th className="px-6 py-4">Inquiry Code</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">PO Value</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {imLeads.map((lead, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <p className="font-bold text-slate-800">{lead.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{lead.phone}</p>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-indigo-500 font-bold">{lead.inquiry_code}</td>
                            <td className="px-6 py-4">
                                <Badge color={lead.status === 'Non Potential' ? 'red' : lead.status === 'New Lead' ? 'gray' : 'green'}>{lead.status}</Badge>
                            </td>
                            <td className="px-6 py-4 font-black">{formattedCurrency(lead.po_value)}</td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => fetchLeadDetails(lead.phone)}
                                    className="p-2 hover:bg-slate-900 hover:text-white rounded-lg transition-all text-slate-300"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Modal>

      {/* --- LEAD LIFECYCLE DRAWER --- */}
      {leadDetails && (
          <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transform transition-transform animate-in slide-in-from-right duration-500 overflow-auto p-10">
              <div className="flex justify-between items-start mb-10">
                  <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-2xl shadow-indigo-100"><Users className="w-8 h-8" /></div>
                  <button onClick={() => setLeadDetails(null)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500"><X /></button>
              </div>
              
              <div className="space-y-8">
                  <div>
                    <h3 className="text-3xl font-black text-slate-800">{leadDetails.Client_Person_Name}</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{leadDetails.Client_Company_Name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-400 mb-1 uppercase">Source</p>
                          <p className="font-bold text-sm">{leadDetails.Lead_Source}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-400 mb-1 uppercase">Industry</p>
                          <p className="font-bold text-sm">{leadDetails.Industry}</p>
                      </div>
                  </div>

                  {/* Lifecycle steps */}
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Lead Lifecycle Traceability</h4>
                      <div className="relative pl-10 space-y-10 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-1 before:bg-slate-100 before:rounded-full">
                          <div className="relative">
                            <div className="absolute -left-10 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white ring-8 ring-white"><Activity className="w-4 h-4" /></div>
                            <p className="font-black text-sm text-slate-800">Inquiry Generated</p>
                            <p className="text-[10px] text-slate-400 font-bold">{new Date(leadDetails.Date).toLocaleDateString()}</p>
                          </div>
                          <div className="relative opacity-100">
                             <div className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center ring-8 ring-white ${leadDetails.actual_mql === '1' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}><Zap className="w-4 h-4" /></div>
                             <p className={`font-black text-sm ${leadDetails.actual_mql === '1' ? 'text-slate-800' : 'text-slate-300'}`}>MQL Validation</p>
                             <p className="text-[10px] text-slate-400 font-bold">{leadDetails.SRF_MQL_Date ? new Date(leadDetails.SRF_MQL_Date).toLocaleDateString() : 'Pending'}</p>
                          </div>
                          <div className="relative">
                             <div className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center ring-8 ring-white ${leadDetails.actual_sql === '1' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}><Target className="w-4 h-4" /></div>
                             <p className={`font-black text-sm ${leadDetails.actual_sql === '1' ? 'text-slate-800' : 'text-slate-300'}`}>SQL Opportunity</p>
                             <p className="text-[10px] text-slate-400 font-bold">{leadDetails.SQL_Date ? new Date(leadDetails.SQL_Date).toLocaleDateString() : 'In Evaluation'}</p>
                          </div>
                          <div className="relative">
                             <div className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center ring-8 ring-white ${leadDetails.PO_Value > 0 ? 'bg-teal-500 text-white shadow-xl shadow-teal-100' : 'bg-slate-100 text-slate-300'}`}><DollarSign className="w-4 h-4" /></div>
                             <p className={`font-black text-sm ${leadDetails.PO_Value > 0 ? 'text-slate-800' : 'text-slate-300'}`}>PO Finalization</p>
                             {leadDetails.PO_Value > 0 && <p className="text-xl font-black text-teal-600 mt-1">{formattedCurrency(leadDetails.PO_Value)}</p>}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-slate-900 rounded-3xl text-white">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Latest Owner Remark</p>
                      <p className="text-sm font-medium leading-relaxed italic opacity-90">"{leadDetails.Remarks}"</p>
                      <div className="flex items-center mt-6 pt-6 border-t border-slate-700 select-none">
                          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-black text-xs mr-3">{leadDetails.Lead_Owner?.charAt(0)}</div>
                          <div>
                              <p className="text-xs font-black">{leadDetails.Lead_Owner}</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">Sales Specialist</p>
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      )}

    </div>
  );
}
