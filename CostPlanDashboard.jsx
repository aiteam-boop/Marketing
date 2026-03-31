import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  DollarSign, Target, TrendingUp,
  Loader2, AlertCircle,
  Activity, Users, Zap, ExternalLink, ChevronRight, X,
  Shield,
} from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiUrl = (path) => `${API_BASE_URL}${path}`;

const MONTHS_2026 = ['January', 'February', 'March', 'April', 'May', 'June'];

const fmt = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(val || 0);

// ==========================================
// UI COMPONENTS (unchanged layout)
// ==========================================

const Card = ({ children, className = '', title, subtitle, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 p-6 flex flex-col ${className} ${onClick ? 'cursor-pointer hover:border-indigo-400' : ''} hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300`}
  >
    {(title || subtitle) && (
      <div className="mb-6">
        {title    && <h3 className="text-lg font-bold text-gray-800 tracking-tight">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-400 mt-1 font-medium">{subtitle}</p>}
      </div>
    )}
    <div className="flex-grow">{children}</div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-2xl font-black text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <X />
          </button>
        </div>
        <div className="flex-grow overflow-auto p-8">{children}</div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subValue, icon: Icon, colorClass = 'blue', onProof, proofLabel }) => {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-600 shadow-blue-100',
    orange: 'bg-orange-50 text-orange-600 shadow-orange-100',
    green:  'bg-teal-50 text-teal-600 shadow-teal-100',
    purple: 'bg-indigo-50 text-indigo-600 shadow-indigo-100',
    red:    'bg-rose-50 text-rose-600 shadow-rose-100',
  };
  return (
    <Card className="hover:-translate-y-1 transition-transform duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-black mt-2 text-slate-800">{value}</h3>
          {subValue && <div className="mt-1 flex items-center">{subValue}</div>}
        </div>
        <div className={`p-4 rounded-2xl shadow-lg ${colorMap[colorClass] || colorMap.blue}`}>
          <Icon className="w-6 h-6 stroke-[2.5px]" />
        </div>
      </div>
      {onProof && (
        <button
          onClick={onProof}
          className="mt-3 pt-3 border-t border-slate-50 w-full flex items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
        >
          <Shield className="w-3 h-3 mr-1.5" />
          {proofLabel || 'View Proof'}
        </button>
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
      />
    </div>
  );
};

const Badge = ({ children, color = 'blue' }) => {
  const styles = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-teal-50 text-teal-700 border-teal-100',
    yellow: 'bg-amber-50 text-amber-700 border-amber-100',
    red:    'bg-rose-50 text-rose-700 border-rose-100',
    gray:   'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border border-transparent uppercase tracking-tight ${styles[color] || styles.blue}`}>
      {children}
    </span>
  );
};

// ==========================================
// PROOF MODAL  (new — shows CRM records behind any metric)
// ==========================================

