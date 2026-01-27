
import { TextStyleConfig } from '../types';
import { 
  isImageTransparent, 
  removeGreenBackground, 
  formatStickerForLine, 
  formatLineAssets, 
  addTextToImage 
} from './stickerUtils';

/**
 * 智慧影像處理流水線 (Smart Pipeline)
 * 回傳：{ sticker: 最終貼圖, cleanSource: 去背後但未加字的底圖 }
 */
export const smartFormat = async (base64: string, text?: string, textStyle?: TextStyleConfig) => {
  try {
    console.log("Starting Smart Format...");
    
    // 1. 透明度檢查
    const alreadyTransparent = await isImageTransparent(base64);
    let workingImg = base64;
    
    // 2. 綠幕去背
    if (!alreadyTransparent) {
      console.log("Detected background, removing green...");
      workingImg = await removeGreenBackground(base64);
    }

    // 3. 規格化第一階段：裁切透明底圖
    console.log("Normalizing for LINE specs...");
    const cleanResult = await formatStickerForLine(workingImg, {
      maxW: 370,
      maxH: 320,
      margin: 10
    });
    const cleanSource = cleanResult.dataUrl;

    // 4. 文字疊加
    let sticker = cleanSource;
    if (text && textStyle) {
      console.log("Adding text overlay:", text);
      const canvas = document.createElement('canvas');
      canvas.width = cleanResult.width;
      canvas.height = cleanResult.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 等待底圖載入完成再畫
        const img = new Image();
        img.src = cleanSource;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        ctx.drawImage(img, 0, 0);
        sticker = addTextToImage(canvas, text, textStyle);
      }
    }

    console.log("Smart Format Complete.");
    return { sticker, cleanSource };
  } catch (error) {
    console.error("Smart Format Pipeline Crashed:", error);
    throw error;
  }
};

/**
 * 自動產出 LINE 系統必要資產
 */
export const autoDeriveLineAssets = async (cleanSourceDataUrl: string, title: string, style: TextStyleConfig) => {
  try {
    return await formatLineAssets(cleanSourceDataUrl, title, style);
  } catch (error) {
    console.error("Auto Derive Assets Error:", error);
    throw error;
  }
};
