import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Fast local verification
    setTimeout(() => {
      if (username === 'admin' && password === '123') {
        onLogin();
      } else {
        setError('Unauthorized: Verification Failed');
        setIsSubmitting(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Soft Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-[440px] relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-10">
           <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 mx-auto mb-6">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
           </div>
           <h1 className="text-slate-900 text-3xl font-black tracking-tighter mb-2 italic">Crystal Marketing OS</h1>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Command & Intelligence Center</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="admin"
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] py-4 pl-16 pr-4 text-slate-800 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Key</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input 
                  type="password" 
                  placeholder="••••"
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] py-4 pl-16 pr-4 text-slate-800 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-100 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#18181b] hover:bg-black disabled:opacity-50 text-white font-bold text-xs uppercase tracking-[0.2em] py-5 rounded-[1.25rem] shadow-2xl shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Establish Connection
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

        </div>

        <div className="mt-8 text-center">
           <div className="flex items-center justify-center gap-2 text-slate-300 font-bold text-[9px] uppercase tracking-[0.3em]">
             <div className="w-8 h-[1px] bg-slate-200" />
             Secured by Crystal Team
             <div className="w-8 h-[1px] bg-slate-200" />
           </div>
        </div>

      </div>

    </div>
  );
}
