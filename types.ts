
export interface CharacterConfig {
  species: string;
  features: string;
  clothing: string;
  style: string;
}

export interface StickerPrompt {
  id: string;
  keyword: string;
  visualDescription: string;
  generatedImage?: string;
  processedImage?: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface GenerationStep {
  id: number;
  label: string;
  description: string;
}
