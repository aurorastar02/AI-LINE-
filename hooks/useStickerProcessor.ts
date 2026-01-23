
import { useState, useCallback } from 'react';
import { processStickerImage, ProcessedSticker } from '../utils/imageUtils';

interface UseStickerProcessorReturn {
  process: (base64: string) => Promise<ProcessedSticker | null>;
  isProcessing: boolean;
  error: string | null;
}

/**
 * 專為 LINE 貼圖設計的影像處理 Hook
 */
export const useStickerProcessor = (): UseStickerProcessorReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(async (base64: string): Promise<ProcessedSticker | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await processStickerImage(base64);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { process, isProcessing, error };
};
