
import { useState, useCallback } from 'react';
import { checkTransparency, removeWhiteBackground, formatStickerForLine } from '../utils/stickerUtils';

export const useStickerProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processSticker = useCallback(async (base64: string) => {
    setIsProcessing(true);
    try {
      // 1. 智慧影像過濾器
      const hasAlpha = await checkTransparency(base64);
      let workingBase64 = base64;

      if (!hasAlpha) {
        console.log("偵測到不透明背景，執行基礎色度去背...");
        workingBase64 = await removeWhiteBackground(base64);
      }

      // 2. 自動規格校正器
      const result = await formatStickerForLine(workingBase64);
      return result;
    } catch (err) {
      console.error("處理貼圖失敗:", err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processSticker, isProcessing };
};
