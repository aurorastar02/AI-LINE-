
import React, { useState } from 'react';
import { 
  Sparkles, 
  Settings, 
  Grid, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  RefreshCw,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { CharacterConfig, StickerPrompt } from './types';
import { generateStickerPrompts, generateStickerImage } from './services/geminiService';
import { processStickerImage } from './utils/imageUtils';

const DEFAULT_KEYWORDS = ["你好", "謝謝", "對不起", "驚訝", "生氣", "疲累", "加油", "睡覺"];

export default function App() {
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<CharacterConfig>({
    species: '橘色小貓',
    features: '圓大眼睛，頭上有閃電斑紋',
    clothing: '藍色連帽衫',
    style: 'Q版比例 (Chibi)，粗輪廓線，平塗色塊 (Flat Illustration)'
  });
  
  const [keywordsInput, setKeywordsInput] = useState(DEFAULT_KEYWORDS.join(', '));
  const [prompts, setPrompts] = useState<StickerPrompt[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const handleStartPlanning = async () => {
    setIsGeneratingPrompts(true);
    try {
      const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k);
      const result = await generateStickerPrompts(character, keywords);
      setPrompts(result);
      setStep(2);
    } catch (error) {
      alert("生成策略時發生錯誤，請檢查您的 API Key 設定。");
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const generateOneImage = async (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'generating' } : p));
    try {
      const promptObj = prompts.find(p => p.id === id);
      if (!promptObj) return;

      const rawImage = await generateStickerImage(promptObj.visualDescription);
      const processedImage = await processStickerImage(rawImage);
      
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

  const downloadImage = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `貼圖_${name}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">AI LINE 貼圖工廠</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex gap-4">
                {[
                  { n: 1, l: '角色設定' },
                  { n: 2, l: '貼圖生成' }
                ].map((s) => (
                  <div key={s.n} className={`flex items-center gap-2 ${step === s.n ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${step === s.n ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
                      {s.n}
                    </span>
                    {s.l}
                    {s.n === 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Character Design Form */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <Settings className="text-indigo-600 w-5 h-5" />
                  <h2 className="text-lg font-bold">1. 定義您的角色</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">物種</label>
                    <input 
                      type="text" 
                      value={character.species}
                      onChange={(e) => setCharacter({...character, species: e.target.value})}
                      placeholder="例如：柴犬、企鵝"
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">藝術風格</label>
                    <input 
                      type="text" 
                      value={character.style}
                      onChange={(e) => setCharacter({...character, style: e.target.value})}
                      placeholder="例如：水彩風、像素藝術"
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">核心外型特徵</label>
                    <textarea 
                      value={character.features}
                      onChange={(e) => setCharacter({...character, features: e.target.value})}
                      rows={2}
                      placeholder="獨特的身體特徵、眼睛形狀等..."
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">穿著 / 配件</label>
                    <input 
                      type="text" 
                      value={character.clothing}
                      onChange={(e) => setCharacter({...character, clothing: e.target.value})}
                      placeholder="角色穿什麼衣服或戴什麼配件？"
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Grid className="text-indigo-600 w-5 h-5" />
                  <h2 className="text-lg font-bold">2. 貼圖關鍵字</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">輸入想要生成的表情或動作清單，以逗號分隔。</p>
                <textarea 
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                />
              </section>

              <button 
                onClick={handleStartPlanning}
                disabled={isGeneratingPrompts}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingPrompts ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> 正在規劃貼圖策略...</>
                ) : (
                  <>生成貼圖製作策略 <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </div>

            {/* Sidebar / Info */}
            <div className="space-y-6">
              <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="text-indigo-600 w-5 h-5" />
                  <h3 className="font-bold text-indigo-900">LINE 貼圖技術規範</h3>
                </div>
                <ul className="space-y-3 text-sm text-indigo-800">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                    尺寸上限：370 x 320 px
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                    格式：透明背景 PNG
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                    建議留白：四周至少 10px
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                    長寬必須為偶數像素
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold mb-3">角色預覽</h3>
                <div className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                   <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                   <p className="text-xs text-center px-4">生成後將在此顯示<br/>首張角色參考圖</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
              <div>
                <button onClick={() => setStep(1)} className="text-indigo-600 text-sm font-medium hover:underline mb-2 flex items-center gap-1">
                  ← 返回角色設定
                </button>
                <h2 className="text-2xl font-bold">貼圖生成清單</h2>
                <p className="text-gray-500">在開始製圖前，您可以預覽每張貼圖的視覺描述。</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={handleGenerateAll}
                  disabled={isGeneratingImages}
                  className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingImages ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  全部生成
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {prompts.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col group">
                  <div className="relative aspect-square mb-4 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100">
                    {p.status === 'done' && p.processedImage ? (
                      <div className="relative w-full h-full p-2 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                         <img src={p.processedImage} alt={p.keyword} className="w-full h-full object-contain drop-shadow-md" />
                         <button 
                          onClick={() => downloadImage(p.processedImage!, p.keyword)}
                          className="absolute bottom-2 right-2 p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Download className="w-4 h-4 text-indigo-600" />
                         </button>
                      </div>
                    ) : (
                      <div className="text-center p-6">
                        {p.status === 'generating' ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                            <p className="text-xs text-gray-400 font-medium">正在繪製...</p>
                          </div>
                        ) : p.status === 'error' ? (
                          <div className="text-red-400">
                            <Trash2 className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs font-medium">生成失敗</p>
                          </div>
                        ) : (
                          <ImageIcon className="w-10 h-10 text-gray-200 mx-auto" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {p.keyword}
                      </span>
                      {p.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight line-clamp-3 italic mb-4">
                      "{p.visualDescription}"
                    </p>
                  </div>

                  {p.status !== 'done' && p.status !== 'generating' && (
                    <button 
                      onClick={() => generateOneImage(p.id)}
                      className="w-full mt-auto py-2 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      單張生成
                    </button>
                  )}
                </div>
              ))}

              <button 
                onClick={() => setStep(1)}
                className="rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center p-8 min-h-[300px] text-gray-400 hover:text-indigo-600"
              >
                <Plus className="w-8 h-8 mb-2" />
                <span className="font-semibold">新增更多貼圖</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action for Finish */}
      {step === 2 && prompts.some(p => p.status === 'done') && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-gray-200 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">
                已完成 {prompts.filter(p => p.status === 'done').length} 張貼圖
              </span>
              <span className="text-xs text-gray-500">已自動符合 LINE 規範格式</span>
            </div>
            <button 
              onClick={() => {
                prompts.filter(p => p.status === 'done').forEach(p => {
                  if (p.processedImage) downloadImage(p.processedImage, p.keyword);
                });
              }}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
            >
              <Download className="w-4 h-4" /> 下載全部
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
