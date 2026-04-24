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
  user_id: string;
  date: string; // ISO date string
  task_type: 'Independent' | 'Integrated';
  durationMinutes: number;
  overallScore: number; // Scaled 0-30
  metrics: {
    delivery: number; // 0-4 raw
    language_use: number; // 0-4 raw
    topic_development: number; // 0-4 raw
  };
  feedback: string;
  transcript: string;
}