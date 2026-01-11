
import React, { useState, useRef } from 'react';
import { 
  Sparkles, Settings, Grid, Image as ImageIcon, Download, 
  Plus, CheckCircle2, RefreshCw, Loader2, ChevronRight, 
  Info, MessageCircle, X, Smartphone, Palette, Wand2
} from 'lucide-react';
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

  const handleAutoGenerateScenarios = async () => {
    setIsGeneratingPrompts(true);
    try {
      const result = await generateScenarios(character, 16);
      setPrompts(result);
      setStep(2);
    } catch (error) {
      alert("自動生成情境失敗，請檢查 API Key。");
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const generateOneImage = async (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'generating' } : p));
    try {
      const promptObj = prompts.find(p => p.id === id);
      if (!promptObj) return;

      const rawImage = await generateStickerImage(promptObj.visualDescription, character.referenceImage);
      const processedImage = await processStickerImage(rawImage);
      
      // If this is the first one, set it as reference image for consistency
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

  const handleGenerateAll = async () => {
    setIsGeneratingImages(true);
    for (const prompt of prompts) {
      if (prompt.status !== 'done') {
        await generateOneImage(prompt.id);
      }
    }
    setIsGeneratingImages(false);
  };

  const generateLineAssets = async () => {
    const doneOnes = prompts.filter(p => p.status === 'done' && p.processedImage);
    if (doneOnes.length === 0) return;
    
    const mainImg = await createLineSpecialImage(doneOnes[0].processedImage!, 240, 240);
    const tabImg = await createLineSpecialImage(doneOnes[0].processedImage!, 96, 74);
    
    setLinePack({ main: mainImg, tab: tabImg });
    alert("LINE 封面圖與標籤小圖已生成！");
  };

  const downloadImage = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${name}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight hidden sm:block">AI Sticker Factory</h1>
            <h1 className="font-bold text-xl tracking-tight sm:hidden">貼圖工廠</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowChatPreview(!showChatPreview)}
              className={`p-2 rounded-lg transition-colors ${showChatPreview ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}
              title="對話預覽"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-indigo-50 p-2 rounded-xl">
                    <Palette className="text-indigo-600 w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">1. 角色一致性設定</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">物種與名字</label>
                    <input 
                      type="text" 
                      value={character.species}
                      onChange={(e) => setCharacter({...character, species: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">藝術風格</label>
                    <input 
                      type="text" 
                      value={character.style}
                      onChange={(e) => setCharacter({...character, style: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-gray-700">外型細節</label>
                    <textarea 
                      value={character.features}
                      onChange={(e) => setCharacter({...character, features: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-gray-700">穿著配飾</label>
                    <input 
                      type="text" 
                      value={character.clothing}
                      onChange={(e) => setCharacter({...character, clothing: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50"
                    />
                  </div>
                </div>

                <div className="mt-10 p-6 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 flex items-center justify-between gap-6">
                  <div>
                    <h3 className="font-bold text-indigo-900 mb-1">自動劇本生成</h3>
                    <p className="text-sm text-indigo-700/70">讓 Gemini 為您規劃 16 組 LINE 常用表情情境</p>
                  </div>
                  <button 
                    onClick={handleAutoGenerateScenarios}
                    disabled={isGeneratingPrompts}
                    className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingPrompts ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    開始規劃
                  </button>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold flex items-center gap-2 mb-4 text-gray-800">
                  <Smartphone className="w-5 h-5 text-indigo-600" /> 技術規範 Check
                </h3>
                <div className="space-y-3">
                  {[
                    "尺寸: 370x320 (偶數像素)",
                    "透明背景 (PNG)",
                    "四周 10px 留白",
                    "一組需 8/16/24/32/40 張"
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold mb-4 text-gray-800">角色參考基準</h3>
                {character.referenceImage ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
                    <img src={character.referenceImage} className="w-full aspect-square object-contain p-2" />
                    <button 
                      onClick={() => setCharacter({...character, referenceImage: undefined})}
                      className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-xs">生成首張貼圖後<br/>將自動固定外型特徵</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
              <div>
                <button onClick={() => setStep(1)} className="text-indigo-600 font-bold hover:underline mb-2 block">
                  ← 重新設定角色
                </button>
                <h2 className="text-2xl font-black text-gray-900">貼圖製作清單</h2>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={generateLineAssets}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  產生封底小圖
                </button>
                <button 
                  onClick={handleGenerateAll}
                  disabled={isGeneratingImages}
                  className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-95"
                >
                  {isGeneratingImages ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  批量生成
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {prompts.map((p) => (
                <div key={p.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 group hover:shadow-md transition-shadow">
                  <div className="relative aspect-square mb-4 bg-gray-50 rounded-2xl overflow-hidden border border-gray-50">
                    {p.status === 'done' && p.processedImage ? (
                      <div className="w-full h-full p-2 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:20px_20px]">
                         <img src={p.processedImage} className="w-full h-full object-contain drop-shadow-lg" />
                         <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={() => downloadImage(p.processedImage!, p.keyword)} className="p-3 bg-white rounded-2xl text-indigo-600 shadow-xl hover:scale-110 transition-transform">
                              <Download className="w-5 h-5" />
                            </button>
                            <button onClick={() => setChatMessages([...chatMessages, p.processedImage!])} className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl hover:scale-110 transition-transform">
                              <MessageCircle className="w-5 h-5" />
                            </button>
                         </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                        {p.status === 'generating' ? (
                          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-gray-200 mb-2" />
                        )}
                        <span className="text-[10px] text-gray-400 font-medium">
                          {p.status === 'generating' ? '繪製中...' : '尚未生成'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-gray-800">{p.keyword}</span>
                      {p.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-50" />}
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-2 italic leading-relaxed">
                      {p.visualDescription}
                    </p>
                  </div>

                  {p.status !== 'done' && p.status !== 'generating' && (
                    <button 
                      onClick={() => generateOneImage(p.id)}
                      className="w-full mt-4 py-2.5 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-xl text-xs font-bold transition-colors"
                    >
                      單張生成
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Extra Assets Section */}
            {linePack.main && (
              <section className="mt-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <Grid className="w-5 h-5 text-indigo-600" /> LINE 規格附屬圖檔
                </h3>
                <div className="flex gap-8">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500">Main (240x240)</p>
                    <img src={linePack.main} className="w-24 h-24 bg-gray-50 rounded-xl border border-gray-100 p-2" />
                    <button onClick={() => downloadImage(linePack.main!, 'main')} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" /> 下載
                    </button>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500">Tab (96x74)</p>
                    <img src={linePack.tab} className="w-12 h-10 bg-gray-50 rounded-xl border border-gray-100 p-1" />
                    <button onClick={() => downloadImage(linePack.tab!, 'tab')} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" /> 下載
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Chat Preview Drawer */}
      {showChatPreview && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[60] border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
            <h3 className="font-bold">LINE 聊天室模擬器</h3>
            <button onClick={() => setShowChatPreview(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#8CABD9]"> {/* Classic LINE BG color */}
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
              <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none text-sm shadow-sm max-w-[80%]">
                這貼圖用起來感覺如何？
              </div>
            </div>
            {chatMessages.map((msg, i) => (
              <div key={i} className="flex justify-end animate-in fade-in zoom-in duration-300">
                <img src={msg} className="w-32 h-32 object-contain drop-shadow-md" />
              </div>
            ))}
            {chatMessages.length === 0 && (
              <div className="text-center text-white/60 text-xs py-20">
                在貼圖上點擊 <MessageCircle className="w-3 h-3 inline" /> 即可預覽
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-50 flex items-center gap-2">
             <button onClick={() => setChatMessages([])} className="text-xs text-red-500 font-bold">清空對話</button>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="max-w-6xl mx-auto px-4 py-8 border-t border-gray-100 flex items-center justify-between text-gray-400 text-xs">
        <p>© 2025 AI LINE Sticker Factory. 為創作者而生。</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-indigo-600">使用條款</a>
          <a href="#" className="hover:text-indigo-600">隱私政策</a>
        </div>
      </footer>
    </div>
  );
}
