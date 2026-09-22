export type SignLanguageId = 'ASL' | 'BSL' | 'Auslan' | 'ISL' | 'LSF' | 'IS';

export interface SignLanguageInfo {
  id: SignLanguageId;
  name: string;
  nativeName: string;
  region: string;
  alphabetType: 'one-handed' | 'two-handed' | 'hybrid';
  flag: string;
  description: string;
  keyFeatures: string[];
}

export interface SignTranslationResult {
  detected: boolean;
  gloss: string;
  subtitle: string;
  currentWord?: string;
  accumulatedGloss?: string[];
  isSentenceComplete?: boolean;
  sentenceProgress?: number; // 0 to 100
  confidence: 'high' | 'medium' | 'low';
  gestureDescription?: string;
  isFingerSpelling?: boolean;
  handStatus: 'active_signing' | 'transition' | 'resting' | 'no_hands';
  signLanguage: SignLanguageId;
  twoHandedSign?: boolean;
  nonManualMarkers?: string;
  suggestedNextSigns?: string[];
  latencyMs?: number;
  timestamp: number;
}

export interface TranscriptItem {
  id: string;
  timestamp: number;
  timeFormatted: string;
  subtitle: string;
  gloss: string;
  confidence: 'high' | 'medium' | 'low';
  signSystem: string;
  signLanguage: SignLanguageId;
  wordsCount?: number;
}

export type SubtitleTheme = 'yellow' | 'white' | 'cyan' | 'high-contrast' | 'teletext';
export type SubtitleSize = 'normal' | 'large' | 'cinema';
export type SubtitlePosition = 'bottom-center' | 'bottom-wide' | 'lower-third' | 'top';
export type SubtitleAnimationStyle = 'karaoke' | 'typewriter' | 'smooth-fade' | 'instant';

export interface SubtitleSettings {
  theme: SubtitleTheme;
  size: SubtitleSize;
  position: SubtitlePosition;
  animationStyle: SubtitleAnimationStyle;
  opacity: number; // 0.2 to 1.0
  showGloss: boolean;
  showConfidence: boolean;
  showLanguageBadge: boolean;
  showBilingual: boolean;
  textToSpeech: boolean;
  speechRate: number; // 0.8 to 1.5
  autoTranslateCadence: number; // in seconds (e.g. 0.8 to 2.5)
  targetSpokenLanguage: string;
  continuousSentenceMode: boolean; // Accumulate multiple signs into fluent continuous sentences
  gestureSensitivity: 'balanced' | 'high' | 'ultra'; // Tolerance for casual/rapid gestures
  showAlignmentGuide: boolean; // Visual hand positioning framing guide
}

export interface VideoDeviceOption {
  deviceId: string;
  label: string;
  isBackCamera?: boolean;
}

export interface DictionaryItem {
  id: string;
  signLanguage: SignLanguageId;
  category: 'Alphabet' | 'Basics' | 'Phrases' | 'Emergency' | 'Numbers';
  term: string;
  gloss: string;
  handshape: string;
  movement: string;
  tips: string;
  symbolEmoji: string;
  isTwoHanded?: boolean;
}
