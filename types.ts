export interface FirmwareConfig {
  name: string;
  voice: string;
  personalityType: 'strict' | 'encouraging' | 'humorous' | 'serious';
  focusArea: string;
  correctionStyle: 'immediate' | 'summary' | 'serious_only';
  languageRatio: 'english_only' | 'mixed';
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'adaptive';
}

export interface GeneratedAsset {
  type: 'image' | 'text';
  content: string; // Base64 image or text string
  metadata?: any;
}

export enum AppSection {
  HOME = 'HOME',
  MODEL_GEN = 'MODEL_GEN',
  FIRMWARE_GEN = 'FIRMWARE_GEN',
}