import React from 'react';
import { Smartphone, Brain, Heart, ArrowRight } from 'lucide-react';
import { AppSection } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface HeroProps {
  onNavigate: (section: AppSection) => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full bg-gradient-to-b from-slate-50 to-emerald-50/50 pt-20 pb-32 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            {t('hero_badge')}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight">
            {t('hero_title_1')} <br/>
            <span className="text-emerald-600">{t('hero_title_2')}</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t('hero_desc')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button 
              onClick={() => onNavigate(AppSection.MODEL_GEN)}
              className="px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {t('btn_design')} <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => onNavigate(AppSection.FIRMWARE_GEN)}
              className="px-8 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-xl font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
            >
              {t('btn_firmware')}
            </button>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="w-full max-w-6xl mx-auto px-6 -mt-20 mb-20">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-6">
              <Smartphone size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feat_1_title')}</h3>
            <p className="text-slate-600 leading-relaxed">
              {t('feat_1_desc')}
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <Brain size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feat_2_title')}</h3>
            <p className="text-slate-600 leading-relaxed">
              {t('feat_2_desc')}
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
              <Heart size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feat_3_title')}</h3>
            <p className="text-slate-600 leading-relaxed">
              {t('feat_3_desc')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;