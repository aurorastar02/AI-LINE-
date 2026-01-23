
import { TextStyleConfig } from '../types';

/**
 * LINE 貼圖規格工具組 - 專業資產產出版
 */

/**
 * 檢查圖片是否包含透明像素
 */
export const checkTransparency = (imageSrc: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('無法建立 Canvas Context');

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) {
          resolve(true); 
          return;
        }
      }
      resolve(false);
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};

/**
 * 綠幕去背工具：將純綠色背景轉為透明 (Chroma Key)
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
        if (g > 150 && g > r * 1.4 && g > b * 1.4) {
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
 * 文字疊加工具：在圖片下方添加超大描邊文字，並具備寬度檢查功能
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

      // 設定初始大字體 (約圖片寬度的 1/3.5)
      let fontSize = Math.floor(img.width / 3.5);
      const maxWidth = img.width * 0.92; // 預留邊距
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      // 動態縮放邏輯：如果文字太寬，自動縮小字體直到符合寬度
      const adjustFont = () => {
        ctx.font = `900 ${fontSize}px ${style.fontFamily}`;
        const metrics = ctx.measureText(text);
        if (metrics.width > maxWidth && fontSize > 20) {
          fontSize -= 2;
          adjustFont();
        }
      };
      
      adjustFont();

      const x = img.width / 2;
      const y = img.height - (img.height * 0.03); // 略微貼近底部

      // 1. 先繪製描邊 (Stroke)
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth * (img.width / 300); 
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);

      // 2. 再繪製填色 (Fill)
      ctx.fillStyle = style.color;
      ctx.fillText(text, x, y);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject("Image load error for text");
    img.src = base64;
  });
};

/**
 * 自動規格校正器：處理貼圖本體 (01.png - 40.png)
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
 * 產出固定尺寸資產 (Main: 240x240, Tab: 96x74)
 */
export const createFixedSizeAsset = (base64: string, targetW: number, targetH: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
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
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject("Asset creation error");
    img.src = base64;
  });
};
