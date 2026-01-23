
import { useState, useCallback } from 'react';
import { smartFormat } from '../utils/StickerProcessor';

export const useStickerProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processSticker = useCallback(async (base64: string) => {
    setIsProcessing(true);
    try {
      // 調用整合後的智慧處理流水線
      const dataUrl = await smartFormat(base64);
      return { dataUrl };
    } catch (err) {
      console.error("處理貼圖失敗:", err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processSticker, isProcessing };
};
