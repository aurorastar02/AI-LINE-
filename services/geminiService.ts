
import { GoogleGenAI, Type } from "@google/genai";
import { CharacterConfig, StickerPrompt } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// 內建 40 組 LINE 常用情境清單
const SCENARIO_LIST = [
  { k: "打招呼", v: "Waving hand cheerfully with a big smile" },
  { k: "謝謝", v: "Bowing deeply and holding a small red heart" },
  { k: "收到", v: "Giving a big thumbs up with a confident wink" },
  { k: "OK", v: "Making an 'OK' sign with hands" },
  { k: "大哭", v: "Crying with exaggerated waterfall-like tears" },
  { k: "大笑", v: "Rolling on the floor laughing with mouth open" },
  { k: "愛你", v: "Blowing a kiss with tiny hearts floating around" },
  { k: "生氣", v: "Pouting with steam coming out of ears and red face" },
  { k: "驚訝", v: "Jaw dropped and eyes bulging out in shock" },
  { k: "拜託", v: "Putting hands together with sparkling puppy eyes" },
  { k: "睡覺", v: "Curled up in a ball with a 'Zzz' bubble" },
  { k: "加油", v: "Holding pompoms and cheering energetically" },
  { k: "疑惑", v: "Tilting head with a big question mark above" },
  { k: "趕工中", v: "Typing furiously on a laptop with a sweat drop" },
  { k: "恭喜", v: "Holding a party popper with confetti exploding" },
  { k: "晚安", v: "Holding a soft pillow and yawning" },
  { k: "早安", v: "Stretching limbs and looking refreshed" },
  { k: "抱抱", v: "Reaching out for a warm hug" },
  { k: "害羞", v: "Blushing deeply with hands on cheeks" },
  { k: "對不起", v: "Prostrating on the floor (Dogeza) in apology" },
  { k: "肚子餓", v: "Holding a fork and knife with a hungry face" },
  { k: "吃飽了", v: "Patting a round belly with a satisfied smile" },
  { k: "+1", v: "Holding a sign board that says '+1'" },
  { k: "沒問題", v: "Flexing muscles with a cool expression" },
  { k: "崩潰", v: "Head in hands with a messy/stressed background" },
  { k: "嚇死我", v: "Pale face with a ghost floating nearby" },
  { k: "發錢", v: "Throwing golden coins into the air" },
  { k: "生日快樂", v: "Holding a big cake with candles" },
  { k: "在嗎", v: "Peeking through a door curiously" },
  { k: "思考", v: "Rubbing chin with a thoughtful expression" },
  { k: "耍酷", v: "Wearing stylish sunglasses and posing" },
  { k: "累了", v: "Lying flat on the floor looking exhausted" },
  { k: "哼", v: "Turning head away with eyes closed arrogantly" },
  { k: "灑花", v: "Throwing pink petals into the air" },
  { k: "沒眼看", v: "Covering eyes with both hands" },
  { k: "心碎", v: "Holding a broken heart with a sad face" },
  { k: "感冒", v: "Wearing a face mask with a thermometer" },
  { k: "乾杯", v: "Holding up a mug of juice or beer" },
  { k: "讚", v: "Two thumbs up with a sparkling background" },
  { k: "閃人", v: "Running away fast leaving a dust cloud" }
];

export const generateBatchPrompts = (character: CharacterConfig): StickerPrompt[] => {
  const timestamp = Date.now();
  const techKeywords = "sticker style, chibi, die-cut, white border, thick bold outlines, flat colors, vibrant, high contrast, isolated on pure white background, no text, 2d vector illustration.";

  return SCENARIO_LIST.map((item, index) => {
    const visualDescription = `A ${character.style} ${character.species}, ${character.features}, wearing ${character.clothing}, ${item.v}. ${techKeywords}`;
    
    return {
      id: `p-${timestamp}-${index}`,
      keyword: item.k,
      visualDescription: visualDescription,
      status: 'pending'
    };
  });
};

export const generateScenarios = async (
  character: CharacterConfig,
  count: number = 16
): Promise<StickerPrompt[]> => {
  const ai = getAI();
  const systemInstruction = `你是一位資深的 LINE 貼圖劇本家。
    你的任務是為特定角色設計一系列常用的 LINE 聊天情境。
    
    角色描述：
    物種/名字：${character.species}
    核心特徵：${character.features}
    穿著配飾：${character.clothing}
    藝術風格：${character.style}
    
    輸出規範：
    1. 必須輸出 JSON 格式。
    2. 每個物件包含 'keyword' (中文) 和 'visualDescription' (英文圖像生成提示詞)。
    3. 視覺描述 (visualDescription) 必須包含：
       - 角色正在做的動作
       - 誇張的表情 (Exaggerated facial expression)
       - 關鍵技術詞："sticker style", "die-cut", "white border", "thick bold outlines", "flat colors", "isolated on pure white background", "no text".
    `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `請根據角色設定生成 ${count} 個高品質的貼圖劇本描述。`,
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
    parts: [{ text: `${prompt}, high quality, professional sticker art.` }]
  };

  if (referenceImage) {
    const base64Data = referenceImage.split(',')[1];
    contents.parts.unshift({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
    contents.parts.push({ text: "Maintain strict character consistency: same colors, same features, and same clothing as the reference image provided." });
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
