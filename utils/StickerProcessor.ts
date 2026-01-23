
import { checkTransparency, removeGreenBackground, formatStickerForLine } from './stickerUtils';

/**
 * 智慧影像處理流水線 (Smart Pipeline) - 綠幕去背版
 * 解決去背白邊問題並確保 100% 符合 LINE 規範
 */
export const smartFormat = async (base64: string) => {
  try {
    // 1. 智慧影像過濾：檢測是否已經有透明層
    const isAlreadyTransparent = await checkTransparency(base64);
    
    let workingImg = base64;
    
    if (!isAlreadyTransparent) {
      console.log("偵測到不透明背景，執行智慧綠幕去背 (Chroma Key)...");
      // 根據使用者規範，AI 會生成純綠背景，我們在此移除它
      workingImg = await removeGreenBackground(base64);
    } else {
      console.log("偵測到已有透明層，跳過處理以維持邊緣品質。");
    }

    // 2. 自動規格校正：強制執行 LINE 官方標準 (偶數寬高 + 10px 留白)
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
