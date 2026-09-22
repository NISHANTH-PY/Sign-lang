import React from 'react';
import { Sparkles, Play, Hand, Languages } from 'lucide-react';
import { SignLanguageId } from '../types';

interface DemoPreset {
  term: string;
  gloss: string;
  subtitle: string;
  description: string;
  signLanguage: SignLanguageId;
  twoHanded?: boolean;
}

export const MULTI_LANG_DEMO_PRESETS: DemoPreset[] = [
  // ASL
  {
    term: 'Welcome Everyone (ASL)',
    gloss: 'WELCOME EVERYONE',
    subtitle: 'Welcome everyone, nice to see you all!',
    description: 'Open flat hands sweep inward with an inviting gesture towards the chest.',
    signLanguage: 'ASL',
    twoHanded: true,
  },
  {
    term: 'Thank You (ASL)',
    gloss: 'THANK-YOU',
    subtitle: 'Thank you very much!',
    description: 'Flat hand touching chin and moving forward and downward with a warm nod.',
    signLanguage: 'ASL',
    twoHanded: false,
  },
  {
    term: 'Hello & How Are You (ASL)',
    gloss: 'HELLO HOW-ARE-YOU',
    subtitle: 'Hello, how are you doing today?',
    description: 'Salute hand wave from forehead forward, followed by curved hands rolling outward with questioning eyebrows.',
    signLanguage: 'ASL',
    twoHanded: false,
  },
  {
    term: 'I Love You (ASL)',
    gloss: 'I-LOVE-YOU',
    subtitle: 'I love you so much!',
    description: 'Universal ILY sign (thumb, index, pinky outstretched) held towards the camera.',
    signLanguage: 'ASL',
    twoHanded: false,
  },

  // BSL
  {
    term: 'What is your name? (BSL)',
    gloss: 'NAME WHAT?',
    subtitle: 'What is your name, please?',
    description: 'Two fingers tapping forehead in BSL, accompanied by furrowed WH-question eyebrows.',
    signLanguage: 'BSL',
    twoHanded: false,
  },
  {
    term: 'Letter A (2-Handed BSL)',
    gloss: 'A [BSL 2-HANDED]',
    subtitle: 'Fingerspelling letter A using the British 2-handed alphabet.',
    description: 'Dominant index finger touching the tip of the non-dominant thumb representing vowel A.',
    signLanguage: 'BSL',
    twoHanded: true,
  },
  {
    term: 'Please & Thank You (BSL)',
    gloss: 'PLEASE THANK-YOU',
    subtitle: 'Please and thank you.',
    description: 'Fingertips drawn down the cheek and chin in British Sign Language.',
    signLanguage: 'BSL',
    twoHanded: false,
  },

  // Auslan
  {
    term: "G'day / Welcome (Auslan)",
    gloss: 'GDAY WELCOME',
    subtitle: "G'day mate, welcome here!",
    description: 'Australian Sign Language open-palm wave forward accompanied by a broad friendly greeting.',
    signLanguage: 'Auslan',
    twoHanded: false,
  },

  // ISL
  {
    term: 'Namaste & Welcome (ISL)',
    gloss: 'NAMASTE WELCOME',
    subtitle: 'Namaste and welcome to everyone!',
    description: 'Palms pressed together flat at the chest in traditional Indian Sign Language greeting.',
    signLanguage: 'ISL',
    twoHanded: true,
  },

  // LSF
  {
    term: 'Bonjour / Good Day (LSF)',
    gloss: 'BONJOUR',
    subtitle: 'Bonjour, have a wonderful day!',
    description: 'French Sign Language flat hand touching chin and sweeping outward gracefully.',
    signLanguage: 'LSF',
    twoHanded: false,
  },

  // Emergency (Universal)
  {
    term: 'Emergency Medical Help',
    gloss: 'HELP DOCTOR PLEASE',
    subtitle: 'Please get help immediately, I need a doctor!',
    description: 'Thumbs-up fist raised on flat palm (Help) followed by fingers tapping wrist (Doctor).',
    signLanguage: 'ASL',
    twoHanded: true,
  },
];

interface DemoClipSelectorProps {
  onSelectDemo: (demo: DemoPreset) => void;
  isProcessing: boolean;
  activeSignLanguage: SignLanguageId;
  onChangeSignLanguage?: (lang: SignLanguageId) => void;
}

export const DemoClipSelector: React.FC<DemoClipSelectorProps> = ({
  onSelectDemo,
  isProcessing,
  activeSignLanguage,
  onChangeSignLanguage,
}) => {
  // Prioritize active language presets first, then others
  const sortedPresets = [...MULTI_LANG_DEMO_PRESETS].sort((a, b) => {
    if (a.signLanguage === activeSignLanguage && b.signLanguage !== activeSignLanguage) return -1;
    if (b.signLanguage === activeSignLanguage && a.signLanguage !== activeSignLanguage) return 1;
    return 0;
  });

  return (
    <div className="bg-neutral-900/90 rounded-2xl p-5 border border-neutral-800 text-neutral-200 shadow-xl space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-white text-base">Instant Sign Simulation & Testing</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Languages className="w-3.5 h-3.5 text-indigo-400" />
          <span>Active Language:</span>
          <span className="font-bold text-indigo-300">{activeSignLanguage}</span>
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Preview live dynamic subtitles instantly across multiple sign languages (ASL, BSL 2-handed, Auslan, ISL, LSF):
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
        {sortedPresets.slice(0, 10).map((demo) => {
          const isCurrentLang = demo.signLanguage === activeSignLanguage;
          return (
            <button
              key={demo.term}
              onClick={() => {
                if (demo.signLanguage !== activeSignLanguage && onChangeSignLanguage) {
                  onChangeSignLanguage(demo.signLanguage);
                }
                onSelectDemo(demo);
              }}
              disabled={isProcessing}
              className={`p-2.5 rounded-xl border text-left transition-all group disabled:opacity-50 flex flex-col justify-between ${
                isCurrentLang
                  ? 'bg-neutral-950 border-indigo-500/50 hover:border-indigo-400'
                  : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {demo.term}
                  </span>
                  <Play className="w-3 h-3 text-neutral-500 group-hover:text-indigo-400 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                  <span className="px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 font-mono text-indigo-300 font-semibold">
                    {demo.signLanguage}
                  </span>
                  {demo.twoHanded && (
                    <span className="text-purple-300 text-[9px]">2-Hand</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
