import React from 'react';
import {
  SubtitleSettings,
  SubtitleTheme,
  SubtitleSize,
  SubtitlePosition,
  SubtitleAnimationStyle,
  SignLanguageId,
} from '../types';
import {
  Palette,
  Sliders,
  Sparkles,
  Volume2,
  Clock,
  Hand,
  Languages,
  Film,
  Zap,
  Target,
  Layers,
} from 'lucide-react';
import { SUPPORTED_SIGN_LANGUAGES } from '../data/signLanguages';

interface SubtitleControlsProps {
  settings: SubtitleSettings;
  onUpdateSettings: (newSettings: Partial<SubtitleSettings>) => void;
  autoTranslate: boolean;
  onToggleAutoTranslate: (active: boolean) => void;
  onManualTrigger: () => void;
  onFinalizeSentence: () => void;
  isProcessing: boolean;
  activeSignLanguage: SignLanguageId;
  onChangeSignLanguage: (id: SignLanguageId) => void;
}

export const SubtitleControls: React.FC<SubtitleControlsProps> = ({
  settings,
  onUpdateSettings,
  autoTranslate,
  onToggleAutoTranslate,
  onManualTrigger,
  onFinalizeSentence,
  isProcessing,
  activeSignLanguage,
  onChangeSignLanguage,
}) => {
  const themes: { id: SubtitleTheme; label: string; previewColor: string }[] = [
    { id: 'yellow', label: 'Cinema Gold', previewColor: 'bg-amber-400' },
    { id: 'white', label: 'Classic White', previewColor: 'bg-white' },
    { id: 'cyan', label: 'Cyber Cyan', previewColor: 'bg-cyan-400' },
    { id: 'high-contrast', label: 'High Contrast (AAA)', previewColor: 'bg-yellow-300' },
    { id: 'teletext', label: 'Retro Teletext', previewColor: 'bg-emerald-400' },
  ];

  const sizes: { id: SubtitleSize; label: string }[] = [
    { id: 'normal', label: 'Standard' },
    { id: 'large', label: 'Large' },
    { id: 'cinema', label: 'Cinema' },
  ];

  const positions: { id: SubtitlePosition; label: string }[] = [
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-wide', label: 'Bottom Wide' },
    { id: 'lower-third', label: 'Lower Third' },
    { id: 'top', label: 'Top Banner' },
  ];

  const animations: { id: SubtitleAnimationStyle; label: string }[] = [
    { id: 'karaoke', label: 'Word Highlight' },
    { id: 'typewriter', label: 'Live Stream' },
    { id: 'smooth-fade', label: 'Fade' },
    { id: 'instant', label: 'Instant' },
  ];

  return (
    <div className="bg-neutral-900/90 rounded-3xl p-5 sm:p-6 border border-neutral-800 text-neutral-200 shadow-xl space-y-6">
      {/* Header bar with Status and Finalize Sentence button */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-base">Sign Language & Continuous Subtitle Engine</h2>
            <p className="text-xs text-neutral-400">Low-latency multimodal recognition & continuous sentence synthesis</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Continuous finalize trigger button */}
          <button
            onClick={onFinalizeSentence}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors shadow-sm"
            title="Finalize active sentence now and start next sentence"
          >
            <Hand className="w-3.5 h-3.5 text-amber-400" />
            Finalize Sentence
          </button>

          {/* Toggle Live Subtitles on/off */}
          <button
            onClick={() => onToggleAutoTranslate(!autoTranslate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
              autoTranslate
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700 hover:text-neutral-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoTranslate ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
              }`}
            />
            {autoTranslate ? 'Continuous Engine: ON' : 'Paused'}
          </button>

          <button
            onClick={onManualTrigger}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow"
            title="Force snapshot & translate current frame"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isProcessing ? 'Interpreting...' : 'Translate Frame'}
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
        {/* Multi-Sign Language Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              Sign Language
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">
              {SUPPORTED_SIGN_LANGUAGES.find((l) => l.id === activeSignLanguage)?.alphabetType}
            </span>
          </label>
          <select
            value={activeSignLanguage}
            onChange={(e) => onChangeSignLanguage(e.target.value as SignLanguageId)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
          >
            {SUPPORTED_SIGN_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.flag} {lang.name} ({lang.id})
              </option>
            ))}
          </select>

          {/* Gesture Sensitivity Selector (Crucial for casual signers!) */}
          <div className="pt-1 space-y-1">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Target className="w-3 h-3 text-cyan-400" />
              Sign Recognition Sensitivity:
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(['balanced', 'high', 'ultra'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onUpdateSettings({ gestureSensitivity: lvl })}
                  className={`py-1 text-[10px] font-semibold uppercase rounded-lg border transition-all ${
                    settings.gestureSensitivity === lvl
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subtitle Style Theme */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            Subtitle Style Theme
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdateSettings({ theme: t.id })}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
                  settings.theme === t.id
                    ? 'bg-neutral-800 border-indigo-500 text-white shadow'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${t.previewColor}`} />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Typography & Animation */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            Typography & Reveal Mode
          </label>
          <div className="grid grid-cols-2 gap-1">
            {animations.map((a) => (
              <button
                key={a.id}
                onClick={() => onUpdateSettings({ animationStyle: a.id })}
                className={`py-1 px-2 rounded-lg text-[11px] font-medium text-center border transition-all ${
                  settings.animationStyle === a.id
                    ? 'bg-neutral-800 border-cyan-500 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 pt-0.5">
            {sizes.map((s) => (
              <button
                key={s.id}
                onClick={() => onUpdateSettings({ size: s.id })}
                className={`py-1 px-1 rounded-lg text-[11px] font-medium text-center border transition-all ${
                  settings.size === s.id
                    ? 'bg-neutral-800 border-indigo-500 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spoken Voice & Low-Latency Cadence */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              Spoken Voice Readout
            </span>
            <input
              type="checkbox"
              checked={settings.textToSpeech}
              onChange={(e) => onUpdateSettings({ textToSpeech: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
            />
          </label>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Capture Cadence
              </span>
              <span className="font-mono text-cyan-300 font-bold">{settings.autoTranslateCadence}s</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.1"
              value={settings.autoTranslateCadence}
              onChange={(e) => onUpdateSettings({ autoTranslateCadence: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="pt-0.5">
            <select
              value={settings.position}
              onChange={(e) => onUpdateSettings({ position: e.target.value as SubtitlePosition })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1 text-xs text-neutral-300 focus:outline-none focus:border-cyan-500"
            >
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Feature Toggles: Continuous Sentences, Alignment Box, Opacity */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-800 text-xs text-neutral-300">
        <div className="flex items-center gap-5 flex-wrap">
          {/* Continuous Sentences Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.continuousSentenceMode}
              onChange={(e) => onUpdateSettings({ continuousSentenceMode: e.target.checked })}
              className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
            <span className="font-semibold text-white">Continuous Sentence Flow</span>
            <span className="text-[10px] text-indigo-400">(assembles full sentences)</span>
          </label>

          {/* Alignment Guide Box Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.showAlignmentGuide}
              onChange={(e) => onUpdateSettings({ showAlignmentGuide: e.target.checked })}
              className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
            <span>Hand Alignment Box</span>
          </label>

          {/* Bilingual Subtitles */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.showBilingual}
              onChange={(e) => onUpdateSettings({ showBilingual: e.target.checked })}
              className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
            <span>Bilingual Subtitles</span>
          </label>
        </div>

        {/* Opacity slider */}
        <div className="flex items-center gap-2">
          <span className="text-neutral-400">Background:</span>
          <input
            type="range"
            min="0.3"
            max="1.0"
            step="0.05"
            value={settings.opacity}
            onChange={(e) => onUpdateSettings({ opacity: parseFloat(e.target.value) })}
            className="w-24 accent-indigo-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-neutral-300 w-8">{Math.round(settings.opacity * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
