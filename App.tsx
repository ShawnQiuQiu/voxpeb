import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ModelGenerator from './components/ModelGenerator';
import FirmwareBuilder from './components/FirmwareBuilder';
import AuthModal from './components/AuthModal';
import { AppSection } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { SpeedInsights } from "@vercel/speed-insights/react";

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { t } = useLanguage();

  const renderSection = () => {
    switch (currentSection) {
      case AppSection.HOME:
        return <Hero onNavigate={setCurrentSection} />;
      case AppSection.MODEL_GEN:
        return <ModelGenerator onOpenAuth={() => setIsAuthOpen(true)} />;
      case AppSection.FIRMWARE_GEN:
        return <FirmwareBuilder onOpenAuth={() => setIsAuthOpen(true)} />;
      default:
        return <Hero onNavigate={setCurrentSection} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header 
        currentSection={currentSection} 
        onNavigate={setCurrentSection} 
        onOpenAuth={() => setIsAuthOpen(true)}
      />
      
      <main className="flex-grow">
        {renderSection()}
      </main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

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