
import { TextStyleConfig } from '../types';

/**
 * 輔助函式：安全載入圖片並處理 CORS
 */
const safeLoadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 只有非 Base64 的 URL 才需要 crossOrigin
    if (!src.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`圖片載入失敗: ${src.substring(0, 50)}...`));
    img.src = src;
  });
};

/**
 * 檢查圖片是否已經具備透明背景 (優化採樣點)
 */
export const isImageTransparent = async (imageSrc: string): Promise<boolean> => {
  try {
    const img = await safeLoadImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    // 檢查四角與中心點
    const points = [
      [2, 2], [img.width - 3, 2], 
      [2, img.height - 3], [img.width - 3, img.height - 3],
      [Math.floor(img.width / 2), Math.floor(img.height / 2)]
    ];
    
    return points.some(([x, y]) => {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return pixel[3] < 250; // Alpha 小於 250 即視為透明
    });
  } catch (e) {
    console.error("Transparency check failed:", e);
    return false;
  }
};

/**
 * 綠幕去背工具 (優化色差容許度)
 */
export const removeGreenBackground = async (imageSrc: string): Promise<string> => {
  const img = await safeLoadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas Context Error');

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 綠幕移除演算法：檢查綠色比例
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // 只要 G 值明顯高於 R 和 B，就判定為綠幕
    if (g > 100 && g > r * 1.2 && g > b * 1.2) {
      data[i + 3] = 0; 
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * 核心文字疊加引擎
 */
export const addTextToImage = (
  canvas: HTMLCanvasElement, 
  text: string, 
  style: TextStyleConfig,
  customFontSize?: number
): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const fontName = style.fontFamily === 'cursive' ? '"Arial Rounded MT Bold", cursive' : style.fontFamily;
  let fontSize = customFontSize || Math.floor(canvas.width / 4);
  const padding = canvas.width * 0.1;
  const maxWidth = canvas.width - padding;
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  const applyStyle = () => {
    ctx.font = `900 ${fontSize}px ${fontName}`;
    const metrics = ctx.measureText(text);
    if (metrics.width > maxWidth && fontSize > 8) {
      fontSize -= 1;
      applyStyle();
    }
  };
  
  applyStyle();

  const x = canvas.width / 2;
  const y = canvas.height - (canvas.height * 0.05);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(3, Math.min(5, canvas.width / 60)); 
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);

  ctx.fillStyle = style.color;
  ctx.fillText(text, x, y);

  return canvas.toDataURL('image/png');
};

/**
 * 規格化貼圖為 LINE 規定格式 (強制偶數尺寸)
 */
export const formatStickerForLine = async (
  base64: string,
  config = { maxW: 370, maxH: 320, margin: 10 }
): Promise<{ dataUrl: string; width: number; height: number }> => {
  const img = await safeLoadImage(base64);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) throw new Error("Canvas context error");

  tempCtx.drawImage(img, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  // 尋找內容邊界
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
  let foundContent = false;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const idx = (y * img.width + x) * 4;
      if (data[idx + 3] > 15) { // Alpha 門檻
        foundContent = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // 預防萬一：若完全沒內容則使用全圖
  if (!foundContent || maxX <= minX || maxY <= minY) {
    minX = 0; minY = 0; maxX = img.width - 1; maxY = img.height - 1;
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const targetW = contentW + config.margin * 2;
  const targetH = contentH + config.margin * 2;

  const ratio = Math.min(config.maxW / targetW, config.maxH / targetH, 1);
  
  // 強制偶數且至少為 2
  let finalW = Math.max(2, Math.floor((targetW * ratio) / 2) * 2);
  let finalH = Math.max(2, Math.floor((targetH * ratio) / 2) * 2);

  const canvas = document.createElement('canvas');
  canvas.width = finalW;
  canvas.height = finalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Context error");

  const drawMargin = config.margin * ratio;
  const drawW = finalW - drawMargin * 2;
  const drawH = finalH - drawMargin * 2;
  const drawX = (finalW - drawW) / 2;
  const drawY = (finalH - drawH) / 2;

  ctx.drawImage(tempCanvas, minX, minY, contentW, contentH, drawX, drawY, drawW, drawH);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: finalW,
    height: finalH
  };
};

/**
 * 實作 formatLineAssets：生成 Main (240x240) 與 Tab (96x74)
 */
export const formatLineAssets = async (
  cleanSource: string, 
  seriesTitle: string, 
  style: TextStyleConfig
): Promise<{ main: string; tab: string }> => {
  const sourceImg = await safeLoadImage(cleanSource);

  const createAsset = (targetW: number, targetH: number, margin: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(targetW / 2) * 2;
    canvas.height = Math.floor(targetH / 2) * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return "";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const availableW = canvas.width - (margin * 2);
    const availableH = canvas.height - (margin * 2);
    const scale = Math.min(availableW / sourceImg.width, availableH / sourceImg.height);
    
    const drawW = sourceImg.width * scale;
    const drawH = sourceImg.height * scale;
    const x = (canvas.width - drawW) / 2;
    const y = (canvas.height - drawH) / 2;

    ctx.drawImage(sourceImg, x, y, drawW, drawH);
    
    const fontSize = targetW === 96 ? 20 : Math.floor(canvas.width / 5);
    return addTextToImage(canvas, seriesTitle, style, fontSize);
  };

  return {
    main: createAsset(240, 240, 10),
    tab: createAsset(96, 74, 5)
  };
};
