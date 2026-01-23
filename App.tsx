
import React, { useState } from 'react';
import { 
  Sparkles, Settings, Grid, Image as ImageIcon, Download, 
  Plus, CheckCircle2, RefreshCw, Loader2, ChevronRight, 
  Info, MessageCircle, X, Smartphone, Palette, Wand2,
  Archive, Trash2, Dices, Layers
} from 'lucide-react';
import JSZip from 'jszip';
import { CharacterConfig, StickerPrompt, LinePack } from './types';
import { generateScenarios, generateStickerImage, generateBatchPrompts } from './services/geminiService';
import { createLineSpecialImage } from './utils/imageUtils';
import { getRandomPreset } from './animalPresets';
import { useStickerProcessor } from './hooks/useStickerProcessor';

export default function App() {
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<CharacterConfig>({
    species: '橘色小貓',
    features: '圓大眼睛，頭上有閃電斑紋',
    clothing: '藍色連帽衫',
    style: 'Q版比例 (Chibi)，粗輪廓線，平塗色塊 (Flat Illustration)'
  });
  
  const [prompts, setPrompts] = useState<StickerPrompt[]>([]);
  const [linePack, setLinePack] = useState<Partial<LinePack>>({});
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [showChatPreview, setShowChatPreview] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // 使用專業處理 Hook
  const { process: processImage } = useStickerProcessor();

  // Random Preset Handler
  const handleApplyRandomPreset = () => {
    const preset = getRandomPreset();
    setCharacter({
      species: preset.species,
      features: preset.features,
      clothing: preset.clothing,
      style: preset.style
    });
  };

  // 1. Scenario Generation (Dynamic)
  const handleAutoGenerateScenarios = async () => {
    setIsGeneratingPrompts(true);
    try {
      const result = await generateScenarios(character, 16);
      setPrompts(result);
      setStep(2);
    } catch (error) {
      alert("自動生成情境失敗，請檢查 API Key 設定。");
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  // 1b. Batch Prompt Generation (Static 40 sets)
  const handleGenerateFullSet = () => {
    const result = generateBatchPrompts(character);
    setPrompts(result);
    setStep(2);
  };

  // 2. Single Image Generation
  const generateOneImage = async (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'generating' } : p));
    try {
      const promptObj = prompts.find(p => p.id === id);
      if (!promptObj) return;

      const rawImage = await generateStickerImage(promptObj.visualDescription, character.referenceImage);
      
      // 使用專業 Hook 進行 LINE 規格化處理
      const processedResult = await processImage(rawImage);
      
      if (!processedResult) throw new Error("Processing failed");

      if (!character.referenceImage) {
        setCharacter(prev => ({ ...prev, referenceImage: processedResult.dataUrl }));
      }

      setPrompts(prev => prev.map(p => 
        p.id === id ? { 
          ...p, 
          generatedImage: rawImage, 
          processedImage: processedResult.dataUrl, 
          status: 'done' 
        } : p
      ));
    } catch (error) {
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'error' } : p));
    }
  };

  // 3. Batch Generation
  const handleGenerateAll = async () => {
    setIsGeneratingImages(true);
    const pendingOnes = prompts.filter(p => p.status !== 'done');
    for (const prompt of pendingOnes) {
      await generateOneImage(prompt.id);
    }
    setIsGeneratingImages(false);
  };

  // 4. LINE Assets Generation
  const generateLineAssets = async () => {
    const doneOnes = prompts.filter(p => p.status === 'done' && p.processedImage);
    if (doneOnes.length === 0) {
      alert("請先至少生成一張貼圖。");
      return;
    }
    
    const source = doneOnes[0].processedImage!;
    const mainImg = await createLineSpecialImage(source, 240, 240);
    const tabImg = await createLineSpecialImage(source, 96, 74);
    
    setLinePack({ main: mainImg, tab: tabImg });
    alert("已成功生成 LINE 封面圖與選單小圖！");
  };

  /**
   * 核心功能：打包匯出 符合 LINE 規範的 ZIP 檔
   */
  const handleExportZip = async () => {
    const doneOnes = prompts.filter(p => p.status === 'done' && p.processedImage);
    
    if (doneOnes.length === 0) {
      alert("目前沒有任何已完成的貼圖可以匯出。");
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();
      
      // 1. 建立貼圖資料夾 (選用，通常 LINE 要求放在 Root，但這裡我們確保檔名正確)
      // 根據 LINE 官方規定，匯出的 ZIP 內應直接包含檔案，不需額外子資料夾
      
      // 2. 將貼圖依照 01.png, 02.png ... 命名放入 ZIP
      doneOnes.forEach((p, idx) => {
        const fileName = `${String(idx + 1).padStart(2, '0')}.png`;
        const base64Data = p.processedImage!.split(',')[1];
        zip.file(fileName, base64Data, { base64: true });
      });

      // 3. 加入 Main (封面) 與 Tab (標籤)
      if (linePack.main) {
        zip.file('main.png', linePack.main.split(',')[1], { base64: true });
      }
      if (linePack.tab) {
        zip.file('tab.png', linePack.tab.split(',')[1], { base64: true });
      }

      // 4. 生成並下載
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Sticker_Pack.zip`;
      link.click();
      
      // 清除 URL 釋放記憶體
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    } catch (error) {
      console.error("ZIP Generation Error:", error);
      alert("壓縮過程中發生錯誤，請稍後再試。");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadImage = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${name}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="font-black text-xl tracking-tight text-gray-900 hidden sm:block">AI LINE 貼圖工廠</h1>
            <h1 className="font-black text-xl tracking-tight text-gray-900 sm:hidden">貼圖工廠</h1>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowChatPreview(!showChatPreview)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                showChatPreview ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden md:inline">對話模擬器</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 relative">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-3 rounded-2xl">
                      <Palette className="text-indigo-600 w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">角色一致性管理</h2>
                      <p className="text-sm text-gray-400 font-medium">在此定義角色的外型，系統將確保貼圖長相統一</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleApplyRandomPreset}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors shadow-sm"
                  >
                    <Dices className="w-4 h-4" />
                    隨機靈感
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">物種與角色名稱</label>
                    <input 
                      type="text" 
                      value={character.species}
                      onChange={(e) => setCharacter({...character, species: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 font-bold text-gray-700 placeholder:text-gray-300"
                      placeholder="例如：橘色小貓、害羞柴犬"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">藝術插畫風格</label>
                    <input 
                      type="text" 
                      value={character.style}
                      onChange={(e) => setCharacter({...character, style: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 font-bold text-gray-700 placeholder:text-gray-300"
                      placeholder="例如：粗線條、平塗色塊"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">核心長相細節 (眼睛、斑紋、臉型)</label>
                    <textarea 
                      value={character.features}
                      onChange={(e) => setCharacter({...character, features: e.target.value})}
                      rows={2}
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 font-bold text-gray-700 placeholder:text-gray-300 resize-none"
                      placeholder="細節描述越準確，AI 繪製的角色越一致"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">固定穿著與配件</label>
                    <input 
                      type="text" 
                      value={character.clothing}
                      onChange={(e) => setCharacter({...character, clothing: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 font-bold text-gray-700 placeholder:text-gray-300"
                      placeholder="角色始終穿戴的衣物，例如：紅色圍巾、藍色帽子"
                    />
                  </div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] text-white shadow-xl shadow-indigo-100 flex flex-col justify-between gap-6 group hover:-translate-y-1 transition-all duration-300">
                    <div>
                      <h3 className="text-xl font-black mb-1">AI 創意情境 (16張)</h3>
                      <p className="text-indigo-100/80 text-xs font-medium">由 Gemini 根據角色特質，靈活規劃 16 組專屬劇情。</p>
                    </div>
                    <button 
                      onClick={handleAutoGenerateScenarios}
                      disabled={isGeneratingPrompts}
                      className="whitespace-nowrap bg-white text-indigo-700 font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingPrompts ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                      動態規劃 16 張
                    </button>
                  </div>

                  <div className="p-8 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[2rem] text-white shadow-xl shadow-emerald-100 flex flex-col justify-between gap-6 group hover:-translate-y-1 transition-all duration-300">
                    <div>
                      <h3 className="text-xl font-black mb-1">全套常用規格 (40張)</h3>
                      <p className="text-emerald-100/80 text-xs font-medium">一次生成 40 組 LINE 最常用的全套標配情境貼圖。</p>
                    </div>
                    <button 
                      onClick={handleGenerateFullSet}
                      className="whitespace-nowrap bg-white text-emerald-700 font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Layers className="w-5 h-5" />
                      生成全套 40 張
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                <h3 className="font-black flex items-center gap-2 mb-6 text-gray-800">
                  <Smartphone className="w-5 h-5 text-indigo-600" /> LINE 技術規範自動處理
                </h3>
                <div className="space-y-5">
                  {[
                    { l: "偶數像素修正", d: "自動修正寬高為偶數 (LINE 規定)" },
                    { l: "透明背景 PNG", d: "自動去背並轉換為符合規格的 PNG" },
                    { l: "10px 邊界安全區", d: "自動在角色四周預留適當留白" },
                    { l: "批量 ZIP 匯出", d: "一鍵下載符合上架命名的壓縮包" }
                  ].map((t, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-800 leading-none mb-1">{t.l}</p>
                        <p className="text-xs text-gray-400 font-bold">{t.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                <h3 className="font-black mb-6 text-gray-800">一致性參考圖像</h3>
                {character.referenceImage ? (
                  <div className="relative group rounded-3xl overflow-hidden border border-gray-50 bg-gray-50 shadow-inner">
                    <img src={character.referenceImage} className="w-full aspect-square object-contain p-6" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                       <button 
                        onClick={() => setCharacter({...character, referenceImage: undefined})}
                        className="p-4 bg-white rounded-2xl text-red-500 shadow-2xl font-black flex items-center gap-2 hover:scale-105 transition-transform active:scale-95"
                      >
                        <Trash2 className="w-5 h-5" /> 更換參考
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 p-10 text-center">
                    <ImageIcon className="w-14 h-14 mb-4 opacity-10" />
                    <p className="text-xs font-black leading-relaxed opacity-60">生成第一張貼圖後<br/>此處將自動鎖定角色基準</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 ease-out">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-8">
              <div>
                <button onClick={() => setStep(1)} className="text-indigo-600 font-black hover:bg-indigo-50 px-5 py-2.5 rounded-2xl mb-4 -ml-5 transition-all flex items-center gap-2 text-sm">
                  ← 返回重新設定角色
                </button>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">貼圖生產清單 ({prompts.length})</h2>
                <p className="text-gray-400 font-bold text-lg">情境已就緒，準備好開始繪製了嗎？</p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  onClick={generateLineAssets}
                  className="px-8 py-5 bg-white border border-gray-200 text-gray-800 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95"
                >
                  <Grid className="w-5 h-5 text-indigo-600" />
                  封面小圖
                </button>
                <button 
                  onClick={handleGenerateAll}
                  disabled={isGeneratingImages}
                  className="flex-1 md:flex-none px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  {isGeneratingImages ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                  批量自動繪圖
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
              {prompts.map((p) => (
                <div key={p.id} className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-gray-100 group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                  <div className="relative aspect-square mb-6 bg-gray-50 rounded-3xl overflow-hidden border border-gray-50">
                    {p.status === 'done' && p.processedImage ? (
                      <div className="w-full h-full p-4 bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:28px_28px]">
                         <img src={p.processedImage} className="w-full h-full object-contain drop-shadow-2xl scale-95 group-hover:scale-100 transition-transform duration-500" alt={p.keyword} />
                         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                            <button onClick={() => downloadImage(p.processedImage!, p.keyword)} className="p-4 bg-white rounded-2xl text-indigo-600 shadow-2xl hover:scale-110 transition-transform active:scale-95">
                              <Download className="w-6 h-6" />
                            </button>
                            <button onClick={() => setChatMessages([...chatMessages, p.processedImage!])} className="p-4 bg-indigo-600 rounded-2xl text-white shadow-2xl hover:scale-110 transition-transform active:scale-95">
                              <MessageCircle className="w-6 h-6" />
                            </button>
                         </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center">
                        {p.status === 'generating' ? (
                          <div className="flex flex-col items-center">
                            <div className="relative w-16 h-16 mb-4">
                                <Loader2 className="w-16 h-16 text-indigo-600 animate-spin opacity-20" />
                                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-indigo-600 animate-pulse" />
                            </div>
                            <span className="text-[10px] text-indigo-600 font-black tracking-[0.2em] uppercase">繪製中...</span>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-14 h-14 text-gray-100 mb-3 opacity-30" />
                            <span className="text-[10px] text-gray-200 font-black uppercase tracking-[0.2em]">待繪製</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-gray-900">{p.keyword}</span>
                      {p.status === 'done' && (
                        <div className="bg-green-500 rounded-full p-1 shadow-lg shadow-green-200">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2 italic font-bold leading-relaxed opacity-80">
                      {p.visualDescription}
                    </p>
                  </div>

                  {p.status !== 'done' && p.status !== 'generating' && (
                    <button 
                      onClick={() => generateOneImage(p.id)}
                      className="w-full mt-6 py-4 bg-gray-50 hover:bg-indigo-600 hover:text-white text-gray-500 rounded-2xl text-xs font-black transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-200"
                    >
                      開始繪製
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Assets (Main/Tab) Display */}
            {linePack.main && (
              <section className="mt-20 animate-in slide-in-from-bottom-8 duration-1000">
                <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm overflow-hidden relative">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 relative z-10">
                    <div>
                      <h3 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-4">
                        <Grid className="w-8 h-8 text-indigo-600" /> LINE 店鋪必要規格素材
                      </h3>
                      <p className="text-gray-400 font-bold">系統已根據第一張成功生成的貼圖，自動裁切出封面與標籤圖</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-16 relative z-10">
                    <div className="space-y-5">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50 inline-block px-3 py-1 rounded-full">Main Image (240x240)</p>
                      <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 shadow-inner group relative overflow-hidden">
                        <img src={linePack.main} className="w-40 h-40 object-contain drop-shadow-2xl" alt="main" />
                        <button onClick={() => downloadImage(linePack.main!, 'main')} className="absolute -bottom-2 -right-2 p-5 bg-white shadow-2xl rounded-3xl text-indigo-600 hover:scale-110 transition-transform active:scale-95">
                          <Download className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50 inline-block px-3 py-1 rounded-full">Tab Icon (96x74)</p>
                      <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 shadow-inner group relative overflow-hidden">
                        <img src={linePack.tab} className="w-20 h-16 object-contain drop-shadow-lg" alt="tab" />
                        <button onClick={() => downloadImage(linePack.tab!, 'tab')} className="absolute -bottom-2 -right-2 p-5 bg-white shadow-2xl rounded-3xl text-indigo-600 hover:scale-110 transition-transform active:scale-95">
                          <Download className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <Sparkles className="absolute -left-12 -bottom-12 w-64 h-64 text-indigo-50/20 -rotate-12 pointer-events-none" />
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Floating Exporter Bar */}
      {step === 2 && prompts.some(p => p.status === 'done') && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-40 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-gray-900/90 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-2xl flex items-center justify-between border border-white/10 ring-1 ring-white/5">
            <div className="flex items-center gap-5 px-4">
              <div className="bg-indigo-500/30 p-3 rounded-2xl">
                <Archive className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <span className="text-white text-xl font-black block leading-none mb-1.5">
                  {prompts.filter(p => p.status === 'done').length} 張貼圖已就緒
                </span>
                <span className="text-indigo-400/80 text-[10px] font-black uppercase tracking-[0.2em]">已自動修正為符合 LINE 規範的偶數寬高</span>
              </div>
            </div>
            <button 
              onClick={handleExportZip}
              disabled={isExporting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 shadow-2xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 group disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6 group-hover:translate-y-1 transition-transform" />} 
              打包匯出 ZIP
            </button>
          </div>
        </div>
      )}

      {/* LINE Chat Simulator Drawer */}
      {showChatPreview && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[26rem] bg-white shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-700 ease-in-out">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
            <div className="flex items-center gap-4">
               <Smartphone className="w-7 h-7" />
               <h3 className="font-black text-xl">LINE 模擬預覽</h3>
            </div>
            <button onClick={() => setShowChatPreview(false)} className="hover:rotate-90 transition-transform duration-300">
              <X className="w-7 h-7" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-8 line-bg custom-scrollbar relative">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex-shrink-0 flex items-center justify-center">
                 <Palette className="w-6 h-6 text-white/50" />
              </div>
              <div className="bg-white px-5 py-4 rounded-3xl rounded-tl-none text-sm font-bold shadow-xl shadow-black/10 max-w-[85%] text-gray-800 leading-relaxed">
                這是模擬 LINE 聊天室的效果！<br/><br/>點擊貼圖下方的 <MessageCircle className="w-4 h-4 inline mb-0.5 mx-1" /> 按鈕，就可以直接在這裡看到貼圖的呈現比例與透明度效果。
              </div>
            </div>
            
            {chatMessages.map((msg, i) => (
              <div key={i} className="flex justify-end animate-in fade-in zoom-in slide-in-from-right-8 duration-700 ease-out">
                <img src={msg} className="w-48 h-48 object-contain drop-shadow-2xl hover:scale-110 transition-transform cursor-pointer" alt="chat-sticker" />
              </div>
            ))}
            
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-48 text-white/30 space-y-6">
                 <div className="relative">
                    <ImageIcon className="w-20 h-20 opacity-10" />
                    <MessageCircle className="absolute -top-4 -right-4 w-10 h-10 opacity-20" />
                 </div>
                 <p className="text-sm font-black tracking-[0.2em] text-center px-16 leading-relaxed">
                   點擊貼圖上的氣泡按鈕<br/>
                   <span className="text-[10px] opacity-40 font-bold">即可在此即時預覽效果</span>
                 </p>
              </div>
            )}
          </div>
          
          <div className="p-8 bg-gray-50 flex items-center justify-between border-t border-gray-100">
             <button onClick={() => setChatMessages([])} className="text-xs text-red-400 font-black hover:bg-red-50 px-5 py-3 rounded-xl transition-all">清空模擬紀錄</button>
             <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">Live Preview Mode</p>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="max-w-6xl mx-auto px-4 py-20 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 text-gray-300">
        <div className="flex items-center gap-3">
           <Sparkles className="w-5 h-5 opacity-20" />
           <p className="text-xs font-black tracking-[0.2em] uppercase">© 2025 AI LINE Sticker Factory. 為專業創作者打造。</p>
        </div>
        <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.2em]">
          <a href="#" className="hover:text-indigo-500 transition-colors">使用規範</a>
          <a href="#" className="hover:text-indigo-500 transition-colors">隱私權政策</a>
          <a href="#" className="hover:text-indigo-500 transition-colors">技術支援</a>
        </div>
      </footer>
    </div>
  );
}
