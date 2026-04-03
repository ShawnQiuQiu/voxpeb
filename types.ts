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
  DASHBOARD = 'DASHBOARD',
}

export interface SpeakingSession {
  id: string;
  date: string;
  durationMinutes: number;
  overallScore: number;
  metrics: {
    pronunciation: number;
    fluency: number;
    vocabulary: number;
    grammar: number;
  };
  feedback: string;
}