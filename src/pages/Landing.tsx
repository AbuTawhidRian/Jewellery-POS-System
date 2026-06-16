import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Check, MessageCircle, Lock, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [activeLang, setActiveLang] = useState('en');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const handleLanguageChange = (langCode: string) => {
    setIsLangMenuOpen(false);
    
    if (langCode === 'en') {
      // Clear translation cookie and completely reset DOM for English
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.${window.location.hostname}; path=/;`;
      window.location.reload();
      return;
    }

    setActiveLang(langCode);
    
    // Inject translator ONLY when needed
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'en', includedLanguages: 'en,hi,ar,bn,hy', autoDisplay: false },
          'google_translate_element'
        );
        // Wait for widget to inject, then trigger translation
        setTimeout(() => {
          const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
          if (select) {
            select.value = langCode;
            select.dispatchEvent(new Event('change'));
          }
        }, 1000);
      };
    } else {
      // Trigger Google Translate immediately if already loaded
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        select.value = langCode;
        select.dispatchEvent(new Event('change'));
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900 transition-colors duration-300 ${isDarkMode ? 'dark bg-[#0B0F19]' : 'bg-[#F8FAFC]'} ${activeLang === 'en' ? 'lg:h-screen lg:overflow-hidden' : ''}`}>
      {/* Navigation */}
      <nav className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-20 shrink-0 flex items-center justify-between mt-4 sm:mt-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#B48346] to-[#8C622C] rounded-xl flex items-center justify-center shadow-lg shadow-[#B48346]/20">
            {/* Abstract X Logo */}
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M9 9l6 6" />
              <path d="M15 9l-6 6" />
            </svg>
          </div>
          <div className="flex flex-col justify-center notranslate">
            <span className="text-[22px] font-extrabold text-[#1E293B] dark:text-white tracking-tight leading-none mb-1">GoldVault</span>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#B48346] dark:text-[#C28C46] font-bold leading-none">Secure · Grow · Track</div>
          </div>
        </div>
        
        <div className="flex items-center gap-5 sm:gap-6">
          {/* Language Selector */}
          <div className="relative hidden md:block">
            {/* Hidden Google Translate Element */}
            <div id="google_translate_element" className="absolute opacity-0 pointer-events-none -z-10"></div>
            
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1.5 py-2 text-[15px] font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white transition-colors"
            >
              <span className="text-[12px] font-extrabold text-[#94A3B8] dark:text-[#64748B] tracking-wide">
                {activeLang === 'en' ? 'GB' : activeLang.toUpperCase()}
              </span> 
              <span>
                {activeLang === 'en' ? 'English' : 
                 activeLang === 'hi' ? 'हिंदी' :
                 activeLang === 'ar' ? 'العربية' :
                 activeLang === 'bn' ? 'বাংলা' : 'Հայերեն'}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#94A3B8] dark:text-[#64748B] transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Language Dropdown Menu */}
            {isLangMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-[#151B23] rounded-[16px] shadow-xl border border-[#E2E8F0] dark:border-[#1E293B] overflow-hidden z-50">
                <div className="py-1.5 flex flex-col">
                  {[
                    { code: 'en', displayCode: 'GB', name: 'English' },
                    { code: 'hi', displayCode: 'IN', name: 'हिंदी' },
                    { code: 'ar', displayCode: 'AE', name: 'العربية' },
                    { code: 'bn', displayCode: 'BD', name: 'বাংলা' },
                    { code: 'hy', displayCode: 'AM', name: 'Հայերեն' },
                  ].map((lang) => {
                    const isActive = activeLang === lang.code;
                    return (
                      <button 
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`flex items-center gap-3 px-4 py-2.5 transition-colors w-full text-left ${isActive ? 'bg-[#FFFBF0] dark:bg-[#1E293B]/50' : 'hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]'}`}
                      >
                        <span className={`text-[12px] font-extrabold tracking-wide w-5 ${isActive ? 'text-[#C28C46]' : 'text-[#94A3B8] dark:text-[#64748B]'}`}>
                          {lang.displayCode}
                        </span>
                        <span className={`text-[15px] font-medium ${isActive ? 'text-[#C28C46]' : 'text-[#475569] dark:text-[#E2E8F0]'}`}>
                          {lang.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" strokeWidth={2.5} /> : <Moon className="w-5 h-5" strokeWidth={2.5} />}
          </button>
          
          <div className="flex items-center gap-3 ml-2">
            <Link to="/login" className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-[15px] font-bold text-[#B48346] dark:text-[#C28C46] bg-transparent border border-[#E8D4B4] dark:border-[#C28C46]/40 rounded-[12px] hover:bg-[#FFFBF0] dark:hover:bg-[#C28C46]/10 transition-colors">
              Client Login
            </Link>
            <Link to="/register" className="inline-flex items-center justify-center px-6 py-2.5 text-[15px] font-bold text-white bg-gradient-to-r from-[#C28C46] via-[#334155] to-[#1E293B] dark:from-[#C28C46] dark:to-[#475569] dark:via-[#9A7135] rounded-[12px] shadow-md shadow-[#C28C46]/20 dark:shadow-[0_0_15px_rgba(194,140,70,0.4)] hover:opacity-90 transition-opacity">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-8 lg:pb-4 min-h-0">
        <div className="flex flex-col lg:flex-row items-start justify-between w-full gap-12 lg:gap-8">
          
          {/* Left Column - Text Content */}
          <div className="max-w-xl lg:max-w-2xl xl:max-w-3xl lg:pr-8 pt-2">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#FCF8F1] dark:bg-[#C28C46]/10 border border-[#F3E5C8] dark:border-[#C28C46]/20 text-[#9A7135] dark:text-[#C28C46] text-xs font-bold mb-3 shadow-sm">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
              </div>
              Trusted by 500+ investors across the UAE
            </div>

            <h1 className="text-[48px] lg:text-[56px] font-extrabold text-[#1E293B] dark:text-white tracking-normal leading-[1.1] mb-2">
              Secure Your <span className="text-[#B48346] dark:text-[#C28C46]">Gold &</span><br />
              <span className="text-[#1E293B] dark:text-[#94A3B8]">Assets</span><br />
              <span className="text-[#1E293B] dark:text-white">Effortlessly</span>
            </h1>

            <p className="text-[15px] text-[#64748B] dark:text-[#94A3B8] mb-5 leading-relaxed max-w-lg font-medium">
              GoldVault is your all-in-one digital platform for tracking gold investments, managing your vault, and growing your portfolio with real-time insights.
            </p>

            {/* Feature Badges */}
            <div className="flex flex-wrap gap-2.5 mb-8">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#64748B] dark:text-[#94A3B8] bg-white dark:bg-transparent px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm">
                <Lock className="w-3.5 h-3.5 text-[#B48346] dark:text-[#C28C46]" strokeWidth={3} /> 14-day free trial
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#64748B] dark:text-[#94A3B8] bg-white dark:bg-transparent px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm whitespace-nowrap">
                <svg className="w-3.5 h-3.5 text-[#B48346] dark:text-[#C28C46]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                No credit card
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#64748B] dark:text-[#94A3B8] bg-white dark:bg-transparent px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm whitespace-nowrap">
                <svg className="w-3.5 h-3.5 text-[#B48346] dark:text-[#C28C46]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                Cancel anytime
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[15px] font-bold text-white bg-gradient-to-r from-[#C28C46] via-[#334155] to-[#1E293B] dark:from-[#C28C46] dark:to-[#475569] dark:via-[#9A7135] rounded-xl shadow-lg shadow-[#C28C46]/20 dark:shadow-[0_0_30px_rgba(194,140,70,0.3)] hover:opacity-90 transition-all whitespace-nowrap">
                Start Free Trial 
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[15px] font-bold text-[#10B981] dark:text-[#10B981] bg-white dark:bg-transparent border-2 border-[#A7F3D0] dark:border-[#10B981]/30 hover:bg-[#ECFDF5] dark:hover:bg-[#10B981]/10 rounded-xl shadow-sm transition-all whitespace-nowrap">
                <MessageCircle className="w-5 h-5 fill-current" /> Chat on WhatsApp
              </button>
            </div>

            {/* Bottom Info Cards */}
            <div className="grid grid-cols-3 gap-3 max-w-lg">
              <div className="bg-white dark:bg-[#111827] p-3 rounded-[16px] border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm text-center">
                <div className="w-8 h-8 mx-auto bg-[#FFFBF0] dark:bg-transparent rounded-xl flex items-center justify-center mb-1.5">
                  <svg className="w-4 h-4 text-[#C28C46]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                </div>
                <h3 className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wide">Real-time Rates</h3>
              </div>
              <div className="bg-white dark:bg-[#111827] p-3 rounded-[16px] border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm text-center">
                <div className="w-8 h-8 mx-auto bg-[#FFFBF0] dark:bg-transparent rounded-xl flex items-center justify-center mb-1.5">
                  <Lock className="w-4 h-4 text-[#C28C46]" strokeWidth={2.5} />
                </div>
                <h3 className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wide">Bank-grade Security</h3>
              </div>
              <div className="bg-white dark:bg-[#111827] p-3 rounded-[16px] border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm text-center">
                <div className="w-8 h-8 mx-auto bg-[#FFFBF0] dark:bg-transparent rounded-xl flex items-center justify-center mb-1.5">
                  <svg className="w-4 h-4 text-[#C28C46]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                </div>
                <h3 className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wide">Smart Analytics</h3>
              </div>
            </div>
          </div>

          {/* Right Column - Pricing */}
          <div className="lg:pl-8 relative w-full lg:w-auto flex flex-col items-center">
            
            {/* Toggle */}
            <div className="mt-4 mb-8 sm:mb-10 relative z-10">
              <div className="bg-[#F1F5F9] dark:bg-[#1E293B] p-1.5 rounded-full inline-flex items-center border border-[#E2E8F0] dark:border-[#334155]/50 shadow-sm">
                <button 
                  onClick={() => setBillingCycle('monthly')}
                  className={`relative px-6 py-2 rounded-full text-[14px] font-bold transition-all whitespace-nowrap ${billingCycle === 'monthly' ? 'text-[#1E293B] dark:text-white bg-white dark:bg-[#334155] shadow-sm border border-[#C28C46] dark:border-transparent' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white border border-transparent'}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setBillingCycle('yearly')}
                  className={`relative px-4 py-2 rounded-full text-[14px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${billingCycle === 'yearly' ? 'text-[#1E293B] dark:text-white bg-white dark:bg-[#334155] shadow-sm border border-[#C28C46] dark:border-transparent' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white border border-transparent'}`}
                >
                  Yearly
                  <span className={`${billingCycle === 'yearly' ? 'bg-[#C28C46]' : 'bg-[#475569] dark:bg-[#C28C46]'} text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold whitespace-nowrap transition-colors`}>Save DH 30</span>
                </button>
              </div>
            </div>

            <div className="w-full max-w-[700px] grid sm:grid-cols-2 gap-4 items-stretch relative">
              
              {/* Monthly Card */}
              <div className={`flex flex-col h-full rounded-[24px] p-5 relative transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-[#FFFCF6] dark:bg-[#151B23] border-2 border-[#C28C46] shadow-2xl shadow-[#C28C46]/20 dark:shadow-[0_0_30px_rgba(194,140,70,0.15)] scale-105 z-10' : 'bg-white dark:bg-[#151B23] border-2 border-[#E2E8F0] dark:border-[#1E293B] shadow-sm scale-100 z-0'}`}>
                {billingCycle === 'monthly' && (
                  <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 bg-[#475569] dark:bg-[#64748B] text-white text-[10px] font-bold uppercase tracking-[0.1em] py-1 px-4 rounded-full whitespace-nowrap shadow-md">
                    Most Popular
                  </div>
                )}
                
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-colors ${billingCycle === 'monthly' ? 'bg-white dark:bg-[#C28C46]/20 border border-[#F3E5C8] dark:border-[#C28C46]/30 shadow-sm' : 'bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155]'}`}>
                  <svg className={`w-4 h-4 transition-colors ${billingCycle === 'monthly' ? 'text-[#C28C46]' : 'text-[#94A3B8] dark:text-[#94A3B8]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 9l6 6" /><path d="M15 9l-6 6" /></svg>
                </div>
                
                <h3 className="text-lg font-extrabold text-[#1E293B] dark:text-white mb-0.5">Monthly</h3>
                <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8] mb-3 font-medium leading-tight">Best for individual investors</p>
                
                <div className="mb-4 flex items-baseline">
                  <span className={`text-3xl font-black transition-colors notranslate ${billingCycle === 'monthly' ? 'text-[#C28C46]' : 'text-[#1E293B] dark:text-white'}`}>DH 29.99</span>
                  <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] ml-1">/month</span>
                </div>
                
                <ul className="space-y-2.5 mb-6">
                  {[
                    'Unlimited gold & tracking',
                    'Automated cloud backup',
                    'Portfolio analytics',
                    'Secure vault management',
                    'PDF statements & exports',
                    'Transaction history',
                    'Multi-currency support',
                    'Priority email support'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0">
                        <CheckCircle2 className={`w-3 h-3 transition-colors ${billingCycle === 'monthly' ? 'text-[#C28C46] fill-[#FFF3D9] dark:fill-[#C28C46]/20' : 'text-[#CBD5E1] dark:text-[#334155] fill-[#F1F5F9] dark:fill-[#1E293B]'}`} strokeWidth={2.5} />
                      </div>
                      <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/register" className={`mt-auto flex items-center justify-center gap-1 w-full py-2.5 px-3 rounded-xl font-bold transition-all text-[13px] ${billingCycle === 'monthly' ? 'text-white bg-gradient-to-r from-[#C28C46] via-[#334155] to-[#1E293B] dark:from-[#C28C46] dark:to-[#475569] dark:via-[#9A7135] shadow-lg shadow-[#C28C46]/20 hover:opacity-90' : 'text-[#334155] dark:text-white bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155]'}`}>
                  Start Free Trial 
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>

              {/* Yearly Card */}
              <div className={`flex flex-col h-full rounded-[20px] p-5 relative transition-all duration-300 ${billingCycle === 'yearly' ? 'bg-[#FFFCF6] dark:bg-[#151B23] border-2 border-[#C28C46] shadow-2xl shadow-[#C28C46]/20 dark:shadow-[0_0_30px_rgba(194,140,70,0.15)] scale-105 z-10' : 'bg-white dark:bg-[#151B23] border-2 border-[#E2E8F0] dark:border-[#1E293B] shadow-sm scale-100 z-0'}`}>
                {billingCycle === 'yearly' && (
                  <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 bg-[#C28C46] text-white text-[9px] font-bold uppercase tracking-[0.1em] py-0.5 px-3 rounded-full whitespace-nowrap shadow-md">
                    Best Value
                  </div>
                )}

                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 transition-colors ${billingCycle === 'yearly' ? 'bg-white dark:bg-[#C28C46]/20 border border-[#F3E5C8] dark:border-[#C28C46]/30 shadow-sm' : 'bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155]'}`}>
                  <svg className={`w-3.5 h-3.5 transition-colors ${billingCycle === 'yearly' ? 'text-[#C28C46]' : 'text-[#94A3B8] dark:text-[#94A3B8]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 9l6 6" /><path d="M15 9l-6 6" /></svg>
                </div>
                
                <h3 className="text-[15px] font-extrabold text-[#1E293B] dark:text-white mb-0">Yearly</h3>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mb-2 font-medium leading-tight">Best value for serious investors</p>
                
                <div className="mb-3 flex items-baseline">
                  <span className={`text-2xl font-black transition-colors notranslate ${billingCycle === 'yearly' ? 'text-[#C28C46]' : 'text-[#1E293B] dark:text-white'}`}>DH 329.99</span>
                  <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] ml-1">/year</span>
                </div>
                
                <ul className="space-y-1.5 mb-4">
                  {[
                    'Everything in Monthly',
                    '24/7 priority phone support',
                    'Early access to new features',
                    'Save DH 29.89 vs monthly',
                    'Dedicated account manager'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0">
                        <CheckCircle2 className={`w-3.5 h-3.5 transition-colors ${billingCycle === 'yearly' ? 'text-[#C28C46] fill-[#FFF3D9] dark:fill-[#C28C46]/20' : 'text-[#CBD5E1] dark:text-[#334155] fill-[#F1F5F9] dark:fill-[#1E293B]'}`} strokeWidth={2.5} />
                      </div>
                      <span className="text-[12px] font-bold text-[#64748B] dark:text-[#94A3B8] leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/register" className={`mt-auto flex items-center justify-center gap-1.5 w-full py-3.5 px-3 rounded-xl font-bold transition-all text-[14px] ${billingCycle === 'yearly' ? 'text-white bg-gradient-to-r from-[#C28C46] via-[#334155] to-[#1E293B] dark:from-[#C28C46] dark:to-[#475569] dark:via-[#9A7135] shadow-lg shadow-[#C28C46]/20 hover:opacity-90' : 'text-[#334155] dark:text-white bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155]'}`}>
                  Start Free Trial
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
            </div>

            <div className="mt-4 text-center text-[11px] font-bold text-[#94A3B8] dark:text-slate-500">
              <span className="flex items-center justify-center gap-2">
                <Check className="w-3 h-3 text-[#94A3B8] dark:text-slate-500" strokeWidth={3} /> 14-day free trial 
                <span className="text-[#CBD5E1] dark:text-slate-600">•</span> 
                <Check className="w-3 h-3 text-[#94A3B8] dark:text-slate-500" strokeWidth={3} /> Cancel anytime 
                <span className="text-[#CBD5E1] dark:text-slate-600">•</span> 
                <Check className="w-3 h-3 text-[#94A3B8] dark:text-slate-500" strokeWidth={3} /> No hidden fees
              </span>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
