
import { TextStyleConfig } from '../types';

/**
 * 檢查圖片是否已經具備透明背景
 */
export const isImageTransparent = (imageSrc: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(false); return; }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const points = [
        [0, 0], [img.width - 1, 0], 
        [0, img.height - 1], [img.width - 1, img.height - 1],
        [Math.floor(img.width / 2), 0]
      ];
      
      const isTransparent = points.some(([x, y]) => {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        return pixel[3] < 200; 
      });
      
      resolve(isTransparent);
    };
    img.onerror = () => resolve(false);
    img.src = imageSrc;
  });
};

/**
 * 綠幕去背工具
 */
export const removeGreenBackground = (imageSrc: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas Error');

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (g > 140 && g > r * 1.3 && g > b * 1.3) {
          data[i + 3] = 0; 
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
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
  let fontSize = customFontSize || Math.floor(canvas.width / 3.5);
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

  // 1. 繪製描邊 (同步樣式設定)
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = Math.max(2, style.strokeWidth * (canvas.width / 300)); 
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);

  // 2. 繪製填色
  ctx.fillStyle = style.color;
  ctx.fillText(text, x, y);

  return canvas.toDataURL('image/png');
};

/**
 * 規格化貼圖為 LINE 規定格式
 */
export const formatStickerForLine = async (
  base64: string,
  config = { maxW: 370, maxH: 320, margin: 10 }
): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) return reject("Canvas context error");

      tempCtx.drawImage(img, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
      let foundContent = false;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const idx = (y * img.width + x) * 4;
          if (data[idx + 3] > 10) { 
            foundContent = true;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (!foundContent) {
        minX = 0; minY = 0; maxX = img.width - 1; maxY = img.height - 1;
      }

      const contentW = maxX - minX + 1;
      const contentH = maxY - minY + 1;

      let targetW = contentW + config.margin * 2;
      let targetH = contentH + config.margin * 2;

      const ratio = Math.min(config.maxW / targetW, config.maxH / targetH, 1);
      let finalW = Math.floor(targetW * ratio);
      let finalH = Math.floor(targetH * ratio);

      // 強制偶數尺寸 (LINE 規範)
      finalW = Math.floor(finalW / 2) * 2;
      finalH = Math.floor(finalH / 2) * 2;

      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Context error");

      const drawMargin = config.margin * ratio;
      const drawW = finalW - drawMargin * 2;
      const drawH = finalH - drawMargin * 2;
      const drawX = (finalW - drawW) / 2;
      const drawY = (finalH - drawH) / 2;

      ctx.drawImage(tempCanvas, minX, minY, contentW, contentH, drawX, drawY, drawW, drawH);

      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: finalW,
        height: finalH
      });
    };
    img.src = base64;
  });
};

/**
 * 實作 formatLineAssets：生成 Main (240x240) 與 Tab (96x74)
 * 強制偶數、透明背景、保留邊距與系列名稱疊加
 */
export const formatLineAssets = async (
  cleanSource: string, 
  title: string, 
  style: TextStyleConfig
): Promise<{ main: string; tab: string }> => {
  const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

  const sourceImg = await loadImage(cleanSource);

  const createAsset = (targetW: number, targetH: number, margin: number): string => {
    const canvas = document.createElement('canvas');
    // 強制規格化為偶數
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
    
    // 疊加系列名稱文字
    return addTextToImage(canvas, title, style, targetW === 96 ? 24 : undefined);
  };

  return {
    main: createAsset(240, 240, 10),
    tab: createAsset(96, 74, 5)
  };
};
