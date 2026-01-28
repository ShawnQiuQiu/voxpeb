import React, { useState } from 'react';
import { FileCode, Save, Cpu, Sliders, MessageCircle } from 'lucide-react';
import { FirmwareConfig } from '../types';
import { generateFirmwareSystemPrompt } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

const FirmwareBuilder: React.FC = () => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<FirmwareConfig>({
    name: 'Voxpeb-1',
    voice: 'neutral',
    personalityType: 'encouraging',
    focusArea: 'Daily Chat',
    correctionStyle: 'summary',
    languageRatio: 'english_only',
    level: 'adaptive',
  });

  const [isBuilding, setIsBuilding] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string>('');

  const handleChange = (key: keyof FirmwareConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleBuild = async () => {
    setIsBuilding(true);
    const result = await generateFirmwareSystemPrompt(config);
    setSystemPrompt(result);
    setIsBuilding(false);
  };

  const downloadFirmware = () => {
     // Simulation of .bin download
    const element = document.createElement("a");
    const file = new Blob([`FIRMWARE_HEADER_VOXPEB_V1\nCONFIG_JSON:${JSON.stringify(config)}\nSYSTEM_PROMPT:${systemPrompt}`], {type: 'application/octet-stream'});
    element.href = URL.createObjectURL(file);
    element.download = `voxpeb_${config.name.toLowerCase()}_firmware.bin`;
    document.body.appendChild(element); 
    element.click();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Cpu className="text-blue-600" />
          {t('firmware_title')}
        </h2>
        <p className="text-slate-600 mt-2">
          {t('firmware_desc')}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            
            {/* Basic Info */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{t('identity')}</label>
              <input 
                type="text" 
                value={config.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm mb-3"
                placeholder={t('robot_name')}
              />
              <select 
                value={config.voice}
                onChange={(e) => handleChange('voice', e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="neutral">{t('voice_neutral')}</option>
                <option value="energetic">{t('voice_energetic')}</option>
                <option value="deep">{t('voice_deep')}</option>
                <option value="soft">{t('voice_soft')}</option>
              </select>
            </div>

            <hr className="border-slate-100" />

            {/* Personality */}
            <div>
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">{t('personality')}</label>
               <div className="space-y-2">
                 {(['strict', 'encouraging', 'humorous', 'serious'] as const).map(p => (
                   <label key={p} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100">
                     <input 
                      type="radio" 
                      name="personality" 
                      checked={config.personalityType === p}
                      onChange={() => handleChange('personalityType', p)}
                      className="text-blue-600 focus:ring-blue-500"
                     />
                     <span className="capitalize text-sm font-medium text-slate-700">
                      {p === 'strict' ? t('pers_strict') : 
                       p === 'encouraging' ? t('pers_encouraging') :
                       p === 'humorous' ? t('pers_humorous') :
                       t('pers_serious')}
                     </span>
                   </label>
                 ))}
               </div>
            </div>

            {/* Pedagogy */}
            <div>
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">{t('pedagogy')}</label>
               <div className="space-y-3">
                 <div>
                   <span className="text-xs text-slate-500 mb-1 block">{t('corr_style')}</span>
                   <select 
                      value={config.correctionStyle}
                      onChange={(e) => handleChange('correctionStyle', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    >
                      <option value="immediate">{t('corr_imm')}</option>
                      <option value="summary">{t('corr_sum')}</option>
                      <option value="serious_only">{t('corr_ser')}</option>
                   </select>
                 </div>
                 <div>
                   <span className="text-xs text-slate-500 mb-1 block">{t('level')}</span>
                   <select 
                      value={config.level}
                      onChange={(e) => handleChange('level', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    >
                      <option value="A1">A1 (Beginner)</option>
                      <option value="B2">B2 (Intermediate)</option>
                      <option value="C1">C1 (Advanced)</option>
                      <option value="adaptive">{t('level_adap')}</option>
                   </select>
                 </div>
               </div>
            </div>
            
            <button 
              onClick={handleBuild}
              disabled={isBuilding}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {isBuilding ? t('btn_compiling') : t('btn_compile')}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2 flex flex-col h-full">
           <div className="bg-slate-900 rounded-t-2xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-2 text-slate-200">
               <FileCode size={18} />
               <span className="font-mono text-sm">{t('preview_file')}</span>
             </div>
             {systemPrompt && (
               <button 
                onClick={downloadFirmware}
                className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded flex items-center gap-1 transition-colors"
               >
                 <Save size={14} /> {t('download_bin')}
               </button>
             )}
           </div>
           <div className="bg-slate-800 flex-1 p-6 font-mono text-xs md:text-sm text-green-400 overflow-y-auto rounded-b-2xl min-h-[500px] border border-slate-700 shadow-inner">
             {isBuilding ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                 <Sliders className="animate-pulse" size={48} />
                 <p>Constructing System Prompt via Gemini...</p>
                 <div className="w-64 h-1 bg-slate-700 rounded overflow-hidden">
                    <div className="h-full bg-blue-500 animate-loading-bar"></div>
                 </div>
               </div>
             ) : systemPrompt ? (
               <pre className="whitespace-pre-wrap leading-relaxed">
                 {systemPrompt}
               </pre>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                 <MessageCircle size={48} opacity={0.2} />
                 <p>{t('brain_empty')}</p>
               </div>
             )}
           </div>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { width: 0% }
          50% { width: 70% }
          100% { width: 100% }
        }
        .animate-loading-bar {
          animation: loading-bar 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default FirmwareBuilder;