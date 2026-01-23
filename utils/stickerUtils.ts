
/**
 * LINE 貼圖規格工具組 - 綠幕專業版
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
 * 解決白色細節遺失與白邊問題。
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

      // 綠幕去背邏輯
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 判斷是否為「顯著的綠色」(G 分量遠大於 R 和 B)
        // 使用一個容差範圍來處理 AI 生成可能不完全是 0,255,0 的情況
        if (g > 150 && g > r * 1.4 && g > b * 1.4) {
          data[i + 3] = 0; // 設為透明
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
 * 自動規格校正器 (formatStickerForLine)
 * 1. 符合 370x320 限制
 * 2. 強制偶數尺寸
 * 3. 確保 10px 透明留白
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
          if (data[idx + 3] > 10) { // 有感的透明度才算內容
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
