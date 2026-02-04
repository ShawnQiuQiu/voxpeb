import React from 'react';
import { Box, FileCode, Home, Globe, LogIn, User as UserIcon, LogOut } from 'lucide-react';
import { AppSection } from '../types';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  currentSection: AppSection;
  onNavigate: (section: AppSection) => void;
  onOpenAuth: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentSection, onNavigate, onOpenAuth }) => {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  const navItemClass = (section: AppSection) => 
    `flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${
      currentSection === section 
        ? 'bg-emerald-600 text-white shadow-md' 
        : 'text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onNavigate(AppSection.HOME)}
        >
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
            V
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">{t('app_title')}</span>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => onNavigate(AppSection.HOME)}
              className={navItemClass(AppSection.HOME)}
            >
              <Home size={18} />
              <span className="hidden sm:inline">{t('nav_home')}</span>
            </button>
            <button 
              onClick={() => onNavigate(AppSection.MODEL_GEN)}
              className={navItemClass(AppSection.MODEL_GEN)}
            >
              <Box size={18} />
              <span className="hidden sm:inline">{t('nav_shell')}</span>
            </button>
            <button 
              onClick={() => onNavigate(AppSection.FIRMWARE_GEN)}
              className={navItemClass(AppSection.FIRMWARE_GEN)}
            >
              <FileCode size={18} />
              <span className="hidden sm:inline">{t('nav_brain')}</span>
            </button>
          </nav>
          
          {/* Language Selector */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 transition-colors p-2 rounded-full hover:bg-slate-100">
              <Globe size={20} />
              <span className="text-sm font-medium uppercase hidden sm:inline">{language}</span>
            </button>
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-slate-100 hidden group-hover:block overflow-hidden p-1">
              {(['en', 'zh', 'ja', 'es', 'fr'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 ${language === lang ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-600'}`}
                >
                  {lang === 'en' ? 'English' : lang === 'zh' ? '中文' : lang === 'ja' ? '日本語' : lang === 'es' ? 'Español' : 'Français'}
                </button>
              ))}
            </div>
          </div>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="relative group">
                <button className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-full hover:bg-slate-200 transition-colors">
                  <UserIcon size={18} />
                  <span className="text-xs max-w-[80px] truncate hidden md:inline">{user.email?.split('@')[0]}</span>
                </button>
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-slate-100 hidden group-hover:block overflow-hidden p-1">
                  <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-100 truncate mb-1">
                    {user.email}
                  </div>
                  <button
                    onClick={signOut}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={onOpenAuth}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors shadow-md"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};

export default Header;