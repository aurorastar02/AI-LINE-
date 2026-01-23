
import { GoogleGenAI } from "@google/genai";
import { CharacterConfig, StickerPrompt } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * 組合指令引擎：將角色設定與單一情境結合成圖像生成指令
 * 依照使用者最新規範：強制使用純綠色背景 (RGB 0, 255, 0) 以利精準去背
 */
export const buildPrompt = (character: CharacterConfig, action: string): string => {
  const techKeywords = "Sticker style, isolated on a solid bright green background (RGB 0, 255, 0), chroma key style, high contrast, no shadows on background, clean sharp edges, thick black outlines, flat colors, no text, 2d simple vector illustration, high quality, professional character design.";
  return `A ${character.style} ${character.species}, ${character.features}, wearing ${character.clothing}, ${action}. ${techKeywords}`;
};

export const generateStickerImage = async (prompt: string, referenceImage?: string): Promise<string> => {
  const ai = getAI();
  const contents: any = {
    parts: [{ text: prompt }]
  };

  if (referenceImage) {
    const base64Data = referenceImage.split(',')[1];
    contents.parts.unshift({
      inlineData: { data: base64Data, mimeType: 'image/png' }
    });
    contents.parts.push({ text: "Maintain strict visual consistency with this character's features, colors, and clothing. Ensure the character is placed against the pure green background." });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents,
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part || !part.inlineData) throw new Error("Image generation failed");
  
  return `data:image/png;base64,${part.inlineData.data}`;
};
