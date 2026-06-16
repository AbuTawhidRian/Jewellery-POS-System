import React, { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, User, LogOut, Diamond, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'hy', name: 'Armenian', native: 'Հայերեն' }
];

const TopNav: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeLang, setActiveLang] = useState('en');
  
  const langMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    setIsLangMenuOpen(false);
    
    if (langCode === 'en') {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.${window.location.hostname}; path=/;`;
      window.location.reload();
      return;
    }

    setActiveLang(langCode);
    
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
        setTimeout(() => {
          const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
          if (select) {
            select.value = langCode;
            select.dispatchEvent(new Event('change'));
          }
        }, 1000);
      };
    } else {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        select.value = langCode;
        select.dispatchEvent(new Event('change'));
      }
    }
  };

  return (
    <header className="h-20 bg-white dark:bg-[#0B0F19] border-b border-slate-200 dark:border-[#334155]/50 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 transition-colors duration-300">
      <div id="google_translate_element" className="hidden"></div>
      
      <div className="flex-1 flex items-center">
        <div className="flex items-center gap-2 md:hidden">
          <div className="h-8 w-8 bg-gradient-to-br from-[#C28C46] to-[#8C622C] rounded-lg flex items-center justify-center">
            <Diamond className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-wider">
            RIAN<span className="text-[#C28C46]">JEWEL</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151B23] transition-colors"
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative" ref={langMenuRef}>
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-2 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#151B23]"
          >
            <Globe className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:block uppercase">{activeLang}</span>
            <ChevronDown className="w-4 h-4 hidden sm:block" />
          </button>

          {isLangMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl bg-white dark:bg-[#151B23] border border-slate-200 dark:border-[#334155]/50 py-2 backdrop-blur-xl overflow-hidden z-50 transition-colors">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={clsx(
                    "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between",
                    activeLang === lang.code 
                      ? "text-[#C28C46] bg-[#C28C46]/10 font-medium" 
                      : "text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#334155]/30 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <span>{lang.native}</span>
                  <span className="text-xs opacity-50 uppercase">{lang.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-[#334155]/50 hidden sm:block"></div>

        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-[#151B23] border border-transparent hover:border-slate-200 dark:hover:border-[#334155]/50 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C28C46] to-[#8C622C] flex items-center justify-center shadow-lg shadow-[#C28C46]/20 shrink-0">
              <span className="text-white font-bold text-sm">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block text-left max-w-[120px]">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none mb-1 truncate">{user?.name || 'Store Owner'}</p>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] capitalize leading-none truncate">{user?.role?.toLowerCase() || 'Admin'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-[#94A3B8] hidden sm:block ml-1 shrink-0" />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-xl shadow-2xl bg-white dark:bg-[#151B23] border border-slate-200 dark:border-[#334155]/50 py-2 backdrop-blur-xl z-50 transition-colors">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-[#334155]/50 sm:hidden">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Store Owner'}</p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{user?.email}</p>
              </div>
              <Link
                to="/dashboard/settings"
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#334155]/30 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Profile Settings
              </Link>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  logout();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default TopNav;
