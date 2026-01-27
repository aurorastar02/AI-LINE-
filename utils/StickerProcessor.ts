
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
    // 1. 透明度檢查
    const alreadyTransparent = await isImageTransparent(base64);
    let workingImg = base64;
    
    // 2. 綠幕去背
    if (!alreadyTransparent) {
      workingImg = await removeGreenBackground(base64);
    }

    // 3. 規格化第一階段：先裁切出乾淨的透明底圖 (不含字)
    const cleanResult = await formatStickerForLine(workingImg, {
      maxW: 370,
      maxH: 320,
      margin: 10
    });
    const cleanSource = cleanResult.dataUrl;

    // 4. 文字疊加：在裁切好的底圖上疊加文字
    let sticker = cleanSource;
    if (text && textStyle) {
      const img = new Image();
      img.src = cleanSource;
      await new Promise(r => img.onload = r);
      
      const canvas = document.createElement('canvas');
      canvas.width = cleanResult.width;
      canvas.height = cleanResult.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      sticker = addTextToImage(canvas, text, textStyle);
    }

    return { sticker, cleanSource };
  } catch (error) {
    console.error("Smart Format Error:", error);
    throw error;
  }
};

/**
 * 自動產出 LINE 系統必要資產 (Main: 240x240, Tab: 96x74)
 * 使用優化後的 formatLineAssets 進行本地生成，停止依賴 API
 */
export const autoDeriveLineAssets = async (cleanSourceDataUrl: string, title: string, style: TextStyleConfig) => {
  try {
    return await formatLineAssets(cleanSourceDataUrl, title, style);
  } catch (error) {
    console.error("Auto Derive Assets Error:", error);
    throw error;
  }
};
