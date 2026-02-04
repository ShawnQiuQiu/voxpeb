import React, { useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Header from './components/Header';
import Hero from './components/Hero';
import ModelGenerator from './components/ModelGenerator';
import FirmwareBuilder from './components/FirmwareBuilder';
import { AppSection } from './types';
import { useLanguage } from './contexts/LanguageContext';

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);
  const { t } = useLanguage();

  const renderSection = () => {
    switch (currentSection) {
      case AppSection.HOME:
        return <Hero onNavigate={setCurrentSection} />;
      case AppSection.MODEL_GEN:
        return <ModelGenerator />;
      case AppSection.FIRMWARE_GEN:
        return <FirmwareBuilder />;
      default:
        return <Hero onNavigate={setCurrentSection} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header currentSection={currentSection} onNavigate={setCurrentSection} />
      
      <main className="flex-grow">
        {renderSection()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p className="mb-2">{t('footer_copy')}</p>
          <p>{t('footer_power')}</p>
        </div>
      </footer>
      
      <SpeedInsights />
    </div>
  );
};

export default App;