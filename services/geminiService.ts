
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
 * 組合指令引擎：整合 Global Anatomy Guard 與防止多手咒語
 */
export const buildPrompt = (character: CharacterConfig, action: string, mode: GenerationMode = 'fine'): string => {
  // 球通用：肢體防護基礎權重 (Global Anatomy Guard)
  const anatomyGuard = "strictly two arms and two legs, exactly two paws visible, anatomically correct limbs, no extra hands, single character, thick white border, solid green background (RGB 0, 255, 0).";

  // 針對特定動作的肢體校正咒語 (Ultimate Spell)
  let actionModifier = action;
  const lowercaseAction = action.toLowerCase();
  
  if (lowercaseAction.includes("hands") || lowercaseAction.includes("holding")) {
    // 當需要雙手持物時，強制改為「雙手持牌」概念以穩定數量
    actionModifier += ", holding a sign with both hands to ensure limb count.";
  } else if (lowercaseAction.includes("waving") || lowercaseAction.includes("thumbs up") || lowercaseAction.includes("salute")) {
    // 當需要單手動作時，強制另一手在背後或垂下
    actionModifier += ", with one hand performing the action and the other hand strictly behind back or at side.";
  }

  let stylePrompt = "";
  if (mode === 'fine') {
    stylePrompt = "Professional sticker design, high quality, clean sharp edges, thick black outlines, flat colors, cute chibi proportions.";
  } else {
    stylePrompt = "Messy hand-drawn doodle, shaky brushstrokes, distorted funny facial features, surreal humor, bold black outlines.";
  }

  return `A ${character.species}, ${character.features}, wearing ${character.clothing}. ${actionModifier}. Style: ${character.style}. ${stylePrompt} ${anatomyGuard}`;
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
    contents.parts.push({ text: "Maintain strict visual consistency with this reference character. Keep same species, colors, and limb count (strictly 2 arms, 2 legs)." });
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
