import React from 'react';
import { Box, FileCode, Home, Globe } from 'lucide-react';
import { AppSection } from '../types';
import { useLanguage, Language } from '../contexts/LanguageContext';

interface HeaderProps {
  currentSection: AppSection;
  onNavigate: (section: AppSection) => void;
}

const Header: React.FC<HeaderProps> = ({ currentSection, onNavigate }) => {
  const { t, language, setLanguage } = useLanguage();

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
          
          <div className="relative group">
            <button className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 transition-colors">
              <Globe size={20} />
              <span className="text-sm font-medium uppercase">{language}</span>
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
        </div>
      </div>
    </header>
  );
};

export default Header;