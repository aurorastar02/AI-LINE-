
import { GoogleGenAI } from "@google/genai";
import { CharacterConfig, GenerationMode } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * 組合指令引擎：根據模式切換風格
 */
export const buildPrompt = (character: CharacterConfig, action: string, mode: GenerationMode = 'fine'): string => {
  const commonKeywords = "Sticker style, isolated on a solid bright green background (RGB 0, 255, 0), chroma key style, no shadows on background, no text, 2d simple illustration.";
  
  let stylePrompt = "";
  if (mode === 'fine') {
    // 模式 A：精緻 Q 版
    stylePrompt = "high quality, professional character design, clean sharp edges, thick black outlines, flat colors, perfect symmetry, cute and polished appearance.";
  } else {
    // 模式 B：抽象搞笑實驗室
    stylePrompt = "ugly-cute style, intentionally messy doodles, shaky brushstrokes, distorted facial features, asymmetric eyes, weirdly proportioned body, surreal humor, crayon texture, rough marker lines, chaotic coloring, over-the-top exaggerated expressions, derpy face, low-brow art style.";
  }

  return `A ${character.species}, ${character.features}, wearing ${character.clothing}, ${action}. The art style is ${character.style}. Visual properties: ${stylePrompt} ${commonKeywords}`;
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
    contents.parts.push({ text: "Maintain strict visual consistency with this character's identity while applying the specified art style. Ensure the background remains pure green (RGB 0,255,0)." });
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
