
import React, { useState } from 'react';
import { 
  Sparkles, Palette, Smartphone, Download, CheckCircle2, 
  Loader2, ImageIcon, Wand2, Layers, Dices, Info, ShieldCheck
} from 'lucide-react';
import JSZip from 'jszip';
import { CharacterConfig, StickerPrompt } from './types';
import { generateScenarioPrompts, generateStickerImage } from './services/geminiService';
import { useStickerProcessor } from './hooks/useStickerProcessor';
import { getRandomPreset } from './animalPresets';

export default function App() {
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<CharacterConfig>({
    species: '橘色小貓',
    features: '圓大眼睛，頭上有閃電斑紋',
    clothing: '藍色連帽衫',
    style: 'Q版比例 (Chibi)，粗輪廓線，平塗色塊'
  });
  
  const [prompts, setPrompts] = useState<StickerPrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { processSticker } = useStickerProcessor();

  // Phase 1: 建立基準角色 (為了確保一致性)
  const handleEstablishCharacter = async () => {
    setIsGenerating(true);
    try {
      const basePrompt = `Base character design of a ${character.style} ${character.species}, ${character.features}, wearing ${character.clothing}. Isolated on white background, full body, standing pose.`;
      const rawImage = await generateStickerImage(basePrompt);
      const processed = await processSticker(rawImage);
      if (processed) {
        setCharacter(prev => ({ ...prev, referenceImage: processed.dataUrl }));
      }
    } catch (error) {
      alert("建立角色基準失敗");
    } finally {
      setIsGenerating(false);
    }
  };

  // Phase 2: 啟動批量生產
  const handleStartProduction = (count: number) => {
    const fullPrompts = generateScenarioPrompts(character).slice(0, count);
    setPrompts(fullPrompts);
    setStep(2);
  };

  const generateOne = async (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'generating' } : p));
    try {
      const target = prompts.find(p => p.id === id);
      if (!target) return;

      const raw = await generateStickerImage(target.visualDescription, character.referenceImage);
      const processed = await processSticker(raw);
      
      if (processed) {
        setPrompts(prev => prev.map(p => 
          p.id === id ? { 
            ...p, 
            generatedImage: raw, 
            processedImage: processed.dataUrl, 
            status: 'done' 
          } : p
        ));
      }
    } catch (error) {
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'error' } : p));
    }
  };

  const handleExportZip = async () => {
    const doneOnes = prompts.filter(p => p.status === 'done' && p.processedImage);
    const zip = new JSZip();
    doneOnes.forEach((p, i) => {
      const b64 = p.processedImage!.split(',')[1];
      zip.file(`${String(i + 1).padStart(2, '0')}.png`, b64, { base64: true });
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "LINE_Sticker_Pack.zip";
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight">STICKER FACTORY</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            自動符合 LINE 規範
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* 左側：設定表單 */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-3xl p-8 border shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <Palette className="text-indigo-600" /> 第一階段：角色設定
                  </h2>
                  <button 
                    onClick={() => setCharacter({ ...character, ...getRandomPreset() })}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-1"
                  >
                    <Dices className="w-3.5 h-3.5" /> 隨機靈感
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">物種名稱</label>
                    <input 
                      type="text" value={character.species} 
                      onChange={e => setCharacter({...character, species: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">畫風風格</label>
                    <input 
                      type="text" value={character.style} 
                      onChange={e => setCharacter({...character, style: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">長相細節 (眼睛、花紋等)</label>
                    <textarea 
                      value={character.features} rows={2}
                      onChange={e => setCharacter({...character, features: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 ring-indigo-500/20 outline-none resize-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">固定服裝</label>
                    <input 
                      type="text" value={character.clothing} 
                      onChange={e => setCharacter({...character, clothing: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 ring-indigo-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    onClick={handleEstablishCharacter}
                    disabled={isGenerating}
                    className="flex-1 bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    建立角色基準 (確保一致性)
                  </button>
                </div>
              </div>

              {/* 批量按鈕區 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
                  <h3 className="font-black text-xl mb-2">啟動 10 張生產</h3>
                  <p className="text-indigo-100 text-sm mb-6">快速測試角色在不同情緒下的表現。</p>
                  <button 
                    onClick={() => handleStartProduction(10)}
                    disabled={!character.referenceImage}
                    className="w-full bg-white text-indigo-600 font-black py-4 rounded-xl shadow-lg disabled:opacity-50 hover:scale-[1.02] transition-transform"
                  >
                    開始批量生產
                  </button>
                </div>
                <div className="bg-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-200">
                  <h3 className="font-black text-xl mb-2">啟動 40 張全套</h3>
                  <p className="text-emerald-100 text-sm mb-6">一次生成 LINE 最常用的全套常用詞。</p>
                  <button 
                    onClick={() => handleStartProduction(40)}
                    disabled={!character.referenceImage}
                    className="w-full bg-white text-emerald-600 font-black py-4 rounded-xl shadow-lg disabled:opacity-50 hover:scale-[1.02] transition-transform"
                  >
                    生成全套 40 張
                  </button>
                </div>
              </div>
            </div>

            {/* 右側：預覽基準 */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 border shadow-sm">
                <h3 className="font-black text-slate-400 text-xs tracking-widest uppercase mb-6">基準參考 (Consistency Base)</h3>
                {character.referenceImage ? (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200">
                    <img src={character.referenceImage} className="w-full aspect-square object-contain drop-shadow-xl" />
                  </div>
                ) : (
                  <div className="aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-[10px] font-black text-center px-8 uppercase">請先建立基準角色<br/>系統將以此維持 40 張貼圖一致</p>
                  </div>
                )}
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-slate-400 font-bold">
                    <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    基準角色將作為後續所有貼圖的視覺藍本。
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <button onClick={() => setStep(1)} className="text-indigo-600 font-black text-sm mb-2 hover:underline">← 返回角色設定</button>
                <h2 className="text-4xl font-black tracking-tight">貼圖生產流水線 ({prompts.length})</h2>
                <p className="text-slate-400 font-bold">自動校正機制：370x320 偶數尺寸、10px 安全邊距</p>
              </div>
              <button 
                onClick={handleExportZip}
                className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black shadow-2xl flex items-center gap-3 hover:scale-105 transition-all"
              >
                <Download className="w-6 h-6" /> 下載全套 ZIP
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {prompts.map(p => (
                <div key={p.id} className="bg-white border rounded-[2rem] p-5 hover:shadow-xl transition-all group">
                  <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
                    {p.status === 'done' ? (
                      <div className="w-full h-full p-3 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                        <img src={p.processedImage} className="w-full h-full object-contain drop-shadow-lg" />
                        <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1 text-white">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      </div>
                    ) : p.status === 'generating' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50/30">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="text-[10px] font-black text-indigo-400 mt-2 uppercase">繪製中...</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => generateOne(p.id)}
                        className="w-full h-full flex items-center justify-center group-hover:bg-slate-100 transition-colors"
                      >
                        <Wand2 className="w-6 h-6 text-slate-200 group-hover:text-indigo-400" />
                      </button>
                    )}
                  </div>
                  <div className="text-center font-black text-lg">{p.keyword}</div>
                  <div className="text-[10px] text-slate-300 font-bold text-center mt-1 truncate px-2">{p.visualDescription}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
