import React, { useEffect, useState, useRef } from 'react';
import { SubtitleSettings, SignTranslationResult, SignLanguageId } from '../types';
import { Volume2, Hand, Sparkles, Languages, Eye, CheckCircle2, ArrowRight } from 'lucide-react';
import { SUPPORTED_SIGN_LANGUAGES } from '../data/signLanguages';

interface SubtitleOverlayProps {
  currentResult: SignTranslationResult | null;
  settings: SubtitleSettings;
  isSpeaking: boolean;
  onManualSpeak?: (text: string) => void;
  activeSignLanguage: SignLanguageId;
  activeGlossSequence?: string[];
  isContinuousActive?: boolean;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  currentResult,
  settings,
  isSpeaking,
  onManualSpeak,
  activeSignLanguage,
  activeGlossSequence = [],
  isContinuousActive = false,
}) => {
  const [displayText, setDisplayText] = useState<string>('');
  const [activeWords, setActiveWords] = useState<string[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [activeGloss, setActiveGloss] = useState<string>('');
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('high');
  const [gestureDesc, setGestureDesc] = useState<string>('');
  const [nonManuals, setNonManuals] = useState<string>('');
  const [isTwoHanded, setIsTwoHanded] = useState<boolean>(false);
  const [isNewSentence, setIsNewSentence] = useState<boolean>(false);
  const [isSentenceFinished, setIsSentenceFinished] = useState<boolean>(false);

  const wordTimerRef = useRef<number | null>(null);

  const langInfo =
    SUPPORTED_SIGN_LANGUAGES.find((l) => l.id === activeSignLanguage) ||
    SUPPORTED_SIGN_LANGUAGES[0];

  useEffect(() => {
    if (currentResult && currentResult.subtitle) {
      const fullText = currentResult.subtitle.trim();
      setDisplayText(fullText);
      setActiveGloss(currentResult.gloss);
      setConfidence(currentResult.confidence);
      setIsTwoHanded(Boolean(currentResult.twoHandedSign));
      setIsSentenceFinished(Boolean(currentResult.isSentenceComplete));

      if (currentResult.currentWord) {
        setCurrentWord(currentResult.currentWord);
      }
      if (currentResult.gestureDescription) {
        setGestureDesc(currentResult.gestureDescription);
      }
      if (currentResult.nonManualMarkers) {
        setNonManuals(currentResult.nonManualMarkers);
      }

      // Word reveal / live continuous formatting
      const words = fullText.split(/\s+/);
      setActiveWords(words);

      if (settings.animationStyle === 'karaoke' || settings.animationStyle === 'typewriter') {
        let currentIdx = Math.max(0, words.length - 2);
        setActiveWordIndex(currentIdx);
        if (wordTimerRef.current) clearInterval(wordTimerRef.current);

        wordTimerRef.current = window.setInterval(() => {
          currentIdx++;
          if (currentIdx <= words.length) {
            setActiveWordIndex(currentIdx);
          } else {
            if (wordTimerRef.current) clearInterval(wordTimerRef.current);
          }
        }, 110);
      } else {
        setActiveWordIndex(words.length);
      }

      setIsNewSentence(true);
      const flashTimeout = setTimeout(() => setIsNewSentence(false), 500);
      return () => clearTimeout(flashTimeout);
    }
  }, [currentResult, settings.animationStyle]);

  // Position styles
  const positionClasses = {
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2 max-w-4xl w-11/12',
    'bottom-wide': 'bottom-4 left-4 right-4 max-w-5xl mx-auto',
    'lower-third': 'bottom-6 left-6 max-w-2xl w-full sm:w-auto',
    top: 'top-6 left-1/2 -translate-x-1/2 max-w-4xl w-11/12',
  }[settings.position];

  // Font size styles
  const sizeClasses = {
    normal: 'text-lg sm:text-2xl font-medium tracking-wide leading-snug',
    large: 'text-2xl sm:text-3xl font-semibold tracking-wide leading-snug',
    cinema: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wider leading-tight',
  }[settings.size];

  // Theme color styles
  const themeClasses = {
    yellow: {
      text: 'text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
      highlightWord: 'text-amber-100 bg-amber-500/30 px-1 rounded font-bold shadow-sm',
      border: 'border-amber-400/30',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      containerBg: `rgba(10, 15, 29, ${settings.opacity})`,
    },
    white: {
      text: 'text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.98)]',
      highlightWord: 'text-white bg-white/25 px-1 rounded font-bold',
      border: 'border-white/20',
      badge: 'bg-white/15 text-white border-white/30',
      containerBg: `rgba(15, 23, 42, ${settings.opacity})`,
    },
    cyan: {
      text: 'text-cyan-300 drop-shadow-[0_2px_6px_rgba(6,182,212,0.6)]',
      highlightWord: 'text-cyan-100 bg-cyan-500/35 px-1 rounded font-bold',
      border: 'border-cyan-500/40',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      containerBg: `rgba(8, 20, 36, ${settings.opacity})`,
    },
    'high-contrast': {
      text: 'text-[#FFFF00] font-black tracking-wide',
      highlightWord: 'text-black bg-[#FFFF00] px-1 font-black',
      border: 'border-2 border-yellow-300',
      badge: 'bg-black text-yellow-300 border border-yellow-300 font-bold',
      containerBg: `rgba(0, 0, 0, ${Math.max(0.92, settings.opacity)})`,
    },
    teletext: {
      text: 'text-emerald-400 font-mono tracking-tight uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)]',
      highlightWord: 'text-black bg-emerald-400 px-1 font-bold',
      border: 'border border-emerald-500/50',
      badge: 'bg-black text-emerald-300 border border-emerald-400/60 font-mono',
      containerBg: 'rgba(0, 0, 0, 0.95)',
    },
  }[settings.theme];

  const confidenceBadge = {
    high: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    low: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  }[confidence];

  const hasContent = Boolean(displayText.trim());

  return (
    <div
      className={`absolute z-30 pointer-events-auto transition-all duration-300 ${positionClasses}`}
      role="region"
      aria-live="polite"
      aria-label="Live Sign Language Continuous Subtitles"
    >
      <div
        className={`relative rounded-3xl backdrop-blur-md px-5 py-4 sm:px-7 sm:py-5 shadow-2xl transition-all duration-300 border ${
          themeClasses.border
        } ${isNewSentence ? 'ring-2 ring-indigo-400/40' : ''}`}
        style={{ backgroundColor: themeClasses.containerBg }}
      >
        {/* Top meta tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 select-none">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Subtitle Tag */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-red-500/20 text-red-400 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE CC
            </span>

            {/* Continuous Signing Status Badge */}
            {hasContent && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                  isSentenceFinished
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {isSentenceFinished ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    SENTENCE FINALIZED
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    BUILDING SENTENCE
                  </>
                )}
              </span>
            )}

            {/* Active Sign Language Badge */}
            {settings.showLanguageBadge && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                <span>{langInfo.flag}</span>
                <span>{langInfo.id}</span>
              </span>
            )}

            {/* Two-handed Sign tag */}
            {hasContent && isTwoHanded && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Hand className="w-3 h-3" />
                2-HANDED
              </span>
            )}

            {/* Confidence Gauge */}
            {settings.showConfidence && hasContent && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${confidenceBadge}`}
              >
                <Sparkles className="w-3 h-3" />
                {confidence.toUpperCase()}
              </span>
            )}
          </div>

          {/* Voice indicator & Audio Button */}
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                <Volume2 className="w-3 h-3 animate-bounce" />
                Voice Active
              </span>
            )}
            {hasContent && onManualSpeak && (
              <button
                onClick={() => onManualSpeak(displayText)}
                className="p-1 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Speak sentence aloud"
                aria-label="Speak sentence aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Continuous Sign Sequence Tag Bar (Visualizing the signs stringing into a sentence) */}
        {activeGlossSequence.length > 0 && (
          <div className="mb-2 flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-neutral-400">
            <span className="text-neutral-500 font-sans font-semibold">Sign Sequence:</span>
            {activeGlossSequence.map((glossItem, idx) => (
              <span key={idx} className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700/80 text-indigo-300 font-bold">
                  {glossItem}
                </span>
                {idx < activeGlossSequence.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-neutral-600 shrink-0" />
                )}
              </span>
            ))}
          </div>
        )}

        {/* Subtitle Main Body: Continuous Sentence Display */}
        <div className="min-h-[3rem] flex flex-col items-center justify-center text-center">
          {hasContent ? (
            <div className="space-y-1 w-full">
              {/* Optional Bilingual Sign Gloss Display */}
              {settings.showBilingual && activeGloss && (
                <div className="text-xs sm:text-sm font-mono text-indigo-300/90 tracking-widest uppercase">
                  [GLOSS: {activeGloss}]
                </div>
              )}

              {/* Dynamic continuous sentence typography */}
              <p className={`${themeClasses.text} ${sizeClasses} transition-all duration-150 break-words`}>
                “
                {settings.animationStyle === 'karaoke'
                  ? activeWords.map((word, idx) => (
                      <span
                        key={idx}
                        className={`transition-all duration-150 mx-0.5 inline-block ${
                          idx < activeWordIndex ? themeClasses.highlightWord : 'opacity-90'
                        }`}
                      >
                        {word}
                      </span>
                    ))
                  : displayText}
                ”
              </p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm sm:text-base italic flex items-center justify-center gap-2">
              <Hand className="w-4 h-4 animate-pulse text-indigo-400" />
              Sign in {langInfo.name} ({langInfo.id}). Subtitles form continuous sentences automatically...
            </p>
          )}
        </div>

        {/* Gesture description & Facial grammar markers */}
        {hasContent && (gestureDesc || nonManuals) && (
          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
            {gestureDesc && (
              <div className="flex items-center gap-1.5 truncate max-w-md">
                <span className="text-neutral-500 font-semibold">Detected Sign:</span>
                <span className="text-neutral-300 truncate">{gestureDesc}</span>
              </div>
            )}
            {nonManuals && (
              <div className="flex items-center gap-1.5 text-cyan-300/90 bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-500/20 text-[11px]">
                <Eye className="w-3 h-3 text-cyan-400" />
                <span>Facial Grammar: {nonManuals}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