const ProofModal = ({ isOpen, onClose, title, subtitle, leads, loading }) => {
  if (!isOpen) return null;
  const poTotal  = leads.reduce((s, l) => s + (parseFloat(l.PO_Value) || 0), 0);
  const mqlCount = leads.filter((l) => l.actual_mql === '1').length;
  const sqlCount = leads.filter((l) => l.actual_sql === '1').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {subtitle && (
        <p className="text-sm text-slate-500 font-medium -mt-4 mb-6 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          {subtitle}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-slate-400 font-bold">Loading proof records…</span>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          {leads.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Leads', value: leads.length,   color: 'text-slate-800' },
                { label: 'MQL',         value: mqlCount,       color: 'text-indigo-600' },
                { label: 'SQL',         value: sqlCount,       color: 'text-rose-500' },
                { label: 'PO Revenue',  value: fmt(poTotal),   color: 'text-teal-600' },
              ].map((k) => (
                <div key={k.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
                  <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Lead</th>
                  <th className="px-5 py-4">Inquiry Code</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Source</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">MQL</th>
                  <th className="px-5 py-4 text-center">SQL</th>
                  <th className="px-5 py-4 text-right">PO Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center text-slate-400 font-bold">
                      No leads found for this selection
                    </td>
                  </tr>
                ) : (
                  leads.map((lead, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-bold text-slate-800 text-xs">{lead.Client_Person_Name || '—'}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{lead.Client_Number}</p>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-indigo-500 font-bold">
                        {lead['Enquiry Code'] || '—'}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-slate-500">
                        {lead.Date
                          ? new Date(lead.Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-[11px] font-bold text-slate-600">{lead.Lead_Source || '—'}</td>
                      <td className="px-5 py-3">
                        <Badge color={lead.Status === 'Non Potential' ? 'red' : !lead.Status || lead.Status === 'New' ? 'gray' : 'green'}>
                          {lead.Status || 'New'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={lead.actual_mql === '1' ? 'text-teal-500 font-black' : 'text-slate-200'}>
                          {lead.actual_mql === '1' ? '✓' : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={lead.actual_sql === '1' ? 'text-teal-500 font-black' : 'text-slate-200'}>
                          {lead.actual_sql === '1' ? '✓' : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-black text-teal-600 text-xs">
                        {lead.PO_Value && parseFloat(lead.PO_Value) > 0 ? fmt(lead.PO_Value) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
};

// ==========================================
// DASHBOARD MAIN COMPONENT
// ==========================================

export default function MarketingDashboard() {
  // ── Core data ────────────────────────────────────────────────────
  const [summary,        setSummary]        = useState(null);
  const [imData,         setImData]         = useState(null);
  const [funnelData,     setFunnelData]     = useState([]);
  const [roiMetrics,     setRoiMetrics]     = useState([]);
  const [imLeads,        setImLeads]        = useState([]);
  const [googleAdsData,  setGoogleAdsData]  = useState(null);

  // ── UI state ─────────────────────────────────────────────────────
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState(null);
  const [selectedMonth,  setSelectedMonth]  = useState('All');

  // ── Modals ───────────────────────────────────────────────────────
  const [drilldownOpen,  setDrilldownOpen]  = useState(false);
  const [leadDetails,    setLeadDetails]    = useState(null);

  // ── Proof modal ──────────────────────────────────────────────────
  const [proofOpen,      setProofOpen]      = useState(false);
  const [proofTitle,     setProofTitle]     = useState('');
  const [proofSubtitle,  setProofSubtitle]  = useState('');
  const [proofLeads,     setProofLeads]     = useState([]);
  const [proofLoading,   setProofLoading]   = useState(false);

  // track first vs. subsequent loads for the loading indicator
  const hasLoaded = useRef(false);

  // ── Data fetching ────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    else                    setRefreshing(true);

    const qs = selectedMonth !== 'All' ? `?month=${encodeURIComponent(selectedMonth)}` : '';

    try {
      const [summaryRes, imRes, funnelRes, roiRes, imLeadsRes, gadsRes] = await Promise.all([
        fetch(apiUrl(`/api/dashboard/summary${qs}`)),
        fetch(apiUrl(`/api/dashboard/indiamart-data${qs}`)),
        fetch(apiUrl(`/api/dashboard/funnel-data${qs}`)),
        fetch(apiUrl(`/api/dashboard/roi-metrics${qs}`)),
        fetch(apiUrl(`/api/marketing/indiamart-leads${qs}`)),
        fetch(apiUrl(`/api/google-ads/performance${qs}`)),
      ]);

      const [summaryData, imDataRes, funnelDataRes, roiDataRes, imLeadsData, gadsData] =
        await Promise.all([
          summaryRes.json(),
          imRes.json(),
          funnelRes.json(),
          roiRes.json(),
          imLeadsRes.json(),
          gadsRes.json(),
        ]);

      setSummary(summaryData);
      setImData(imDataRes);
      setFunnelData(funnelDataRes);
      setRoiMetrics(roiDataRes);
      setImLeads(imLeadsData);
      setGoogleAdsData(gadsData);
    } catch (err) {
      console.error(err);
      if (!hasLoaded.current) {
        setError('Connection failed. Start the API server and ensure /api is reachable.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoaded.current = true;
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Proof panel ──────────────────────────────────────────────────

  const openProof = useCallback(async (platform, month, filter = '') => {
    setProofOpen(true);
    setProofLoading(true);
    setProofTitle(`Proof Layer — ${platform || 'All Sources'}`);
    setProofSubtitle(
      `CRM leads attributed to "${platform || 'all sources'}"` +
      (month && month !== 'All' ? ` in ${month}` : ' (all time)')
    );
    setProofLeads([]);
    try {
      const params = new URLSearchParams();
      if (platform) params.append('platform', platform);
      if (month && month !== 'All') params.append('month', month);
      if (filter) params.append('filter', filter);
      const res  = await fetch(apiUrl(`/api/proof/leads?${params}`));
      const data = await res.json();
      setProofLeads(Array.isArray(data) ? data : []);
    } catch {
      setProofLeads([]);
    } finally {
      setProofLoading(false);
    }
  }, []);

  // ── Lead lifecycle drawer ────────────────────────────────────────

  const fetchLeadDetails = async (phone) => {
    try {
      const res = await fetch(apiUrl(`/api/marketing/lead-details?phone=${encodeURIComponent(phone)}`));
      if (res.ok) {
        const d = await res.json();
        setLeadDetails(d);
      }
    } catch (e) { console.error(e); }
  };

  // ── Loading / error screens ──────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
      <span className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">
        Fetching Real-Time Intelligence…
      </span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-10">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 text-center max-w-md">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-slate-800 mb-2">Data Engine Outage</h2>
        <p className="text-slate-500 mb-6 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-600 transition-colors"
        >
          Reconnect
        </button>
      </div>
    </div>
  );

  // ── Derived values ───────────────────────────────────────────────

  const gads        = googleAdsData?.summary  || {};
  const gadsMonthly = googleAdsData?.monthly  || [];

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans text-slate-900 selection:bg-indigo-100 pb-20">

      {/* ── STICKY HEADER (unchanged layout + filter bar added) ── */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
        <div className="container mx-auto">

          {/* Top row */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                  Marketing Intelligence
                </h1>
                <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-2 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                  Live MongoDB Data • Real-Time Update
                  {refreshing && (
                    <span className="ml-3 text-indigo-400 animate-pulse">• Updating…</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black text-indigo-600 uppercase">
                ROI: {summary?.roi}x
              </span>
            </div>
          </div>

          {/* ── GLOBAL DATE FILTER (month selector) ── */}
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-100/70">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
              Period 2026:
            </span>
            {['All', ...MONTHS_2026].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                  selectedMonth === m
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {m === 'All' ? 'All' : m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-10">

        {/* ── SECTION 1: GLOBAL METRICS ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Ad Spend"
            value={fmt(summary?.totalSpend || 0)}
            icon={DollarSign}
            colorClass="blue"
            onProof={() => openProof('', selectedMonth)}
            proofLabel="View all leads"
          />
          <MetricCard
            title="Total Revenue"
            value={fmt(summary?.totalRevenue || 0)}
            icon={Zap}
            colorClass="green"
            onProof={() => openProof('', selectedMonth, 'po')}
            proofLabel="View PO records"
          />
          <MetricCard
            title="Total Leads"
            value={summary?.totalLeads || 0}
            icon={Users}
            colorClass="purple"
            onProof={() => openProof('', selectedMonth)}
            proofLabel="View all leads"
          />
          <MetricCard
            title="SQL Conversion"
            value={summary?.sqlCount || 0}
            subValue={
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {summary?.poCount} Deals Closed
              </span>
            }
            icon={Target}
            colorClass="red"
            onProof={() => openProof('', selectedMonth, 'sql')}
            proofLabel="View SQL leads"
          />
        </section>

        {/* ── SECTION 2: GOOGLE ADS PERFORMANCE (new) ── */}
        <section>
          <div className="flex items-center mb-5">
            <div className="w-1.5 h-8 bg-indigo-600 rounded-full mr-3" />
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                Google Ads Performance
              </h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Cost-Plan Intelligence • Click any row → CRM lead proof
              </p>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
            {[
              { label: 'Budget',     value: fmt(gads.totalBudget), color: 'text-slate-800' },
              { label: 'Spent',      value: fmt(gads.totalSpend),  color: gads.totalSpend > gads.totalBudget ? 'text-rose-600' : 'text-slate-800' },
              { label: 'Plan Leads', value: gads.planLeads || 0,   color: 'text-indigo-600' },
              { label: 'Plan SQL',   value: gads.planSql   || 0,   color: 'text-rose-500' },
              { label: 'ROI',        value: `${gads.roi || 0}x`,   color: 'text-teal-600' },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_15px_rgb(0,0,0,0.03)]"
              >
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {kpi.label}
                </p>
                <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Table + chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Monthly breakdown table */}
            <Card
              title="Monthly Campaign Breakdown"
              subtitle="Click a row to view linked CRM leads (proof layer)"
              className="lg:col-span-7"
            >
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="pb-3 pr-4 font-black">Month</th>
                      <th className="pb-3 pr-4 font-black text-right">Budget</th>
                      <th className="pb-3 pr-4 font-black text-right">Spent</th>
                      <th className="pb-3 pr-4 font-black text-right">Util</th>
                      <th className="pb-3 pr-4 font-black text-right">Leads</th>
                      <th className="pb-3 pr-4 font-black text-right">SQL</th>
                      <th className="pb-3 font-black text-right">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {gadsMonthly.map((m) => {
                      const util = m.planned > 0
                        ? ((m.actual / m.planned) * 100).toFixed(0)
                        : 0;
                      return (
                        <tr
                          key={m.month}
                          onClick={() => openProof('Google Ads', m.month)}
                          className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                        >
                          <td className="py-3 pr-4 font-black text-slate-800 text-sm">
                            {m.month.slice(0, 3)}
                          </td>
                          <td className="py-3 pr-4 text-right text-slate-400 text-xs">
                            {fmt(m.planned)}
                          </td>
                          <td className={`py-3 pr-4 text-right font-bold text-xs ${m.actual > m.planned && m.planned > 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                            {m.actual > 0 ? fmt(m.actual) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-3 pr-4 text-right text-xs">
                            <span className={`font-black ${util > 90 ? 'text-rose-500' : util > 50 ? 'text-amber-500' : util > 0 ? 'text-teal-500' : 'text-slate-300'}`}>
                              {util > 0 ? `${util}%` : '—'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right font-black text-indigo-500 text-xs">
                            {m.planLeads || <span className="text-slate-300 font-normal">0</span>}
                          </td>
                          <td className="py-3 pr-4 text-right font-black text-rose-500 text-xs">
                            {m.planSql || <span className="text-slate-300 font-normal">0</span>}
                          </td>
                          <td className="py-3 text-right">
                            {m.roi > 0 ? (
                              <Badge color={m.roi > 3 ? 'green' : m.roi > 1 ? 'blue' : 'yellow'}>
                                {m.roi}x
                              </Badge>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => openProof('Google Ads', selectedMonth)}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                View All Google Ads Leads (Proof Layer)
              </button>
            </Card>

            {/* Spend vs Budget chart */}
            <Card title="Spend vs Budget" subtitle="Monthly utilisation" className="lg:col-span-5">
              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gadsMonthly} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(v) => v.slice(0, 3)}
                      fontSize={10}
                      fontWeight="bold"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <RechartsTooltip
                      formatter={(v, n) => [fmt(v), n === 'planned' ? 'Budget' : 'Spent']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="planned" radius={[4, 4, 0, 0]} fill="#e2e8f0" barSize={22} name="Budget" />
                    <Bar dataKey="actual"  radius={[4, 4, 0, 0]} fill="#6366f1" barSize={22} name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </section>

        {/* ── SECTION 3: INDIAMART + FUNNEL (unchanged layout) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card title="IndiaMART Performance" subtitle="Lead Generation & Pipeline" className="lg:col-span-8 shadow-indigo-200/20">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Leads</p>
                <p className="text-2xl font-black">{imData?.totalLeads || 0}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MQL</p>
                <p className="text-2xl font-black text-indigo-500">{imData?.mqlCount || 0}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SQL</p>
                <p className="text-2xl font-black text-rose-500">{imData?.sqlCount || 0}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Revenue</p>
                <p className="text-2xl font-black text-teal-600">{fmt(imData?.totalRevenue || 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Lead → SQL</p>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-black">{imData?.conversions.leadToSql}</span>
                </div>
                <ProgressBar value={imData?.sqlCount || 0} max={imData?.totalLeads || 1} type="leads" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">SQL → PO</p>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-black">{imData?.conversions.sqlToPo}</span>
                </div>
                <ProgressBar value={imData?.poCount || 0} max={imData?.sqlCount || 1} type="leads" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Lead → PO</p>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-black">{imData?.conversions.leadToPo}</span>
                </div>
                <ProgressBar value={imData?.poCount || 0} max={imData?.totalLeads || 1} type="leads" />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => setDrilldownOpen(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center shadow-lg shadow-indigo-100"
              >
                View Granular Leads <ChevronRight className="ml-2 w-4 h-4" />
              </button>
              <button
                onClick={() => openProof('IndiaMART', selectedMonth)}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center"
              >
                <Shield className="w-3.5 h-3.5 mr-2" /> Proof Layer
              </button>
            </div>
          </Card>

          <Card title="Acquisition Funnel" subtitle="Global Attribution" className="lg:col-span-4 shadow-pink-200/20">
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" fontStyle="bold" fontSize={10} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* ── SECTION 4: ROI ANALYSIS + MARKETING DATA (unchanged layout) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="ROI Analysis" subtitle="Revenue Optimization">
            <div className="space-y-6 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Global ROI Score</span>
                <span className="text-2xl font-black text-indigo-600">{summary?.roi}x</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <span className="text-sm font-bold text-slate-500">Cost per SQL</span>
                <span className="text-xl font-black text-slate-800">{fmt(summary?.costPerSql)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <span className="text-sm font-bold text-slate-500">Cost per PO</span>
                <span className="text-xl font-black text-slate-800">{fmt(summary?.costPerPo)}</span>
              </div>
            </div>
          </Card>

          <Card title="Marketing Data" subtitle="Platform Spend Distribution" className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiMetrics.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="platform"
                    fontSize={10}
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v || '').split('/')[0].slice(0, 10)}
                  />
                  <YAxis hide />
                  <RechartsTooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="spend"   radius={[6, 6, 0, 0]} fill="#6366f1" barSize={30} name="Spend" />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#10b981" barSize={30} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* ── SECTION 5: PLATFORM CARDS (unchanged layout + proof button) ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roiMetrics.map((platform) => (
            <div
              key={platform.platform}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center">
                  <div className="w-2 h-6 bg-indigo-600 rounded-full mr-3" />
                  {(platform.platform || '').split('/')[0]}
                </h4>
                <Badge color={platform.roi > 5 ? 'green' : platform.roi > 2 ? 'blue' : 'gray'}>
                  {platform.roi}x ROI
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-slate-400">Total Spend</span>
                  <span className="text-xs font-black">{fmt(platform.spend)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-slate-400">Leads Gen</span>
                  <span className="text-xs font-black">{platform.leads}</span>
                </div>
                <div className="flex justify-between pb-4 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-400">SQL Conversion</span>
                  <span className="text-xs font-black text-rose-500">{platform.sql}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Revenue</span>
                  <span className="text-sm font-black text-teal-600">{fmt(platform.revenue)}</span>
                </div>
              </div>

              <button
                onClick={() => openProof(platform.platform, selectedMonth)}
                className="mt-5 pt-4 border-t border-slate-50 w-full flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
              >
                <Shield className="w-3 h-3" />
                View Proof Layer
              </button>
            </div>
          ))}
        </section>

      </main>

      {/* ── INDIAMART GRANULAR LEADS MODAL (unchanged) ── */}
      <Modal isOpen={drilldownOpen} onClose={() => setDrilldownOpen(false)} title="IndiaMART Leads Analysis">
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Lead Detail</th>
                <th className="px-6 py-4">Inquiry Code</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">PO Value</th>
                <th className="px-6 py-4" />
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
                    <Badge color={lead.status === 'Non Potential' ? 'red' : lead.status === 'New' ? 'gray' : 'green'}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-black">{fmt(lead.po_value)}</td>
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

      {/* ── PROOF MODAL (new) ── */}
      <ProofModal
        isOpen={proofOpen}
        onClose={() => setProofOpen(false)}
        title={proofTitle}
        subtitle={proofSubtitle}
        leads={proofLeads}
        loading={proofLoading}
      />

      {/* ── LEAD LIFECYCLE DRAWER (unchanged) ── */}
      {leadDetails && (
        <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transform transition-transform animate-in slide-in-from-right duration-500 overflow-auto p-10">
          <div className="flex justify-between items-start mb-10">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-2xl shadow-indigo-100">
              <Users className="w-8 h-8" />
            </div>
            <button
              onClick={() => setLeadDetails(null)}
              className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500"
            >
              <X />
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-3xl font-black text-slate-800">{leadDetails.Client_Person_Name}</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                {leadDetails.Client_Company_Name}
              </p>
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
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                Lead Lifecycle Traceability
              </h4>
              <div className="relative pl-10 space-y-10 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-1 before:bg-slate-100 before:rounded-full">
                <div className="relative">
                  <div className="absolute -left-10 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white ring-8 ring-white">
                    <Activity className="w-4 h-4" />
                  </div>
                  <p className="font-black text-sm text-slate-800">Inquiry Generated</p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {new Date(leadDetails.Date).toLocaleDateString()}
                  </p>
                </div>
                <div className="relative">
                  <div className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center ring-8 ring-white ${leadDetails.actual_mql === '1' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <p className={`font-black text-sm ${leadDetails.actual_mql === '1' ? 'text-slate-800' : 'text-slate-300'}`}>
                    MQL Validation
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {leadDetails.SRF_MQL_Date
                      ? new Date(leadDetails.SRF_MQL_Date).toLocaleDateString()
                      : 'Pending'}
                  </p>
                </div>
                <div className="relative">
                  <div className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center ring-8 ring-white ${leadDetails.actual_sql === '1' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                    <Target className="w-4 h-4" />
                  </div>
                  <p className={`font-black text-sm ${leadDetails.actual_sql === '1' ? 'text-slate-800' : 'text-slate-300'}`}>
                    SQL Opportunity
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {leadDetails.SQL_Date
                      ? new Date(leadDetails.SQL_Date).toLocaleDateString()
                      : 'In Evaluation'}
                  </p>
                </div>
                <div className="relative">
                  <div className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center ring-8 ring-white ${leadDetails.actual_PO === '1' ? 'bg-teal-500 text-white shadow-xl shadow-teal-100' : 'bg-slate-100 text-slate-300'}`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className={`font-black text-sm ${leadDetails.actual_PO === '1' ? 'text-slate-800' : 'text-slate-300'}`}>
                    PO Finalization
                  </p>
                  {leadDetails.actual_PO === '1' && (
                    <p className="text-xl font-black text-teal-600 mt-1">{fmt(leadDetails.PO_Value)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-3xl text-white">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Latest Owner Remark
              </p>
              <p className="text-sm font-medium leading-relaxed italic opacity-90">
                "{leadDetails.Remarks}"
              </p>
              <div className="flex items-center mt-6 pt-6 border-t border-slate-700 select-none">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-black text-xs mr-3">
                  {leadDetails.Lead_Owner?.charAt(0)}
                </div>
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
