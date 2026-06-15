import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Diamond, Moon, Check, MessageCircle, TrendingUp, Lock, BarChart3 } from 'lucide-react';

export default function Landing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-amber-600 rounded-lg p-1.5 shadow-sm">
            <Diamond className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">GoldVault</span>
            <div className="text-[10px] uppercase tracking-widest text-amber-600 font-semibold leading-none">Secure · Grow · Track</div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer">
            <span className="text-slate-400">GB</span> English
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition-colors">
            <Moon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">
              Client Login
            </Link>
            <Link to="/register" className="hidden sm:inline-flex items-center justify-center px-5 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg shadow-md transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* Left Column - Copy */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/50 text-amber-800 text-sm font-medium mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Trusted by 500+ investors across the UAE
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Secure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700">Gold & Assets</span> Effortlessly
            </h1>

            <p className="text-lg text-slate-500 mb-8 leading-relaxed max-w-xl">
              GoldVault is your all-in-one digital platform for tracking gold investments, managing your vault, and growing your portfolio with real-time insights.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                <Lock className="w-4 h-4 text-amber-500" /> 7-day free trial
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                <Check className="w-4 h-4 text-amber-500" /> No credit card required
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                <Check className="w-4 h-4 text-amber-500" /> Cancel anytime
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link to="/register" className="inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl shadow-lg shadow-amber-500/20 transition-all">
                Start Free Trial →
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-bold text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-xl shadow-sm transition-all">
                <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
              </button>
            </div>

            {/* Bottom Features Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center transform transition hover:-translate-y-1">
                <div className="w-10 h-10 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-xs font-bold text-slate-800">Real-time Rates</h3>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center transform transition hover:-translate-y-1">
                <div className="w-10 h-10 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-3">
                  <Lock className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-xs font-bold text-slate-800">Bank-grade Security</h3>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center transform transition hover:-translate-y-1">
                <div className="w-10 h-10 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-xs font-bold text-slate-800">Smart Analytics</h3>
              </div>
            </div>
          </div>

          {/* Right Column - Pricing */}
          <div className="lg:pl-10">
            {/* Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-slate-200/50 p-1 rounded-full inline-flex items-center relative">
                <button 
                  onClick={() => setBillingCycle('monthly')}
                  className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'text-slate-900 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setBillingCycle('yearly')}
                  className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'text-slate-900 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Yearly
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Save DH 30</span>
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 relative">
              {/* Monthly Card */}
              <div className="bg-slate-50 border-2 border-amber-500 rounded-3xl p-6 relative shadow-xl shadow-amber-500/10 transform md:-translate-y-4 bg-gradient-to-b from-amber-50/50 to-white">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-4 rounded-full">
                  Most Popular
                </div>
                
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
                  <Diamond className="w-4 h-4 text-amber-600" />
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">Monthly</h3>
                <p className="text-xs text-slate-500 mb-6">Best for individual investors</p>
                
                <div className="mb-6 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">DH 29.99</span>
                  <span className="text-sm font-medium text-slate-500 ml-1">/month</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    'Unlimited gold & asset tracking',
                    'Real-time price alerts',
                    'Portfolio analytics & reports',
                    'Secure vault management',
                    'PDF statements & exports',
                    'Transaction history',
                    'Multi-currency support',
                    'Priority email support'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-amber-600" strokeWidth={3} />
                      </div>
                      <span className="text-xs font-medium text-slate-600 leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/register" className="block w-full text-center py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-amber-600 to-slate-800 hover:from-amber-700 hover:to-slate-900 shadow-md transition-all">
                  Start Free Trial →
                </Link>
              </div>

              {/* Yearly Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                  <Diamond className="w-4 h-4 text-slate-500" />
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">Yearly</h3>
                <p className="text-xs text-slate-500 mb-6">Best value for serious investors</p>
                
                <div className="mb-6 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">DH 329.99</span>
                  <span className="text-sm font-medium text-slate-500 ml-1">/year</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    'Everything in Monthly',
                    '24/7 priority phone support',
                    'Early access to new features',
                    'Save DH 29.89 vs monthly',
                    'Dedicated account manager'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-slate-500" strokeWidth={3} />
                      </div>
                      <span className="text-xs font-medium text-slate-600 leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/register" className="block w-full text-center py-3 px-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all mt-auto">
                  Start Free Trial →
                </Link>
              </div>
            </div>

            <div className="mt-8 text-center text-xs font-medium text-slate-400">
              <span className="flex items-center justify-center gap-2">
                <Check className="w-3 h-3" /> 7-day free trial 
                <span>•</span> 
                <Check className="w-3 h-3" /> Cancel anytime 
                <span>•</span> 
                <Check className="w-3 h-3" /> No hidden fees
              </span>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
