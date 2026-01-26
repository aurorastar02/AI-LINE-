
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, Palette, Download, CheckCircle2, 
  Loader2, ImageIcon, Wand2, Layers, Dices, Info, ShieldCheck,
  ChevronRight, Box, LayoutGrid, CheckSquare, ListOrdered, FileJson, Type, Tag, FlaskConical, 
  Key, Save, X, ExternalLink, Settings2
} from 'lucide-react';
import JSZip from 'jszip';
import { CharacterConfig, StickerPrompt, TextStyleConfig, GenerationMode } from './types';
import { buildPrompt, generateStickerImage } from './services/geminiService';
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

  // Save API Key logic
  const handleSaveKey = () => {
    localStorage.setItem('user_gemini_api_key', apiKeyInput);
    setKeyNotification({ message: 'API 金鑰已更新！', type: 'success' });
    setTimeout(() => {
      setKeyNotification(null);
      setShowKeyConfig(false);
    }, 2000);
  };

  const handleClearKey = () => {
    localStorage.removeItem('user_gemini_api_key');
    setApiKeyInput('');
    setKeyNotification({ message: '已恢復系統預設金鑰', type: 'success' });
    setTimeout(() => setKeyNotification(null), 2000);
  };

  // Phase 1: 建立基準角色
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
      if (error.message === "API_KEY_INVALID") {
        alert("API 金鑰無效，請檢查設定區塊。");
        setShowKeyConfig(true);
      } else {
        alert("建立角色基準失敗，請稍後再試");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 進入生產介面
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

  // 單張生成邏輯
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

        if (index === 0 && processed.cleanSource) {
          const assets = await autoDeriveLineAssets(processed.cleanSource, stickerTitle, selectedTextStyle);
          setLineAssets(assets);
        }

        return updatedPrompt;
      }
    } catch (error: any) {
      console.error("生成單張失敗:", error);
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: 'error' } : p));
      if (error.message === "API_KEY_INVALID") {
        alert("金鑰失效，請於右上角重新設定。");
        setShowKeyConfig(true);
      }
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
      if (!res) break; // 若發生錯誤則停止批量
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
    if (lineAssets.main) zip.file(`main.png`, lineAssets.main.split(',')[1], { base64: true });
    if (lineAssets.tab) zip.file(`tab.png`, lineAssets.tab.split(',')[1], { base64: true });
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
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight">AI 貼圖工廠 PRO</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full mr-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            智慧風格引擎 V2.0
          </div>
          
          {/* API Key Toggle Button */}
          <button 
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            className={`p-2 rounded-xl transition-all ${showKeyConfig ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* API Key Configuration Dropdown */}
      {showKeyConfig && (
        <div className="sticky top-16 z-40 bg-white border-b shadow-xl p-6 animate-in slide-in-from-top duration-300">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-500" /> API 金鑰管理
              </h3>
              <button onClick={() => setShowKeyConfig(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Google Gemini API Key</label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-black text-indigo-500 flex items-center gap-1 hover:underline"
                  >
                    獲取金鑰 <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input 
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="在此貼上您的 API 金鑰..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleClearKey}
                  className="px-4 py-3 bg-slate-100 text-slate-500 font-black text-sm rounded-xl hover:bg-slate-200 transition-colors"
                >
                  清除
                </button>
                <button 
                  onClick={handleSaveKey}
                  className="px-6 py-3 bg-indigo-600 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> 儲存金鑰
                </button>
              </div>
            </div>

            {keyNotification && (
              <div className={`mt-4 p-3 rounded-lg text-xs font-bold animate-in fade-in ${keyNotification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {keyNotification.message}
              </div>
            )}
            
            <div className="mt-4 flex items-start gap-2 bg-amber-50 p-4 rounded-xl border border-amber-100">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-700 leading-relaxed">
                <p className="font-bold mb-1">關於額度：</p>
                目前 API 無法直接顯示餘額。請前往 <a href="https://aistudio.google.com/app/plan_and_billing" target="_blank" className="underline font-black">Google AI Studio</a> 查看。
                若金鑰正確，生成時若提示 429 錯誤則代表觸發頻率限制。金鑰將儲存於您的瀏覽器 localStorage。
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-3xl p-8 border shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <Palette className="text-indigo-600" /> 第一階段：角色設定
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCharacter({ ...character, ...getRandomPreset() })}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-1"
                    >
                      <Dices className="w-3.5 h-3.5" /> 隨機預設
                    </button>
                  </div>
                </div>

                <div className="mb-8 p-6 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">生成模式 (Style Mode)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setGenerationMode('fine')}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${generationMode === 'fine' ? 'bg-white border-indigo-500 shadow-md ring-4 ring-indigo-500/10' : 'bg-transparent border-transparent grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
                    >
                      <div className={`p-2 rounded-lg ${generationMode === 'fine' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <Sparkles size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-black text-sm">模式 A：精緻 Q 版</div>
                        <div className="text-[10px] text-slate-400 font-bold">圓潤、對稱、專業設計感</div>
                      </div>
                    </button>

                    <button 
                      onClick={() => setGenerationMode('abstract')}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${generationMode === 'abstract' ? 'bg-white border-amber-500 shadow-md ring-4 ring-amber-500/10' : 'bg-transparent border-transparent grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
                    >
                      <div className={`p-2 rounded-lg ${generationMode === 'abstract' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <FlaskConical size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-black text-sm">模式 B：抽象搞笑實驗室</div>
                        <div className="text-[10px] text-slate-400 font-bold">魔性崩壞、筆觸混亂</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2 pb-4 border-b border-slate-50">
                    <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-1.5">
                      <Tag className="w-3 h-3" /> 貼圖系列名稱 (Title)
                    </label>
                    <input 
                      type="text" value={stickerTitle} 
                      onChange={e => setStickerTitle(e.target.value)}
                      placeholder="例如：小貓日常、霸總語錄"
                      className="w-full bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl px-5 py-4 font-black focus:ring-4 ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">角色物種</label>
                    <input 
                      type="text" value={character.species} 
                      onChange={e => setCharacter({...character, species: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">基礎風格描述</label>
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
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Type className="w-4 h-4" /> 選擇文字樣式
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {textStylePresets.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedTextStyle(style)}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${selectedTextStyle.id === style.id ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-100' : 'border-slate-100 hover:border-slate-200'}`}
                      >
                        <div 
                          className="text-sm font-black text-center"
                          style={{ 
                            color: style.color, 
                            textShadow: `0 0 ${style.strokeWidth}px ${style.strokeColor}` 
                          }}
                        >
                          你好
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 line-clamp-1">{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-10">
                  <button 
                    onClick={handleEstablishCharacter}
                    disabled={isGenerating}
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    建立角色基準 ({generationMode === 'fine' ? '精緻模式' : '實驗模式'})
                  </button>
                </div>
              </div>

              <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><LayoutGrid size={120} /></div>
                <div className="relative z-10">
                  <h3 className="font-black text-3xl mb-2 flex items-center gap-3"><Box className="text-indigo-200" /> 批量生產配置</h3>
                  <p className="text-indigo-100 text-sm mb-8 max-w-md">系列標題「{stickerTitle}」將應用於封面資產。模式：{generationMode === 'fine' ? '精緻 Q 版' : '抽象搞笑'}</p>
                  
                  <div className="flex flex-col gap-4 mb-8">
                    <label className="text-[10px] font-black uppercase text-indigo-200 tracking-widest">選擇生成張數</label>
                    <div className="flex flex-wrap gap-3">
                      {[8, 16, 24, 32, 40].map(count => (
                        <button 
                          key={count} onClick={() => setStickerCount(count)}
                          className={`flex-1 min-w-[60px] py-4 rounded-2xl font-black transition-all ${stickerCount === count ? 'bg-white text-indigo-600 scale-105 shadow-lg' : 'bg-indigo-500 text-indigo-100 hover:bg-indigo-400'}`}
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
                    <img src={character.referenceImage} className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                  </div>
                ) : (
                  <div className="aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-[10px] font-black text-center px-8 uppercase tracking-widest">尚未建立基準</p>
                  </div>
                )}
                {character.referenceImage && (
                   <div className={`mt-4 text-center text-[10px] font-black uppercase tracking-tighter py-2 rounded-lg ${generationMode === 'fine' ? 'text-indigo-500 bg-indigo-50' : 'text-amber-600 bg-amber-50'}`}>
                     已鎖定：{generationMode === 'fine' ? '精緻 Q 版' : '抽象搞笑'}
                   </div>
                )}
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
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleBatchGenerate}
                  disabled={isBatchGenerating}
                  className="bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-3 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isBatchGenerating ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  啟動全套生產
                </button>
                <button 
                  onClick={handleExportZip}
                  className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black shadow-xl flex items-center gap-3 hover:bg-slate-800"
                >
                  <Download className="w-5 h-5" /> 下載 ZIP 貼圖包
                </button>
              </div>
            </div>

            {/* 必要資產預覽區 (Main / Tab) */}
            {(lineAssets.main || lineAssets.tab) && (
              <div className="mb-10 bg-white border border-indigo-100 p-8 rounded-[2.5rem] shadow-sm">
                <h3 className="font-black text-indigo-600 text-sm flex items-center gap-2 mb-6 uppercase tracking-wider">
                  <FileJson className="w-4 h-4" /> LINE 封面與標籤圖
                </h3>
                <div className="flex flex-wrap gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Main (240x240)</label>
                    <div className="w-32 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-indigo-100 flex items-center justify-center p-4">
                      {lineAssets.main ? <img src={lineAssets.main} className="max-w-full max-h-full object-contain" /> : <Loader2 className="animate-spin text-indigo-200" />}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tab (96x74)</label>
                    <div className="w-32 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-indigo-100 flex items-center justify-center p-4">
                      {lineAssets.tab ? <img src={lineAssets.tab} className="w-[96px] h-[74px] object-contain" /> : <Loader2 className="animate-spin text-indigo-200" />}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {prompts.map((p, idx) => (
                <div key={p.id} className="bg-white border rounded-[2rem] p-5 transition-all group relative">
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs z-10 shadow-lg">
                    {idx + 1}
                  </div>
                  <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden relative border border-slate-100">
                    {p.status === 'done' ? (
                      <div className="w-full h-full p-2 bg-slate-200/20">
                        <img src={p.processedImage} className="w-full h-full object-contain drop-shadow-xl" alt={p.keyword} />
                        <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1 text-white shadow-lg animate-in zoom-in duration-300">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    ) : p.status === 'generating' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50/50">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      </div>
                    ) : (
                      <button 
                        onClick={() => generateOne(p.id, idx)}
                        disabled={isBatchGenerating}
                        className="w-full h-full flex flex-col items-center justify-center group-hover:bg-slate-100 transition-colors disabled:opacity-30"
                      >
                        <Wand2 className="w-6 h-6 text-slate-200 group-hover:text-indigo-400 mb-2" />
                        <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-300">生成貼圖</span>
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

            {isAllDone && (
              <div className="mt-16 bg-emerald-50 border border-emerald-100 p-10 rounded-[3rem] text-center max-w-2xl mx-auto shadow-xl">
                <div className="inline-flex bg-emerald-500 text-white p-4 rounded-3xl mb-6 shadow-xl shadow-emerald-200"><CheckSquare size={40} /></div>
                <h3 className="text-2xl font-black text-emerald-900 mb-2">全套模式完成！</h3>
                <button 
                  onClick={handleExportZip}
                  className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-3 mx-auto"
                >
                  <Download className="w-6 h-6" /> 下載全套 LINE 貼圖
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
