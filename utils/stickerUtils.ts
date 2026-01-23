
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
 * 核心文字疊加引擎：支援自動縮放以符合畫布寬度
 * 適用於貼圖本體、Main.png 與 Tab.png
 */
export const addTextToImage = (base64: string, text: string, style: TextStyleConfig): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Context error");

      ctx.drawImage(img, 0, 0);

      // 設定字體：優先使用使用者選取的字體系列，並強制加粗以求可愛與清晰
      const fontName = style.fontFamily === 'cursive' ? '"Arial Rounded MT Bold", cursive' : style.fontFamily;
      
      // 根據畫布寬度計算初始字級 (大約寬度的 1/3)
      let fontSize = Math.floor(canvas.width / 3.2);
      // 針對極小尺寸 (如 Tab 96px) 調整最小比例
      if (canvas.width < 100) fontSize = Math.floor(canvas.width / 2.5);

      const padding = canvas.width * 0.08; 
      const maxWidth = canvas.width - padding;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      // 自適應縮放迴圈
      const applyStyle = () => {
        ctx.font = `900 ${fontSize}px ${fontName}`;
        const metrics = ctx.measureText(text);
        if (metrics.width > maxWidth && fontSize > 10) {
          fontSize -= 1;
          applyStyle();
        }
      };
      
      applyStyle();

      const x = canvas.width / 2;
      const y = canvas.height - (canvas.height * 0.03);

      // 1. 繪製描邊 (固定白色描邊或選定描邊)
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = Math.max(2, style.strokeWidth * (canvas.width / 300)); 
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);

      // 2. 繪製填色
      ctx.fillStyle = style.color;
      ctx.fillText(text, x, y);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject("Text overlay failed");
    img.src = base64;
  });
};

/**
 * 產出符合 LINE 偶數尺寸規範的資產 (透明背景)
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
      if (finalW % 2 !== 0) finalW -= 1;
      if (finalH % 2 !== 0) finalH -= 1;

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
 * 產出固定尺寸並疊加標題文字的資產 (用於 Main/Tab)
 */
export const createFixedSizeAssetWithText = async (
  base64: string, 
  targetW: number, 
  targetH: number, 
  text: string, 
  style: TextStyleConfig
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Canvas context error");

      ctx.clearRect(0, 0, targetW, targetH);

      const ratio = Math.min(targetW / img.width, targetH / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const x = (targetW - drawW) / 2;
      const y = (targetH - drawH) / 2;

      ctx.drawImage(img, x, y, drawW, drawH);
      
      // 在固定尺寸畫布上疊加文字
      const withText = await addTextToImage(canvas.toDataURL('image/png'), text, style);
      resolve(withText);
    };
    img.onerror = () => reject("Asset creation error");
    img.src = base64;
  });
};
