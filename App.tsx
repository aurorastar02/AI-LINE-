
import React, { useState, useCallback } from 'react';
import { 
  Sparkles, Settings, Grid, Image as ImageIcon, Download, 
  Plus, CheckCircle2, RefreshCw, Loader2, ChevronRight, 
  Info, MessageCircle, X, Smartphone, Palette, Wand2,
  Archive, Trash2, Eye
} from 'lucide-react';
import JSZip from 'jszip';
import { CharacterConfig, StickerPrompt, LinePack } from './types';
import { generateScenarios, generateStickerImage } from './services/geminiService';
import { processStickerImage, createLineSpecialImage } from './utils/imageUtils';

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

  // 1. Scenario Generation (Batch Scripting)
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

  // 2. Single Image Generation with Consistency Support
  const generateOneImage = async (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'generating' } : p));
    try {
      const promptObj = prompts.find(p => p.id === id);
      if (!promptObj) return;

      const rawImage = await generateStickerImage(promptObj.visualDescription, character.referenceImage);
      const processedImage = await processStickerImage(rawImage);
      
      // Auto-set the first successful image as reference for consistency
      if (!character.referenceImage) {
        setCharacter(prev => ({ ...prev, referenceImage: processedImage }));
      }

      setPrompts(prev => prev.map(p => 
        p.id === id ? { 
          ...p, 
          generatedImage: rawImage, 
          processedImage: processedImage, 
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
    for (const prompt of prompts) {
      if (prompt.status !== 'done') {
        await generateOneImage(prompt.id);
      }
    }
    setIsGeneratingImages(false);
  };

  // 4. LINE Assets (Main/Tab)
  const generateLineAssets = async () => {
    const doneOnes = prompts.filter(p => p.status === 'done' && p.processedImage);
    if (doneOnes.length === 0) {
      alert("請先至少生成一張貼圖作為素材。");
      return;
    }
    
    // Use the first completed sticker as the source for Main/Tab
    const source = doneOnes[0].processedImage!;
    const mainImg = await createLineSpecialImage(source, 240, 240);
    const tabImg = await createLineSpecialImage(source, 96, 74);
    
    setLinePack({ main: mainImg, tab: tabImg });
  };

  // 5. ZIP Export
  const handleExportZip = async () => {
    const zip = new JSZip();
    const doneOnes = prompts.filter(p => p.status === 'done' && p.processedImage);
    
    if (doneOnes.length === 0) return;

    // Stickers 01-NN
    doneOnes.forEach((p, idx) => {
      const base64Data = p.processedImage!.split(',')[1];
      zip.file(`${String(idx + 1).padStart(2, '0')}.png`, base64Data, { base64: true });
    });

    // Main/Tab if exist
    if (linePack.main) {
      zip.file('main.png', linePack.main.split(',')[1], { base64: true });
    }
    if (linePack.tab) {
      zip.file('tab.png', linePack.tab.split(',')[1], { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `sticker_pack_${character.species}.zip`;
    link.click();
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
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="font-black text-xl tracking-tight text-gray-900 hidden sm:block">AI Sticker Factory</h1>
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
              <span className="hidden md:inline">聊天室模擬</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-indigo-50 p-2.5 rounded-2xl">
                    <Palette className="text-indigo-600 w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">角色一致性管理</h2>
                    <p className="text-sm text-gray-500 font-medium">定義固定外型以確保整套貼圖不會「走鐘」</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400">物種與角色名</label>
                    <input 
                      type="text" 
                      value={character.species}
                      onChange={(e) => setCharacter({...character, species: e.target.value})}
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400">插畫藝術風格</label>
                    <input 
                      type="text" 
                      value={character.style}
                      onChange={(e) => setCharacter({...character, style: e.target.value})}
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 font-medium"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400">核心長相細節 (眼睛、斑紋等)</label>
                    <textarea 
                      value={character.features}
                      onChange={(e) => setCharacter({...character, features: e.target.value})}
                      rows={2}
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 font-medium resize-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400">固定穿著配飾</label>
                    <input 
                      type="text" 
                      value={character.clothing}
                      onChange={(e) => setCharacter({...character, clothing: e.target.value})}
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 font-medium"
                    />
                  </div>
                </div>

                <div className="mt-10 p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl text-white shadow-xl shadow-indigo-200 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                  <div className="relative z-10 text-center md:text-left">
                    <h3 className="text-xl font-black mb-1">一鍵生成 16 組貼圖劇本</h3>
                    <p className="text-indigo-100/80 text-sm font-medium">Gemini 將自動規劃最適合 LINE 聊天的情境描述</p>
                  </div>
                  <button 
                    onClick={handleAutoGenerateScenarios}
                    disabled={isGeneratingPrompts}
                    className="relative z-10 whitespace-nowrap bg-white text-indigo-600 font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                  >
                    {isGeneratingPrompts ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    立刻開始批量製作
                  </button>
                  <Sparkles className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100">
                <h3 className="font-black flex items-center gap-2 mb-5 text-gray-800">
                  <Smartphone className="w-5 h-5 text-indigo-600" /> LINE 規格自動檢核
                </h3>
                <div className="space-y-4">
                  {[
                    { l: "偶數像素修正", d: "自動修正為 370x320 偶數寬高" },
                    { l: "透明背景 PNG", d: "移除背景並渲染為標準 PNG" },
                    { l: "10px 安全區域", d: "自動為角色四周預留邊界" },
                    { l: "打包匯出", d: "生成符合命名規範的 ZIP 壓縮檔" }
                  ].map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 leading-none mb-1">{t.l}</p>
                        <p className="text-xs text-gray-400 font-medium">{t.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100">
                <h3 className="font-black mb-5 text-gray-800">一致性參考圖</h3>
                {character.referenceImage ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-inner">
                    <img src={character.referenceImage} className="w-full aspect-square object-contain p-4" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <button 
                        onClick={() => setCharacter({...character, referenceImage: undefined})}
                        className="p-3 bg-white rounded-2xl text-red-500 shadow-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                      >
                        <Trash2 className="w-4 h-4" /> 更換
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-50 rounded-[1.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-xs font-bold leading-relaxed">生成第一張貼圖後<br/>此處將鎖定角色特徵</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-6">
              <div>
                <button onClick={() => setStep(1)} className="text-indigo-600 font-black hover:bg-indigo-50 px-4 py-2 rounded-xl mb-3 -ml-4 transition-all flex items-center gap-2">
                  ← 調整角色設定
                </button>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">貼圖生產清單</h2>
                <p className="text-gray-400 font-medium">已根據您的角色特徵生成 16 組劇本，請點擊「批量生成」</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={generateLineAssets}
                  className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Grid className="w-5 h-5" />
                  生成 Main/Tab
                </button>
                <button 
                  onClick={handleGenerateAll}
                  disabled={isGeneratingImages}
                  className="flex-1 md:flex-none px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-2xl shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-95"
                >
                  {isGeneratingImages ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  批量繪製貼圖
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {prompts.map((p) => (
                <div key={p.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="relative aspect-square mb-5 bg-gray-50 rounded-2xl overflow-hidden border border-gray-50">
                    {p.status === 'done' && p.processedImage ? (
                      <div className="w-full h-full p-2 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:24px_24px]">
                         <img src={p.processedImage} className="w-full h-full object-contain drop-shadow-2xl" />
                         <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button onClick={() => downloadImage(p.processedImage!, p.keyword)} className="p-3 bg-white rounded-2xl text-indigo-600 shadow-xl hover:scale-110 transition-transform">
                              <Download className="w-5 h-5" />
                            </button>
                            <button onClick={() => setChatMessages([...chatMessages, p.processedImage!])} className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl hover:scale-110 transition-transform">
                              <MessageCircle className="w-5 h-5" />
                            </button>
                         </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                        {p.status === 'generating' ? (
                          <div className="flex flex-col items-center">
                            <div className="relative w-12 h-12 mb-3">
                                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin opacity-20" />
                                <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-indigo-600 animate-pulse" />
                            </div>
                            <span className="text-xs text-indigo-600 font-black tracking-widest uppercase">繪製中</span>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-12 h-12 text-gray-200 mb-2 opacity-50" />
                            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">待生成</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-md font-black text-gray-900">{p.keyword}</span>
                      {p.status === 'done' && (
                        <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-2 italic font-medium leading-relaxed">
                      {p.visualDescription}
                    </p>
                  </div>

                  {p.status !== 'done' && p.status !== 'generating' && (
                    <button 
                      onClick={() => generateOneImage(p.id)}
                      className="w-full mt-5 py-3 bg-gray-50 hover:bg-indigo-600 hover:text-white text-gray-500 rounded-2xl text-xs font-black transition-all shadow-sm"
                    >
                      開始生成
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Extra Assets Section (Main/Tab) */}
            {linePack.main && (
              <section className="mt-16 animate-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm overflow-hidden relative">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4 relative z-10">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-1 flex items-center gap-3">
                        <Grid className="w-6 h-6 text-indigo-600" /> LINE 店鋪必要素材
                      </h3>
                      <p className="text-sm text-gray-400 font-medium">系統已根據第一張貼圖自動生成封面與選單小圖</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-12 relative z-10">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Main Image (240x240)</p>
                      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-inner group relative">
                        <img src={linePack.main} className="w-32 h-32 object-contain drop-shadow-xl" />
                        <button onClick={() => downloadImage(linePack.main!, 'main')} className="absolute -bottom-2 -right-2 p-3 bg-white shadow-xl rounded-2xl text-indigo-600 hover:scale-110 transition-transform">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tab Icon (96x74)</p>
                      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-inner group relative">
                        <img src={linePack.tab} className="w-16 h-12 object-contain drop-shadow-md" />
                        <button onClick={() => downloadImage(linePack.tab!, 'tab')} className="absolute -bottom-2 -right-2 p-3 bg-white shadow-xl rounded-2xl text-indigo-600 hover:scale-110 transition-transform">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <Sparkles className="absolute -left-10 -bottom-10 w-48 h-48 text-indigo-50/30 -rotate-12" />
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Floating Pack Exporter */}
      {step === 2 && prompts.some(p => p.status === 'done') && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-[2rem] p-5 shadow-2xl flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-4 px-3">
              <div className="bg-indigo-500/20 p-2.5 rounded-2xl">
                <Archive className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <span className="text-white text-lg font-black block leading-none mb-1">
                  {prompts.filter(p => p.status === 'done').length} 張已就緒
                </span>
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">已符合 LINE 偶數像素規範</span>
              </div>
            </div>
            <button 
              onClick={handleExportZip}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-5 h-5" /> 打包匯出 ZIP
            </button>
          </div>
        </div>
      )}

      {/* LINE Chat Simulator Drawer */}
      {showChatPreview && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[24rem] bg-white shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
            <div className="flex items-center gap-3">
               <Smartphone className="w-6 h-6" />
               <h3 className="font-black text-lg">LINE 模擬器</h3>
            </div>
            <button onClick={() => setShowChatPreview(false)} className="hover:rotate-90 transition-transform">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 line-bg custom-scrollbar">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur border border-white/20 flex-shrink-0 flex items-center justify-center">
                 <Palette className="w-5 h-5 text-white/40" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none text-sm font-bold shadow-lg shadow-black/5 max-w-[85%] text-gray-800">
                哈囉！您可以點擊貼圖下方的 <MessageCircle className="w-3.5 h-3.5 inline mb-0.5" /> 按鈕來這裡預覽效果喔！
              </div>
            </div>
            
            {chatMessages.map((msg, i) => (
              <div key={i} className="flex justify-end animate-in fade-in zoom-in slide-in-from-right-4 duration-500">
                <img src={msg} className="w-40 h-40 object-contain drop-shadow-2xl hover:scale-110 transition-transform cursor-pointer" />
              </div>
            ))}
            
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-40 text-white/40 space-y-4">
                 <ImageIcon className="w-16 h-16 opacity-10" />
                 <p className="text-sm font-black tracking-widest text-center px-10">
                   尚未發送任何貼圖<br/>
                   <span className="text-[10px] opacity-60 font-medium">點擊貼圖上的氣泡按鈕</span>
                 </p>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-gray-50 flex items-center justify-between border-t border-gray-200">
             <button onClick={() => setChatMessages([])} className="text-xs text-red-400 font-black hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">清空對話紀錄</button>
             <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Preview Mode</p>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="max-w-6xl mx-auto px-4 py-16 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 text-gray-300">
        <div className="flex items-center gap-2">
           <Sparkles className="w-4 h-4 opacity-30" />
           <p className="text-xs font-bold tracking-widest uppercase">© 2025 AI LINE Sticker Factory. All rights reserved.</p>
        </div>
        <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest">
          <a href="#" className="hover:text-indigo-400 transition-colors">使用條款</a>
          <a href="#" className="hover:text-indigo-400 transition-colors">隱私政策</a>
          <a href="#" className="hover:text-indigo-400 transition-colors">聯絡支援</a>
        </div>
      </footer>
    </div>
  );
}
