
import { GoogleGenAI } from "@google/genai";
import { CharacterConfig, GenerationMode } from "../types";

/**
 * 動態獲取 API Key
 */
export const getActiveApiKey = () => {
  const manualKey = localStorage.getItem('user_gemini_api_key');
  if (manualKey && manualKey.trim() !== '') {
    return { key: manualKey.trim(), source: 'manual' as const };
  }
  return { key: process.env.API_KEY || '', source: 'system' as const };
};

const getAIClient = () => {
  const { key } = getActiveApiKey();
  return new GoogleGenAI({ apiKey: key });
};

/**
 * 組合指令引擎：整合 Global Anatomy Guard、防止多手咒語與禁畫文字指令
 */
export const buildPrompt = (character: CharacterConfig, action: string, mode: GenerationMode = 'fine'): string => {
  // 終極肢體防護碼 (Global Anatomy Guard)
  const anatomyGuard = "strictly two arms and two legs, exactly two paws visible, anatomically correct limbs, no extra hands, no duplicated arms, single character.";
  
  // 禁畫文字指令 (No-Text Policy) - 避免模型在圖片中畫出錯誤文字
  const noTextGuard = "absolutely no text, no letters, no words, no written characters, no alphabet, no symbols, clean illustration without any writing.";

  // 背景與邊框規範
  const visualSpecs = "thick white border, solid pure green background (RGB 0, 255, 0), chroma key style, isolated.";

  // 針對特定動作的肢體校正咒語
  let actionModifier = action;
  const lowercaseAction = action.toLowerCase();
  
  if (lowercaseAction.includes("hands") || lowercaseAction.includes("holding") || lowercaseAction.includes("carrying")) {
    // 強迫 AI 計算肢體總數：雙手持物
    actionModifier += ", holding the object with BOTH hands clearly visible to ensure limb count.";
  } else if (lowercaseAction.includes("waving") || lowercaseAction.includes("thumbs up") || lowercaseAction.includes("salute") || lowercaseAction.includes("pointing")) {
    // 強迫 AI 計算肢體總數：一手動作，另一手在後
    actionModifier += ", performing the action with one hand while the OTHER hand is strictly behind back.";
  }

  let stylePrompt = "";
  if (mode === 'fine') {
    stylePrompt = "Professional sticker design, high quality, clean sharp edges, thick black outlines, flat colors, cute chibi proportions, 2D vector style.";
  } else {
    stylePrompt = "Messy hand-drawn doodle, shaky brushstrokes, distorted funny facial features, surreal humor, bold black outlines, intentionally ugly-cute.";
  }

  // 最終組合：物種 + 特徵 + 穿著 + 動作(含防護) + 風格 + 肢體防護 + 禁字防護 + 視覺規格
  return `A ${character.species}, ${character.features}, wearing ${character.clothing}. ${actionModifier}. ${stylePrompt} ${anatomyGuard} ${noTextGuard} ${visualSpecs}`;
};

export const generateStickerImage = async (prompt: string, referenceImage?: string): Promise<string> => {
  const ai = getAIClient();
  const contents: any = {
    parts: [{ text: prompt }]
  };

  if (referenceImage) {
    const base64Data = referenceImage.split(',')[1];
    contents.parts.unshift({
      inlineData: { data: base64Data, mimeType: 'image/png' }
    });
    // 再次強調一致性與肢體約束
    contents.parts.push({ text: "Maintain strict visual consistency with this reference character. Keep same species, colors, and strictly 2 arms, 2 legs. Do not add any text to the image." });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents,
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!part || !part.inlineData) throw new Error("Image generation failed");
    
    return `data:image/png;base64,${part.inlineData.data}`;
  } catch (error: any) {
    const errorMsg = error.message || "";
    if (errorMsg.includes("API key not valid") || errorMsg.includes("401")) {
      throw new Error("API_KEY_INVALID");
    }
    if (errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("limit")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw error;
  }
};
