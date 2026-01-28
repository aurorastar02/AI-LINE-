
import { GoogleGenAI } from "@google/genai";
import { CharacterConfig, GenerationMode } from "../types";

/**
 * 動態獲取 API Key
 * 優先序：localStorage (非空) > process.env.API_KEY
 */
export const getActiveApiKey = () => {
  const manualKey = localStorage.getItem('user_gemini_api_key');
  if (manualKey && manualKey.trim() !== '') {
    return { key: manualKey.trim(), source: 'manual' as const };
  }
  return { key: process.env.API_KEY || '', source: 'system' as const };
};

/**
 * 內部使用的初始化方法，確保每次呼叫都是最新的 Key
 */
const getAIClient = () => {
  const { key } = getActiveApiKey();
  return new GoogleGenAI({ apiKey: key });
};

/**
 * 組合指令引擎：根據模式切換風格
 */
export const buildPrompt = (character: CharacterConfig, action: string, mode: GenerationMode = 'fine'): string => {
  const commonKeywords = "isolated on a solid pure GREEN background (RGB 0, 255, 0), chroma key style, no shadows, no text, 2d simple illustration.";
  
  let stylePrompt = "";
  if (mode === 'fine') {
    stylePrompt = "Sticker style, high quality, professional character design, clean sharp edges, thick black outlines, flat colors, cute and polished appearance.";
  } else {
    // 使用使用者提供的「魔性崩壞」核心風格基礎
    stylePrompt = "Sticker style, messy hand-drawn doodle, shaky brushstrokes, intentionally distorted facial features, asymmetric eyes, surreal humor, thick bold black outlines, solid WHITE border (5px).";
  }

  return `A ${character.species}, ${character.features}, wearing ${character.clothing}, ${action}. The art style is ${character.style}. Visual properties: ${stylePrompt} ${commonKeywords}`;
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
    contents.parts.push({ text: "Maintain strict visual consistency with this character's identity while applying the specified art style. Ensure the background remains pure green (RGB 0,255,0)." });
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
