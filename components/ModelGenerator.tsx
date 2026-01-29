import React, { useState } from 'react';
import { Box, Download, Loader2, Sparkles, Printer, RefreshCw, Layers, Info } from 'lucide-react';
import { generateRobotPreview } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

const ModelGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrl = await generateRobotPreview(prompt);
      setGeneratedImage(imageUrl);
    } catch (err) {
      setError("Failed to generate model preview. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to generate a valid ASCII STL string for a simple box (M5Stack Case Placeholder)
  const generatePlaceholderSTL = (name: string) => {
    // M5Stack Core S3 is approx 54x54mm. Let's make a case 60x60x15mm
    const w = 60 / 2; // Width
    const h = 60 / 2; // Height
    const d = 15 / 2; // Depth

    // 8 vertices for a cube
    const v = [
      [-w, -h, -d], [w, -h, -d], [w, h, -d], [-w, h, -d], // Back face z=-d
      [-w, -h, d], [w, -h, d], [w, h, d], [-w, h, d]      // Front face z=d
    ];

    // 12 triangles (indices)
    const indices = [
      [0, 2, 1], [0, 3, 2], // Back
      [4, 5, 6], [4, 6, 7], // Front
      [0, 7, 3], [0, 4, 7], // Left
      [1, 2, 6], [1, 6, 5], // Right
      [3, 7, 6], [3, 6, 2], // Top
      [0, 1, 5], [0, 5, 4]  // Bottom
    ];

    let stl = `solid ${name.replace(/\s+/g, '_')}\n`;
    
    indices.forEach(face => {
      const v1 = v[face[0]];
      const v2 = v[face[1]];
      const v3 = v[face[2]];
      
      // Simple normal (not calculated for brevity, many viewers auto-calc)
      stl += `facet normal 0 0 0\n`;
      stl += `  outer loop\n`;
      stl += `    vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
      stl += `    vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
      stl += `    vertex ${v3[0]} ${v3[1]} ${v3[2]}\n`;
      stl += `  endloop\n`;
      stl += `endfacet\n`;
    });

    stl += `endsolid ${name.replace(/\s+/g, '_')}`;
    return stl;
  };

  const handleDownload = () => {
    // Generate real STL content
    const stlContent = generatePlaceholderSTL("Voxpeb_M5_Base");
    
    const element = document.createElement("a");
    const file = new Blob([stlContent], {type: 'model/stl'});
    element.href = URL.createObjectURL(file);
    element.download = "voxpeb_m5stack_base_template.stl";
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Box className="text-emerald-600" />
          {t('model_title')}
        </h2>
        <p className="text-slate-600 mt-2">
          {t('model_desc')}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Input Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-slate-700">
                {t('input_label')}
              </label>
              <div className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-md font-bold flex items-center gap-1">
                <Layers size={12} />
                54mm x 54mm Cavity (M5Stack)
              </div>
            </div>
            
            <textarea
              className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder={t('input_placeholder')}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>{t('opt_print')}</span>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {t('btn_generate')}
              </button>
            </div>
          </div>

          {/* Process Explanation */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-sm space-y-4">
            <h4 className="font-semibold text-slate-900">{t('pipeline_title')}</h4>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
              <div>
                <p className="font-medium text-slate-800">{t('step_1')}</p>
                <p className="text-slate-500 text-xs">{t('step_1_d')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
              <div>
                <p className="font-medium text-slate-800">{t('step_2')}</p>
                <p className="text-slate-500 text-xs">{t('step_2_d')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
              <div>
                <p className="font-medium text-slate-800">{t('step_3')}</p>
                <p className="text-slate-500 text-xs">{t('step_3_d')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center min-h-[400px] relative overflow-hidden group">
          {isGenerating ? (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-slate-500 animate-pulse">{t('loading_gen')}</p>
            </div>
          ) : generatedImage ? (
            <div className="relative w-full h-full p-4 flex flex-col items-center">
              <img 
                src={generatedImage} 
                alt="Generated Robot" 
                className="w-full h-full object-contain rounded-lg shadow-lg" 
              />
              <div className="absolute bottom-6 flex gap-4">
                <button 
                  onClick={handleGenerate}
                  className="bg-white text-slate-700 px-4 py-2 rounded-lg font-medium shadow-md hover:bg-slate-50 flex items-center gap-2"
                >
                  <RefreshCw size={16} /> {t('retry')}
                </button>
                <button 
                  onClick={handleDownload}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:bg-emerald-700 flex items-center gap-2 transform transition hover:-translate-y-1"
                >
                  <Download size={18} /> {t('download_stl')}
                </button>
              </div>
              <div className="absolute top-4 right-4 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                 <Info size={12} />
                 <span>{t('stl_note')}</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400">
              <Printer size={48} className="mx-auto mb-3 opacity-20" />
              <p>{t('preview_empty')}</p>
            </div>
          )}
          
          {error && (
             <div className="absolute inset-0 bg-white/90 flex items-center justify-center p-6 text-center">
               <div className="text-rose-500">
                 <p className="font-bold">Error</p>
                 <p className="text-sm">{error}</p>
                 <button 
                  onClick={() => setError(null)}
                  className="mt-4 text-sm underline"
                 >Dismiss</button>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelGenerator;