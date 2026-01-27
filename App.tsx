
import React, { useState, useMemo } from 'react';
import { 
  Sparkles, Palette, Download, CheckCircle2, 
  Loader2, ImageIcon, Wand2, Layers, Dices, Info, ShieldCheck,
  ChevronRight, Box, LayoutGrid, CheckSquare, FileJson, Type, Tag, FlaskConical, 
  Key, Save, X, ExternalLink, Settings2, ShieldAlert, Cpu
} from 'lucide-react';
import JSZip from 'jszip';
import { CharacterConfig, StickerPrompt, TextStyleConfig, GenerationMode } from './types';
import { buildPrompt, generateStickerImage, getActiveApiKey } from './services/geminiService';
import { useStickerProcessor } from './hooks/useStickerProcessor';
import { getRandomPreset } from './animalPresets';
import { stickerScenarios } from './utils/scenarios';
import { autoDeriveLineAssets } from './utils/StickerProcessor';
import { textStylePresets } from './utils/textStylePresets';

export default function App() {
  const [step, setStep] = useState(1);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('fine');
  
  // API Key Management State
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('user_gemini_api_key') || '');
  const [keyNotification, setKeyNotification] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const activeKeyInfo = useMemo(() => getActiveApiKey(), [apiKeyInput, showKeyConfig]);

  const [character, setCharacter] = useState<CharacterConfig>({
    species: '橘色小貓',
    features: '圓大眼睛，頭上有閃電斑紋',
    clothing: '藍色連帽衫',
    style: 'Q版比例 (Chibi)，粗輪廓線，平塗色塊'
  });
  
  const [stickerTitle, setStickerTitle] = useState('萌萌日常');
  const [selectedTextStyle, setSelectedTextStyle] = useState<TextStyleConfig>(textStylePresets[0]);
  const [stickerCount, setStickerCount] = useState(8);
  const [prompts, setPrompts] = useState<StickerPrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [lineAssets, setLineAssets] = useState<{ main?: string; tab?: string }>({});
  
  const { processSticker } = useStickerProcessor();

  const handleSaveKey = () => {
    if (!apiKeyInput.trim()) return handleClearKey();
    localStorage.setItem('user_gemini_api_key', apiKeyInput.trim());
    setKeyNotification({ message: '金鑰已更新，接下來的生成將使用新 Key。', type: 'success' });
    setTimeout(() => {
      setKeyNotification(null);
      setShowKeyConfig(false);
    }, 2000);
  };

  const handleClearKey = () => {
    localStorage.removeItem('user_gemini_api_key');
    setApiKeyInput('');
    setKeyNotification({ message: '已恢復系統預設金鑰設定。', type: 'success' });
    setTimeout(() => setKeyNotification(null), 2000);
  };

  const handleEstablishCharacter = async () => {
    setIsGenerating(true);
    try {
      const basePrompt = buildPrompt(character, "standing pose with a neutral expression, character sheet style", generationMode);
      const rawImage = await generateStickerImage(basePrompt);
      const processed = await processSticker(rawImage);
      if (processed) {
        setCharacter(prev => ({ ...prev, referenceImage: processed.dataUrl }));
      }
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApiError = (error: any) => {
    if (error.message === "API_KEY_INVALID") {
      setKeyNotification({ message: '偵測到無效金鑰，請檢查並重新輸入。', type: 'error' });
      setShowKeyConfig(true);
    } else if (error.message === "QUOTA_EXCEEDED") {
      setKeyNotification({ message: '目前的金鑰配額已用完 (429 Quota Exceeded)。', type: 'error' });
      setShowKeyConfig(true);
    } else {
      alert("生成失敗，請確認網路連線或金鑰狀態");
    }
    setIsBatchGenerating(false);
  };

  const prepareProduction = () => {
    const initialPrompts: StickerPrompt[] = stickerScenarios.slice(0, stickerCount).map((action, index) => ({
      id: `stk-${Date.now()}-${index}`,
      keyword: action.split(' ')[0], 
      visualDescription: buildPrompt(character, action, generationMode),
      status: 'pending'
    }));
    setPrompts(initialPrompts);
    setLineAssets({});
    setStep(2);
  };

  const generateOne = async (id: string, index: number) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'generating' } : p));
    try {
      const target = prompts.find(p => p.id === id);
      if (!target) return null;

      const raw = await generateStickerImage(target.visualDescription, character.referenceImage);
      const processed = await processSticker(raw, target.keyword, selectedTextStyle);
      
      if (processed) {
        const updatedPrompt = { 
          ...target, 
          generatedImage: raw, 
          processedImage: processed.dataUrl, 
          status: 'done' as const 
        };
        
        setPrompts(prev => prev.map(p => p.id === id ? updatedPrompt : p));

        // 如果是第一張貼圖，自動產出系統圖 (Main & Tab)
        if (index === 0 && processed.cleanSource) {
          const assets = await autoDeriveLineAssets(processed.cleanSource, stickerTitle, selectedTextStyle);
          setLineAssets(assets);
        }
        return updatedPrompt;
      }
    } catch (error: any) {
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'error' } : p));
      handleApiError(error);
    }
    return null;
  };

  const handleBatchGenerate = async () => {
    setIsBatchGenerating(true);
    setGeneratingIndex(0);
    const pendingOnes = prompts.map((p, idx) => ({ p, idx })).filter(item => item.p.status !== 'done');
    let count = 0;
    for (const item of pendingOnes) {
      count++;
      setGeneratingIndex(count);
      const res = await generateOne(item.p.id, item.idx);
      if (!res) break; 
      await new Promise(r => setTimeout(r, 2000));
    }
    setIsBatchGenerating(false);
    setGeneratingIndex(0);
  };

  const handleExportZip = async () => {
    const doneOnes = prompts.filter(p => p.status === 'done' && p.processedImage);
    if (doneOnes.length === 0) return alert("尚無已完成的貼圖可供下載");
    const zip = new JSZip();
    
    // 貼圖本體 (01.png, 02.png...)
    doneOnes.forEach((p, i) => {
      const b64 = p.processedImage!.split(',')[1];
      zip.file(`${String(i + 1).padStart(2, '0')}.png`, b64, { base64: true });
    });

    // 系統圖資產 (main.png, tab.png)
    if (lineAssets.main) {
      zip.file(`main.png`, lineAssets.main.split(',')[1], { base64: true });
    }
    if (lineAssets.tab) {
      zip.file(`tab.png`, lineAssets.tab.split(',')[1], { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `LINE_Pack_${stickerTitle.replace(/\s+/g, '_')}_${doneOnes.length}.zip`;
    link.click();
  };

  const isAllDone = useMemo(() => prompts.length > 0 && prompts.every(p => p.status === 'done'), [prompts]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <nav className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-200">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight">AI 貼圖工廠 PRO</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            className={`p-2.5 rounded-xl transition-all relative ${showKeyConfig ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <Settings2 className="w-5 h-5" />
            {activeKeyInfo.source === 'manual' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
            )}
          </button>
        </div>
      </nav>

      {showKeyConfig && (
        <div className="sticky top-16 z-40 bg-white border-b shadow-2xl p-6 animate-in slide-in-from-top duration-300">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <h3 className="font-black text-slate-700 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-500" /> API 金鑰管理
                </h3>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border ${activeKeyInfo.source === 'manual' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                  <Cpu className="w-3.5 h-3.5" />
                  目前生效：{activeKeyInfo.source === 'manual' ? `自定義 (****${activeKeyInfo.key.slice(-4)})` : '系統預設代碼'}
                </div>
              </div>
              <button onClick={() => setShowKeyConfig(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-5 items-end">
              <div className="flex-1 w-full space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Google Gemini API Key</label>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] font-black text-indigo-500 flex items-center gap-1 hover:underline">
                    獲取免費金鑰 <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input 
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="在此貼上您的 API 金鑰..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-mono text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleClearKey} className="px-5 py-4 bg-slate-100 text-slate-500 font-black text-sm rounded-2xl hover:bg-slate-200 transition-all">
                  清除設定
                </button>
                <button onClick={handleSaveKey} className="px-8 py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" /> 儲存金鑰
                </button>
              </div>
            </div>

            {keyNotification && (
              <div className={`mt-5 p-4 rounded-2xl text-xs font-bold animate-in fade-in flex items-center gap-3 ${keyNotification.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100 shadow-sm'}`}>
                {keyNotification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                {keyNotification.message}
              </div>
            )}
            
            <div className="mt-5 flex items-start gap-3 bg-amber-50 p-5 rounded-2xl border border-amber-100">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-800 leading-relaxed font-medium">
                <p className="font-black mb-1.5 uppercase tracking-wide">額度說明與提示：</p>
                1. 系統會優先使用此介面輸入的金鑰並存於您的瀏覽器 (localStorage)。<br/>
                2. 若換了金鑰仍提示額度爆滿，請確認新金鑰是否來自<b>不同的 Google 專案</b> (同專案共享 Quota)。<br/>
                3. 免費方案每分鐘生成上限較低，批量生產時系統已自動加入 2 秒延遲。
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <Palette className="text-indigo-600" /> 第一階段：角色設定
                  </h2>
                  <button 
                    onClick={() => setCharacter({ ...character, ...getRandomPreset() })}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2"
                  >
                    <Dices className="w-4 h-4" /> 隨機物種
                  </button>
                </div>

                <div className="mb-10 p-7 bg-slate-50 rounded-3xl border-2 border-slate-100">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-5">生成風格模式</label>
                  <div className="grid grid-cols-2 gap-5">
                    <button 
                      onClick={() => setGenerationMode('fine')}
                      className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${generationMode === 'fine' ? 'bg-white border-indigo-500 shadow-md ring-4 ring-indigo-500/5' : 'bg-transparent border-transparent grayscale opacity-50 hover:opacity-100'}`}
                    >
                      <div className={`p-2.5 rounded-xl ${generationMode === 'fine' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <Sparkles size={20} />
                      </div>
                      <div className="text-left">
                        <div className="font-black text-sm">精緻 Q 版</div>
                        <div className="text-[10px] text-slate-400 font-bold">商業設計等級、圓潤可愛</div>
                      </div>
                    </button>

                    <button 
                      onClick={() => setGenerationMode('abstract')}
                      className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${generationMode === 'abstract' ? 'bg-white border-amber-500 shadow-md ring-4 ring-amber-500/5' : 'bg-transparent border-transparent grayscale opacity-50 hover:opacity-100'}`}
                    >
                      <div className={`p-2.5 rounded-xl ${generationMode === 'abstract' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <FlaskConical size={20} />
                      </div>
                      <div className="text-left">
                        <div className="font-black text-sm">魔性崩壞</div>
                        <div className="text-[10px] text-slate-400 font-bold">醜得可愛、手繪草圖感</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                  <div className="md:col-span-2 space-y-3 pb-6 border-b border-slate-50">
                    <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5" /> 貼圖系列名稱
                    </label>
                    <input 
                      type="text" value={stickerTitle} 
                      onChange={e => setStickerTitle(e.target.value)}
                      placeholder="例如：小貓日常、厭世上班族"
                      className="w-full bg-indigo-50/40 border-2 border-indigo-100 rounded-2xl px-6 py-5 font-black focus:ring-4 ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">角色物種</label>
                    <input 
                      type="text" value={character.species} 
                      onChange={e => setCharacter({...character, species: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-bold outline-none ring-offset-2 focus:ring-2 ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">基礎風格描述</label>
                    <input 
                      type="text" value={character.style} 
                      onChange={e => setCharacter({...character, style: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-bold outline-none ring-offset-2 focus:ring-2 ring-indigo-500/20"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">外觀細節與特徵</label>
                    <textarea 
                      value={character.features} rows={2}
                      onChange={e => setCharacter({...character, features: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-bold outline-none resize-none ring-offset-2 focus:ring-2 ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="mt-12 pt-10 border-t border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                    <Type className="w-4 h-4" /> 文字邊框樣式
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                    {textStylePresets.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedTextStyle(style)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${selectedTextStyle.id === style.id ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-100 shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                      >
                        <div 
                          className="text-base font-black text-center"
                          style={{ 
                            color: style.color, 
                            textShadow: `0 0 ${style.strokeWidth}px ${style.strokeColor}, 0 0 2px ${style.strokeColor}` 
                          }}
                        >
                          你好
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center">{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-12">
                  <button 
                    onClick={handleEstablishCharacter}
                    disabled={isGenerating}
                    className="w-full bg-slate-900 text-white font-black py-6 rounded-[1.5rem] hover:bg-slate-800 transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-2xl"
                  >
                    {isGenerating ? <Loader2 className="animate-spin w-6 h-6" /> : <Wand2 className="w-6 h-6" />}
                    建立一致性角色基準 ({generationMode === 'fine' ? '精緻模式' : '實驗模式'})
                  </button>
                </div>
              </div>

              <div className="bg-indigo-600 rounded-[3rem] p-10 md:p-14 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><LayoutGrid size={200} /></div>
                <div className="relative z-10">
                  <h3 className="font-black text-4xl mb-3 flex items-center gap-4"><Box className="text-indigo-200" /> 生產線配置</h3>
                  <p className="text-indigo-100 text-base mb-10 max-w-lg leading-relaxed font-medium">系統將根據左側的角色設定，自動生成一整套風格、外觀高度一致的貼圖包。您可以選擇生成的張數。</p>
                  
                  <div className="flex flex-col gap-6 mb-12">
                    <label className="text-[11px] font-black uppercase text-indigo-200 tracking-[0.2em]">選擇系列張數 (LINE 規範)</label>
                    <div className="flex flex-wrap gap-4">
                      {[8, 16, 24, 32, 40].map(count => (
                        <button 
                          key={count} onClick={() => setStickerCount(count)}
                          className={`flex-1 min-w-[70px] py-5 rounded-2xl font-black text-lg transition-all ${stickerCount === count ? 'bg-white text-indigo-600 scale-105 shadow-2xl' : 'bg-indigo-500 text-indigo-100 hover:bg-indigo-400 border border-indigo-400/30'}`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={prepareProduction}
                    disabled={!character.referenceImage}
                    className="w-full bg-white text-indigo-600 font-black py-6 rounded-[1.5rem] disabled:opacity-30 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 group/btn shadow-2xl shadow-indigo-900/20"
                  >
                    進入生產流水線 <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 border shadow-sm sticky top-24">
                <h3 className="font-black text-slate-400 text-[10px] tracking-widest uppercase mb-8">基準角色預覽 (一致性核心)</h3>
                {character.referenceImage ? (
                  <div className="bg-slate-50 rounded-3xl p-6 border-2 border-dashed border-slate-200 aspect-square flex items-center justify-center overflow-hidden relative group">
                    <img src={character.referenceImage} className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                ) : (
                  <div className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon className="w-14 h-14 mb-4 opacity-20" />
                    <p className="text-[11px] font-black text-center px-10 uppercase tracking-widest leading-loose">請先點擊左側<br/>建立基準按鈕</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
              <div className="space-y-3">
                <button onClick={() => setStep(1)} className="text-indigo-600 font-black text-sm mb-4 flex items-center gap-2 group">
                  <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> 返回角色設定
                </button>
                <h2 className="text-5xl font-black tracking-tighter flex items-center gap-6">
                  自動生產流水線 
                  <span className="text-xl bg-slate-900 px-5 py-1.5 rounded-full text-white font-bold">{prompts.length} 貼圖</span>
                </h2>
              </div>
              
              <div className="flex flex-wrap gap-5">
                <button 
                  onClick={handleBatchGenerate}
                  disabled={isBatchGenerating}
                  className="bg-indigo-600 text-white px-10 py-6 rounded-2xl font-black shadow-2xl shadow-indigo-200 flex items-center gap-4 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                >
                  {isBatchGenerating ? <Loader2 className="animate-spin w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                  啟動全自動生成
                </button>
                <button 
                  onClick={handleExportZip}
                  className="bg-slate-900 text-white px-10 py-6 rounded-2xl font-black shadow-2xl flex items-center gap-4 hover:bg-slate-800 transition-all active:scale-95"
                >
                  <Download className="w-6 h-6" /> 匯出 LINE 貼圖包
                </button>
              </div>
            </div>

            {(lineAssets.main || lineAssets.tab) && (
              <div className="mb-14 bg-white border border-indigo-100 p-10 rounded-[3rem] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                <h3 className="font-black text-indigo-600 text-sm flex items-center gap-3 mb-8 uppercase tracking-[0.2em] relative z-10">
                  <FileJson className="w-5 h-5" /> LINE 必要系統圖示資產
                </h3>
                <div className="flex flex-wrap gap-12 relative z-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">封面圖 Main (240x240)</label>
                    <div className="w-40 h-40 bg-slate-50 rounded-[2rem] border-2 border-dashed border-indigo-100 flex items-center justify-center p-6 shadow-inner">
                      {lineAssets.main ? <img src={lineAssets.main} className="max-w-full max-h-full object-contain drop-shadow-md" /> : <Loader2 className="animate-spin text-indigo-200" />}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">標籤圖 Tab (96x74)</label>
                    <div className="w-40 h-40 bg-slate-50 rounded-[2rem] border-2 border-dashed border-indigo-100 flex items-center justify-center p-6 shadow-inner">
                      {lineAssets.tab ? <img src={lineAssets.tab} className="w-[110px] h-[85px] object-contain drop-shadow-md" /> : <Loader2 className="animate-spin text-indigo-200" />}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {prompts.map((p, idx) => (
                <div key={p.id} className="bg-white border rounded-[2.5rem] p-6 transition-all group relative hover:shadow-xl hover:-translate-y-1">
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-sm z-10 shadow-lg border-2 border-white">
                    {idx + 1}
                  </div>
                  <div className="aspect-square bg-slate-50 rounded-3xl mb-5 overflow-hidden relative border border-slate-100 shadow-inner group-hover:bg-slate-100 transition-colors">
                    {p.status === 'done' ? (
                      <div className="w-full h-full p-3 animate-in zoom-in duration-500">
                        <img src={p.processedImage} className="w-full h-full object-contain drop-shadow-2xl" alt={p.keyword} />
                        <div className="absolute top-3 right-3 bg-emerald-500 rounded-full p-1.5 text-white shadow-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    ) : p.status === 'generating' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50/40">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                        <span className="text-[10px] font-black text-indigo-400 mt-4 uppercase tracking-widest">生成中...</span>
                      </div>
                    ) : p.status === 'error' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                        <ShieldAlert className="w-10 h-10 text-red-400 mb-2" />
                        <button onClick={() => generateOne(p.id, idx)} className="text-[10px] font-black text-red-600 underline">重試</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => generateOne(p.id, idx)}
                        disabled={isBatchGenerating}
                        className="w-full h-full flex flex-col items-center justify-center disabled:opacity-30 group-hover:scale-105 transition-transform"
                      >
                        <Wand2 className="w-8 h-8 text-slate-200 group-hover:text-indigo-300 mb-3" />
                        <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-400 tracking-widest">點擊生成</span>
                      </button>
                    )}
                  </div>
                  <div className="px-2 text-center">
                    <div className="font-black text-lg text-slate-800 truncate mb-1">{p.keyword}</div>
                    <div className="text-[10px] text-slate-400 font-bold leading-relaxed line-clamp-1 opacity-60 italic">{stickerScenarios[idx]}</div>
                  </div>
                </div>
              ))}
            </div>

            {isAllDone && (
              <div className="mt-24 bg-emerald-50 border border-emerald-100 p-14 rounded-[4rem] text-center max-w-3xl mx-auto shadow-2xl shadow-emerald-900/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                  <div className="absolute inset-0 rotate-12 scale-150"><LayoutGrid size={400} /></div>
                </div>
                <div className="relative z-10">
                  <div className="inline-flex bg-emerald-500 text-white p-6 rounded-[2rem] mb-8 shadow-2xl shadow-emerald-200 animate-bounce"><CheckSquare size={48} /></div>
                  <h3 className="text-4xl font-black text-emerald-900 mb-4 tracking-tighter">貼圖套裝已完成！</h3>
                  <p className="text-emerald-700/70 font-bold mb-10 max-w-md mx-auto leading-relaxed">恭喜！您的 {prompts.length} 張高品質貼圖資產已全數準備完畢，包含 LINE 封面與標籤圖示。</p>
                  <button 
                    onClick={handleExportZip}
                    className="bg-emerald-600 text-white px-12 py-6 rounded-[1.5rem] font-black text-lg shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-4 mx-auto active:scale-95 group"
                  >
                    <Download className="w-7 h-7 group-hover:translate-y-1 transition-transform" /> 立即下載 ZIP 貼圖包
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="mt-20 py-10 border-t bg-white text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Powered by Gemini 2.5 & Imagen Pro</p>
      </footer>
    </div>
  );
}
