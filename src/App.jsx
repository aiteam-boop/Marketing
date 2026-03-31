import React, { useState, useEffect } from 'react';
import MarketingDashboard from '../CostPlanDashboard.jsx'
import GoogleAdsLeads from './GoogleAdsLeads.jsx'
import Login from './Login.jsx'
import { Activity, Zap, LogOut } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('marketing');
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  return (
    <div key={isLoggedIn ? 'dashboard' : 'login'} className="App min-h-screen bg-slate-50/50">
      
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          {/* Global Apps Navigation */}
          <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-2 py-2 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl flex items-center gap-1 animate-in slide-in-from-bottom-10 duration-700">
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
            <div className="w-[1px] h-6 bg-white/10 mx-2" />
            <button 
              onClick={handleLogout}
              className="flex items-center px-4 py-3 rounded-full text-xs font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>

          {/* Dynamic View Rendering */}
          <div className="container mx-auto animate-in fade-in duration-1000">
            {activeTab === 'marketing' ? <MarketingDashboard /> : (
              <div className="pt-8 px-6 lg:px-12">
                <GoogleAdsLeads />
              </div>
            )}
          </div>
        </>
      )}
      
    </div>
  )
}

export default App
