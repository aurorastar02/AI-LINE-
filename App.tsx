
import React, { useState } from 'react';
import { 
  Sparkles, Palette, Download, CheckCircle2, 
  Loader2, ImageIcon, Wand2, Layers, Dices, Info, ShieldCheck,
  ChevronRight, Box, LayoutGrid, CheckSquare, ListOrdered
} from 'lucide-react';
import JSZip from 'jszip';
import { CharacterConfig, StickerPrompt } from './types';
import { buildPrompt, generateStickerImage } from './services/geminiService';
import { useStickerProcessor } from './hooks/useStickerProcessor';
import { getRandomPreset } from './animalPresets';
import { stickerScenarios } from './utils/scenarios';

export default function App() {
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<CharacterConfig>({
    species: '橘色小貓',
    features: '圓大眼睛，頭上有閃電斑紋',
    clothing: '藍色連帽衫',
    style: 'Q版比例 (Chibi)，粗輪廓線，平塗色塊'
  });
  
  const [stickerCount, setStickerCount] = useState(8);
  const [prompts, setPrompts] = useState<StickerPrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const { processSticker } = useStickerProcessor();

  // Phase 1: 建立基準角色
  const handleEstablishCharacter = async () => {
    setIsGenerating(true);
    try {
      // 基準角色使用中性站姿，綠幕背景
      const basePrompt = buildPrompt(character, "standing pose with a neutral expression, character sheet style");
      const rawImage = await generateStickerImage(basePrompt);
      const processed = await processSticker(rawImage);
      if (processed) {
        setCharacter(prev => ({ ...prev, referenceImage: processed.dataUrl }));
      }
    } catch (error) {
      alert("建立角色基準失敗，請稍後再試");
    } finally {
      setIsGenerating(false);
    }
  };

  // 進入生產介面並初始化劇本
  const prepareProduction = () => {
    const initialPrompts: StickerPrompt[] = stickerScenarios.slice(0, stickerCount).map((action, index) => ({
      id: `stk-${Date.now()}-${index}`,
      keyword: action.split(' ')[0],
      visualDescription: buildPrompt(character, action),
      status: 'pending'
    }));
    setPrompts(initialPrompts);
    setStep(2);
  };

  // 單張生成邏輯 (封裝 API 呼叫、去背與規格校正)
  const generateOne = async (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'generating' } : p));
    try {
      const target = prompts.find(p => p.id === id);
      if (!target) return null;

      // 1. 呼叫 Gemini API 生成帶有綠幕背景的圖片
      const raw = await generateStickerImage(target.visualDescription, character.referenceImage);
      
      // 2. 智慧校正：綠幕去背 + LINE 規格化 (370x320, 偶數, 10px 邊距)
      const processed = await processSticker(raw);
      
      if (processed) {
        const updatedPrompt = { 
          ...target, 
          generatedImage: raw, 
          processedImage: processed.dataUrl, 
          status: 'done' as const 
        };
        setPrompts(prev => prev.map(p => p.id === id ? updatedPrompt : p));
        return updatedPrompt;
      }
    } catch (error) {
      console.error("生成單張失敗:", error);
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'error' } : p));
    }
    return null;
  };

  // 批量自動化生成邏輯 (異步循環處理)
  const handleBatchGenerate = async () => {
    setIsBatchGenerating(true);
    setGeneratingIndex(0);
    
    const pendingOnes = prompts.filter(p => p.status !== 'done');
    let count = 0;

    // 使用 for...of 確保依序處理並即時更新畫面
    for (const p of pendingOnes) {
      count++;
      setGeneratingIndex(count);
      await generateOne(p.id);
      // 微小延遲確保瀏覽器有時間渲染 UI
      await new Promise(r => setTimeout(r, 100));
    }
    
    setIsBatchGenerating(false);
    setGeneratingIndex(0);
  };

  const handleExportZip = async () => {
    const doneOnes = prompts.filter(p => p.status === 'done' && p.processedImage);
    if (doneOnes.length === 0) return alert("尚無已完成的貼圖可供下載");
    
    const zip = new JSZip();
    doneOnes.forEach((p, i) => {
      const b64 = p.processedImage!.split(',')[1];
      zip.file(`${String(i + 1).padStart(2, '0')}.png`, b64, { base64: true });
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `LINE_Sticker_Pack_${doneOnes.length}.zip`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <nav className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight">AI 貼圖工廠 PRO</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            Chroma Key 綠幕處理模式
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
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
                    <Dices className="w-3.5 h-3.5" /> 隨機預設
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">角色物種</label>
                    <input 
                      type="text" value={character.species} 
                      onChange={e => setCharacter({...character, species: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">藝術風格</label>
                    <input 
                      type="text" value={character.style} 
                      onChange={e => setCharacter({...character, style: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">長相特徵</label>
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

                <div className="mt-10">
                  <button 
                    onClick={handleEstablishCharacter}
                    disabled={isGenerating}
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-slate-200"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    生成角色基準 (必備步驟)
                  </button>
                </div>
              </div>

              <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <LayoutGrid size={120} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-black text-3xl mb-2 flex items-center gap-3">
                    <Box className="text-indigo-200" /> 批量生產配置
                  </h3>
                  <p className="text-indigo-100 text-sm mb-8 max-w-md">選擇生成數量，系統將自動應用綠幕背景技術以確保細節與一致性。</p>
                  
                  <div className="flex flex-col gap-4 mb-8">
                    <label className="text-[10px] font-black uppercase text-indigo-200 tracking-widest">選擇生成張數</label>
                    <div className="flex flex-wrap gap-3">
                      {[8, 16, 24, 32, 40].map(count => (
                        <button 
                          key={count}
                          onClick={() => setStickerCount(count)}
                          className={`flex-1 min-w-[60px] py-4 rounded-2xl font-black transition-all ${stickerCount === count ? 'bg-white text-indigo-600 scale-105 shadow-lg ring-4 ring-white/20' : 'bg-indigo-500 text-indigo-100 hover:bg-indigo-400'}`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={prepareProduction}
                    disabled={!character.referenceImage}
                    className="w-full bg-white text-indigo-600 font-black py-5 rounded-2xl disabled:opacity-50 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 group shadow-xl"
                  >
                    進入生產流水線 <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 border shadow-sm sticky top-24">
                <h3 className="font-black text-slate-400 text-[10px] tracking-widest uppercase mb-6">基準角色預覽</h3>
                {character.referenceImage ? (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200 aspect-square flex items-center justify-center overflow-hidden">
                    <img src={character.referenceImage} className="max-w-full max-h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform" />
                  </div>
                ) : (
                  <div className="aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-[10px] font-black text-center px-8 uppercase">尚未建立基準</p>
                  </div>
                )}
                <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="flex gap-2 text-[11px] text-indigo-600 font-bold leading-relaxed">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <div>系統將強制產出綠幕背景 (RGB 0, 255, 0)，以利後續自動精準去背。</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
              <div>
                <button onClick={() => setStep(1)} className="text-indigo-600 font-black text-sm mb-2 flex items-center gap-1 hover:underline">
                  <ChevronRight className="w-4 h-4 rotate-180" /> 返回設定
                </button>
                <h2 className="text-4xl font-black tracking-tight flex items-center gap-4">
                  生產流水線 
                  <span className="text-lg bg-slate-200 px-3 py-1 rounded-full text-slate-600">{prompts.length} 張</span>
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-indigo-500 font-black text-sm">
                    <ShieldCheck className="w-4 h-4" /> 綠幕去背引擎已啟動
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleBatchGenerate}
                  disabled={isBatchGenerating}
                  className="bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-3 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isBatchGenerating ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  啟動批量生成
                </button>
                <button 
                  onClick={handleExportZip}
                  className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black shadow-xl flex items-center gap-3 hover:bg-slate-800"
                >
                  <Download className="w-5 h-5" /> 打包下載 ZIP
                </button>
              </div>
            </div>

            {/* 進度顯示條 */}
            {isBatchGenerating && (
              <div className="mb-10 bg-white border-2 border-indigo-100 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-50 animate-in zoom-in duration-300">
                <div className="flex justify-between items-end mb-4">
                  <div className="font-black text-indigo-600 flex items-center gap-3 text-lg">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    正在處理：{prompts[generatingIndex - 1]?.keyword || '準備中'}
                  </div>
                  <div className="text-sm font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    第 {generatingIndex} / {prompts.length} 張
                  </div>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${(generatingIndex / prompts.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {prompts.map((p, idx) => (
                <div key={p.id} className={`bg-white border rounded-[2rem] p-5 transition-all group relative ${p.status === 'done' ? 'hover:shadow-2xl' : ''}`}>
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs z-10 shadow-lg">
                    {idx + 1}
                  </div>
                  <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden relative border border-slate-100">
                    {p.status === 'done' ? (
                      <div className="w-full h-full p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-200/20">
                        <img src={p.processedImage} className="w-full h-full object-contain drop-shadow-xl" alt={p.keyword} />
                        <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1 text-white shadow-lg animate-in zoom-in duration-300">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    ) : p.status === 'generating' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50/50">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="text-[10px] font-black text-indigo-400 mt-2 uppercase tracking-tighter">AI 繪圖 & 校正</span>
                      </div>
                    ) : p.status === 'error' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                        <Info className="w-6 h-6 text-red-400 mb-2" />
                        <span className="text-[10px] font-black text-red-400">生成錯誤</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => generateOne(p.id)}
                        disabled={isBatchGenerating}
                        className="w-full h-full flex flex-col items-center justify-center group-hover:bg-slate-100 transition-colors disabled:opacity-30"
                      >
                        <Wand2 className="w-6 h-6 text-slate-200 group-hover:text-indigo-400 mb-2" />
                        <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-300">點擊生成</span>
                      </button>
                    )}
                  </div>
                  <div className="px-1 text-center">
                    <div className="font-black text-base text-slate-800 line-clamp-1">{p.keyword}</div>
                    <div className="text-[9px] text-slate-400 font-bold leading-tight mt-1 line-clamp-1 opacity-50">{stickerScenarios[idx]}</div>
                  </div>
                </div>
              ))}
            </div>

            {prompts.every(p => p.status === 'done') && prompts.length > 0 && (
              <div className="mt-16 bg-emerald-50 border border-emerald-100 p-10 rounded-[3rem] text-center max-w-2xl mx-auto shadow-xl shadow-emerald-50 animate-in slide-in-from-top-4 duration-500">
                <div className="inline-flex bg-emerald-500 text-white p-4 rounded-3xl mb-6 shadow-xl shadow-emerald-200">
                  <CheckSquare size={40} />
                </div>
                <h3 className="text-2xl font-black text-emerald-900 mb-2">全套貼圖已完成！</h3>
                <p className="text-emerald-700 font-bold mb-8">所有圖片均已符合 LINE 370x320 偶數尺寸規範，且已完成綠幕精準去背。</p>
                <button 
                  onClick={handleExportZip}
                  className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black shadow-xl hover:bg-emerald-700 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                >
                  <Download className="w-6 h-6" /> 下載 LINE 貼圖包 (ZIP)
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
