
export interface CharacterConfig {
  species: string;
  features: string;
  clothing: string;
  style: string;
  referenceImage?: string; // For consistency
}

export interface StickerPrompt {
  id: string;
  keyword: string;
  visualDescription: string;
  generatedImage?: string;
  processedImage?: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface LinePack {
  main?: string; // 240x240
  tab?: string;  // 96x74
  stickers: StickerPrompt[];
}
