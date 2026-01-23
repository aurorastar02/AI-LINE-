
import { GoogleGenAI, Type } from "@google/genai";
import { CharacterConfig, StickerPrompt } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SCENARIO_LIST = [
  { k: "打招呼", v: "Waving hand cheerfully with a big smile" },
  { k: "謝謝", v: "Bowing deeply and holding a small red heart" },
  { k: "OK", v: "Making an 'OK' sign with hands" },
  { k: "大哭", v: "Crying with exaggerated waterfall-like tears" },
  { k: "生氣", v: "Pouting with steam coming out of ears" },
  { k: "趕工中", v: "Typing furiously on a laptop with a sweat drop" },
  { k: "+1", v: "Holding a sign board that says '+1'" },
  { k: "收到", v: "Giving a big thumbs up" },
  { k: "大笑", v: "Rolling on the floor laughing" },
  { k: "晚安", v: "Holding a soft pillow and yawning" }
  // ... 其他情境可視需求擴充
];

/**
 * 劇本引擎：將角色設定轉化為 40 組 (或指定數量) 的生成指令
 */
export const generateScenarioPrompts = (character: CharacterConfig, scenarios = SCENARIO_LIST): StickerPrompt[] => {
  const timestamp = Date.now();
  const techKeywords = "Sticker style, isolated on white background, die-cut, white border, thick outlines, flat colors, no text, 2d illustration.";

  return scenarios.map((item, index) => {
    const visualDescription = `A ${character.style} ${character.species}, ${character.features}, wearing ${character.clothing}, ${item.v}. ${techKeywords}`;
    
    return {
      id: `sticker-${timestamp}-${index}`,
      keyword: item.k,
      visualDescription: visualDescription,
      status: 'pending'
    };
  });
};

export const generateStickerImage = async (prompt: string, referenceImage?: string): Promise<string> => {
  const ai = getAI();
  const contents: any = {
    parts: [{ text: `${prompt}, high quality professional sticker.` }]
  };

  if (referenceImage) {
    const base64Data = referenceImage.split(',')[1];
    contents.parts.unshift({
      inlineData: { data: base64Data, mimeType: 'image/png' }
    });
    contents.parts.push({ text: "STRICT CONSISTENCY: Maintain exactly the same colors, features, and clothing as this reference character." });
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
