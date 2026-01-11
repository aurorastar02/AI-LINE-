
import { GoogleGenAI, Type } from "@google/genai";
import { CharacterConfig, StickerPrompt } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateStickerPrompts = async (
  character: CharacterConfig,
  keywords: string[]
): Promise<StickerPrompt[]> => {
  const ai = getAI();
  const systemInstruction = `
    你是一位專業的 LINE 貼圖設計師。
    請為以下角色維持高度的外型一致性：
    物種：${character.species}
    核心特徵：${character.features}
    穿著：${character.clothing}
    藝術風格：${character.style}
    
    針對使用者提供的每個關鍵字（如：謝謝、生氣），生成一段詳細的英文圖像描述（Image Prompt）。
    描述必須包含以下關鍵要素以符合貼圖規範：
    "die-cut sticker style", "white border", "isolated on pure white background", "flat illustration", "bold outlines", "high quality".
    請確保圖片中「不要」出現任何文字。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `請為以下關鍵字生成貼圖描述：${keywords.join(', ')}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            keyword: { type: Type.STRING, description: "原始關鍵字" },
            visualDescription: { type: Type.STRING, description: "詳細的英文圖像生成提示詞" }
          },
          required: ["keyword", "visualDescription"]
        }
      }
    }
  });

  const rawData = JSON.parse(response.text || '[]');
  return rawData.map((item: any, index: number) => ({
    id: `prompt-${index}`,
    keyword: item.keyword,
    visualDescription: item.visualDescription,
    status: 'pending'
  }));
};

export const generateStickerImage = async (prompt: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part || !part.inlineData) throw new Error("無法生成圖片");
  
  return `data:image/png;base64,${part.inlineData.data}`;
};
