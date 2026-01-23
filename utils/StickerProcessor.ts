
import { checkTransparency, removeGreenBackground, formatStickerForLine, createFixedSizeAsset } from './stickerUtils';

/**
 * 智慧影像處理流水線 (Smart Pipeline)
 */
export const smartFormat = async (base64: string) => {
  try {
    const isAlreadyTransparent = await checkTransparency(base64);
    let workingImg = base64;
    
    if (!isAlreadyTransparent) {
      workingImg = await removeGreenBackground(base64);
    }

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
 * @param firstStickerDataUrl 第一張處理後的貼圖 Base64
 * @returns { main: string, tab: string }
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
