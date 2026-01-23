
import { TextStyleConfig } from '../types';
import { 
  isImageTransparent, 
  removeGreenBackground, 
  formatStickerForLine, 
  createFixedSizeAssetWithText, 
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
      sticker = await addTextToImage(cleanSource, text, textStyle);
    }

    return { sticker, cleanSource };
  } catch (error) {
    console.error("Smart Format Error:", error);
    throw error;
  }
};

/**
 * 自動產出 LINE 系統必要資產 (Main: 240x240, Tab: 96x74)
 * @param cleanSourceDataUrl 去背後的乾淨底圖 (不含劇本文字)
 * @param title 貼圖系列名稱
 * @param style 選定的文字樣式
 */
export const autoDeriveLineAssets = async (cleanSourceDataUrl: string, title: string, style: TextStyleConfig) => {
  try {
    const main = await createFixedSizeAssetWithText(cleanSourceDataUrl, 240, 240, title, style);
    const tab = await createFixedSizeAssetWithText(cleanSourceDataUrl, 96, 74, title, style);
    return { main, tab };
  } catch (error) {
    console.error("Auto Derive Assets Error:", error);
    throw error;
  }
};
