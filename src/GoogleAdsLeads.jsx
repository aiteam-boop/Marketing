import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, AlertCircle, Search, RefreshCw, 
  Calendar, ChevronRight, BarChart3, TrendingUp, 
  MousePointer2, Eye, DollarSign, Target, 
  Percent, ArrowRightLeft, Clock
} from 'lucide-react';

// ==========================================
// 🎨 UI COMPONENTS (Shared)
// ==========================================

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = 'blue' }) => {
  const styles = {
    blue: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    yellow: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-rose-50 text-rose-600 border-rose-100',
    gray: 'bg-slate-50 text-slate-500 border-slate-200'
  };
  return (
    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${styles[color] || styles.blue}`}>
      {children}
    </span>
  );
};

export default function GoogleAdsLeads() {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());

  const fetchPerformance = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch('/api/google-ads-leads');
      if (!response.ok) throw new Error('Failed to fetch Google Ads performance');
      const data = await response.json();
      setPerformance(data);
      setLastSynced(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to marketing engine');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/google-ads-leads/sync', { method: 'POST' });
      if (res.ok) {
        await fetchPerformance(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(() => fetchPerformance(true), 120000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = useMemo(() => {
    return performance.filter(p => {
      const searchStr = searchQuery.toLowerCase();
      return (
        (p.Campaign?.toLowerCase().includes(searchStr)) ||
        (p.Ad_Group?.toLowerCase().includes(searchStr)) ||
        (p.Date?.toString().includes(searchStr))
      );
    });
  }, [performance, searchQuery]);

  const fmt = (val) => new Intl.NumberFormat('en-IN').format(val || 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Accessing Google Ads Performance Streams</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Google Ads Performance</h2>
          <p className="text-slate-400 font-medium text-sm flex items-center mt-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
            Live Performance Metrics (Campaign & Ad Group level) • Updated at {lastSynced}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-grow lg:flex-grow-0">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search campaign or ad group..." 
              className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-semibold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all w-full lg:w-80 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button 
            onClick={triggerSync}
            disabled={isSyncing}
            className={`p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all ${isSyncing ? 'opacity-50' : 'active:scale-95 shadow-sm'}`}
            title="Manual Sync"
          >
            <RefreshCw className={`w-5 h-5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-10 bg-rose-50 border border-rose-100 rounded-3xl text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <p className="font-bold text-rose-700">{error}</p>
        </div>
      ) : (
        <Card className="overflow-hidden p-0 border-none shadow-xl">
           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#171721] text-[#9a9aa1] font-bold uppercase text-[9px] tracking-widest">
                  <tr>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50">Date</th>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50 flex items-center gap-2"><BarChart3 className="w-3 h-3" /> Campaign</th>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50">Ad Group</th>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50 text-center"><MousePointer2 className="w-3 h-3 mx-auto" /> Clicks</th>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50 text-center"><Eye className="w-3 h-3 mx-auto" /> Impressions</th>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50 text-center"><Percent className="w-3 h-3 mx-auto" /> CTR (%)</th>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50 text-right"><DollarSign className="w-3 h-3 ml-auto" /> Avg CPC</th>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50 text-right"><DollarSign className="w-3 h-3 ml-auto" /> Cost</th>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50 text-center"><Target className="w-3 h-3 mx-auto" /> Conversions</th>
                    <th className="px-6 py-5 border-r border-[#2a2a35]/50 text-right"><ArrowRightLeft className="w-3 h-3 ml-auto" /> Cost / Conv</th>
                    <th className="px-6 py-5 text-right"><Clock className="w-3 h-3 ml-auto" /> Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((row, i) => (
                    <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-[11px] font-bold text-slate-500">
                        {row.Date}
                      </td>
                      <td className="px-6 py-4 border-l border-slate-50">
                        <p className="font-bold text-slate-800 text-[12px]">{row.Campaign || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] text-slate-500 font-medium">{row.Ad_Group || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700 text-[12px]">
                         {row.Clicks}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 text-[12px]">
                         {fmt(row.Impressions)}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`text-[11px] font-black ${parseFloat(row.CTR_) > 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                           {row.CTR_}%
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600 text-[12px]">
                         {fmt(row.Avg_CPC)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-indigo-600 text-[12px]">
                         {fmt(row.Cost)}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className={`px-2 py-1 rounded-lg ${parseInt(row.Conversions) > 0 ? 'bg-emerald-50 text-emerald-600 font-black' : 'text-slate-300'} text-[11px] inline-block`}>
                           {row.Conversions}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 text-[11px]">
                         {fmt(row.Cost__Conversion)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 italic text-[10px]">
                         {row.Last_Updated}
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan="11" className="px-8 py-20 text-center">
                         <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">No matching performance records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </Card>
      )}

    </div>
  )
}
