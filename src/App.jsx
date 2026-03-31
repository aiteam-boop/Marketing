import React, { useState } from 'react';
import MarketingDashboard from '../CostPlanDashboard.jsx'
import GoogleAdsLeads from './GoogleAdsLeads.jsx'
import { Activity, Zap } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('marketing');

  return (
    <div className="App min-h-screen bg-slate-50/50">
      
      {/* Global Apps Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-2 py-2 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl flex items-center gap-1">
        <button 
          onClick={() => setActiveTab('marketing')}
          className={`flex items-center px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'marketing' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
        >
          <Activity className="w-4 h-4 mr-3" />
          Intelligence
        </button>
        <button 
          onClick={() => setActiveTab('google_ads')}
          className={`flex items-center px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'google_ads' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
        >
          <Zap className="w-4 h-4 mr-3" />
          Google Ads Live
        </button>
      </nav>

      {/* Dynamic View Rendering */}
      <div className="container mx-auto">
        {activeTab === 'marketing' ? <MarketingDashboard /> : (
          <div className="pt-8 px-6 lg:px-12">
            <GoogleAdsLeads />
          </div>
        )}
      </div>
      
    </div>
  )
}

export default App
