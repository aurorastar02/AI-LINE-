
/**
 * 專業 LINE 貼圖處理工具 (純規格化版本)
 */

export interface ProcessedSticker {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * 檢查圖片是否包含透明像素
 * @param imageSrc 圖片的 Base64 字串或 URL
 * @returns Promise<boolean> 如果有透明像素回傳 true，否則回傳 false
 */
export const isImageTransparent = (imageSrc: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('無法建立 Canvas Context');
        return;
      }
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
 * 處理圖片以符合 LINE 規範：
 * 1. 自動偵測並裁切物體邊緣 (Trim)
 * 2. 強制寬高為偶數 (LINE 規定)
 * 3. 縮放至最大 370x320
 * 4. 加入 10px 安全邊距
 */
export const processStickerImage = async (
  base64: string,
  config = { maxW: 370, maxH: 320, margin: 10 }
): Promise<ProcessedSticker> => {
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

      // 尋找物體邊界 (基於 Alpha 通道)
      let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
      let foundContent = false;

      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const idx = (y * img.width + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 0) {
            foundContent = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // 如果沒找到透明區域（整張不透明），則不裁切直接使用原圖大小
      if (!foundContent) {
        minX = 0; minY = 0; maxX = img.width - 1; maxY = img.height - 1;
      }

      const contentW = maxX - minX + 1;
      const contentH = maxY - minY + 1;

      // 計算符合 LINE 規範的尺寸
      let finalW = Math.min(contentW + config.margin * 2, config.maxW);
      let finalH = Math.min(contentH + config.margin * 2, config.maxH);

      // 強制偶數
      if (finalW % 2 !== 0) finalW -= 1;
      if (finalH % 2 !== 0) finalH -= 1;

      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Final canvas context error");

      const safeW = finalW - config.margin * 2;
      const safeH = finalH - config.margin * 2;
      const scale = Math.min(safeW / contentW, safeH / contentH);

      const drawW = contentW * scale;
      const drawH = contentH * scale;
      const drawX = (finalW - drawW) / 2;
      const drawY = (finalH - drawH) / 2;

      ctx.drawImage(tempCanvas, minX, minY, contentW, contentH, drawX, drawY, drawW, drawH);

      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: finalW,
        height: finalH
      });
    };
    img.onerror = () => reject("Image load error");
    img.src = base64;
  });
};

export const createLineSpecialImage = async (
  sourceBase64: string,
  w: number,
  h: number
): Promise<string> => {
  const processed = await processStickerImage(sourceBase64, {
    maxW: w,
    maxH: h,
    margin: Math.floor(w * 0.1)
  });
  return processed.dataUrl;
};
