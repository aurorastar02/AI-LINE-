
import { GoogleGenAI, Type } from "@google/genai";
import { CharacterConfig, StickerPrompt } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateScenarios = async (
  character: CharacterConfig,
  count: number = 24
): Promise<StickerPrompt[]> => {
  const ai = getAI();
  const systemInstruction = `你是一位資深的 LINE 貼圖劇本家。
    請為以下角色設計 ${count} 個常用的 LINE 聊天情境（包含早安、收到、+1、崩潰、讚、問號、愛你、趕工中、晚安等）。
    
    角色描述：
    物種：${character.species}
    特徵：${character.features}
    穿著：${character.clothing}
    藝術風格：${character.style}
    
    請確保輸出為 JSON 格式，每個物件包含 'keyword' (中文) 和 'visualDescription' (詳細的英文 Image Prompt)。
    Image Prompt 必須包含："die-cut sticker style", "white border", "isolated on pure white background", "flat illustration", "bold outlines", "high contrast".
    不可出現文字。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `請生成 ${count} 個貼圖情境。`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            keyword: { type: Type.STRING },
            visualDescription: { type: Type.STRING }
          },
          required: ["keyword", "visualDescription"]
        }
      }
    }
  });

  const rawData = JSON.parse(response.text || '[]');
  return rawData.map((item: any, index: number) => ({
    id: `p-${Date.now()}-${index}`,
    keyword: item.keyword,
    visualDescription: item.visualDescription,
    status: 'pending'
  }));
};

export const generateStickerImage = async (prompt: string, referenceImage?: string): Promise<string> => {
  const ai = getAI();
  
  const contents: any = {
    parts: [{ text: prompt }]
  };

  if (referenceImage) {
    const base64Data = referenceImage.split(',')[1];
    contents.parts.unshift({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
    contents.parts.push({ text: "Please keep the character appearance exactly like the reference image." });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents,
    config: {
      imageConfig: { aspectRatio: "1:1" }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part || !part.inlineData) throw new Error("無法生成圖片");
  
  return `data:image/png;base64,${part.inlineData.data}`;
};
