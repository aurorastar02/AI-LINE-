
import { TextStyleConfig } from '../types';
import { checkTransparency, removeGreenBackground, formatStickerForLine, createFixedSizeAsset, addTextToImage } from './stickerUtils';

/**
 * 智慧影像處理流水線 (Smart Pipeline)
 */
export const smartFormat = async (base64: string, text?: string, textStyle?: TextStyleConfig) => {
  try {
    const isAlreadyTransparent = await checkTransparency(base64);
    let workingImg = base64;
    
    // 1. 去背
    if (!isAlreadyTransparent) {
      workingImg = await removeGreenBackground(base64);
    }

    // 2. 文字疊加 (如果提供了文字與樣式)
    if (text && textStyle) {
      workingImg = await addTextToImage(workingImg, text, textStyle);
    }

    // 3. 規格化
    const result = await formatStickerForLine(workingImg, {
      maxW: 370,
      maxH: 320,
      margin: 10
    });

    return result.dataUrl;
  } catch (error) {
    console.error("Smart Format Error:", error);
    throw error;
  }
};

/**
 * 自動產出 LINE 系統必要資產
 */
export const autoDeriveLineAssets = async (firstStickerDataUrl: string) => {
  try {
    const main = await createFixedSizeAsset(firstStickerDataUrl, 240, 240);
    const tab = await createFixedSizeAsset(firstStickerDataUrl, 96, 74);
    return { main, tab };
  } catch (error) {
    console.error("Auto Derive Assets Error:", error);
    throw error;
  }
};
