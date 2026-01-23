
import { useState, useCallback } from 'react';
import { smartFormat } from '../utils/StickerProcessor';
import { TextStyleConfig } from '../types';

export const useStickerProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processSticker = useCallback(async (base64: string, text?: string, textStyle?: TextStyleConfig) => {
    setIsProcessing(true);
    try {
      // 調用整合後的智慧處理流水線，加入文字處理
      const dataUrl = await smartFormat(base64, text, textStyle);
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
