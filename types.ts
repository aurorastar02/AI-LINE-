
export type GenerationMode = 'fine' | 'abstract';

export interface CharacterConfig {
  species: string;
  features: string;
  clothing: string;
  style: string;
  referenceImage?: string; // For consistency
}

export interface TextStyleConfig {
  id: string;
  name: string;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
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
