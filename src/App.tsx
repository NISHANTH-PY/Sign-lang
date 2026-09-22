import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CameraFeed } from './components/CameraFeed';
import { SubtitleOverlay } from './components/SubtitleOverlay';
import { SubtitleControls } from './components/SubtitleControls';
import { TranscriptHistory } from './components/TranscriptHistory';
import { PhoneCompanionModal } from './components/PhoneCompanionModal';
import { SignGuideModal } from './components/SignGuideModal';
import { DemoClipSelector } from './components/DemoClipSelector';
import { ImageSignTranslator } from './components/ImageSignTranslator';
import { VideoSignTranslator } from './components/VideoSignTranslator';
import { HandSignVideoGenerator } from './components/HandSignVideoGenerator';
import {
  SignTranslationResult,
  SubtitleSettings,
  TranscriptItem,
  DictionaryItem,
  SignLanguageId,
  MediaInputMode,
} from './types';
import { SUPPORTED_SIGN_LANGUAGES } from './data/signLanguages';
import {
  Hand,
  Smartphone,
  BookOpen,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  Layers,
  Zap,
  Camera,
  Image as ImageIcon,
  Film,
  Wand2,
} from 'lucide-react';

export default function App() {
  // Active Sign Language (ASL, BSL, Auslan, ISL, LSF, IS)
  const [activeSignLanguage, setActiveSignLanguage] = useState<SignLanguageId>('ASL');

  // Core Subtitle Settings
  const [settings, setSettings] = useState<SubtitleSettings>({
    theme: 'yellow',
    size: 'normal',
    position: 'bottom-center',
    animationStyle: 'karaoke',
    opacity: 0.88,
    showGloss: true,
    showConfidence: true,
    showLanguageBadge: true,
    showBilingual: false,
    textToSpeech: true,
    speechRate: 1.0,
    autoTranslateCadence: 1.0, // Low-latency 1.0s loop
    targetSpokenLanguage: 'English',
    continuousSentenceMode: true, // Accumulate signs into full fluent sentences
    gestureSensitivity: 'high', // High tolerance for natural/casual signing
    showAlignmentGuide: true,
  });

  // Continuous Sentence Accumulator state
  const [activeGlossSequence, setActiveGlossSequence] = useState<string[]>([]);
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<SignTranslationResult | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [autoTranslate, setAutoTranslate] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(320);

  // Mode selection: Live Camera vs Image Translation vs Video Translation
  const [mediaInputMode, setMediaInputMode] = useState<MediaInputMode>('live-camera');

  // Modals & simulation
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [demoVideoActive, setDemoVideoActive] = useState<boolean>(false);
  const [selectedDemoGesture, setSelectedDemoGesture] = useState<string>('');

  // Idle tracking for auto-finalizing sentences when hands pause
  const consecutiveRestCountRef = useRef<number>(0);
  const lastSpokenTextRef = useRef<string>('');
  const recentSentencesRef = useRef<string[]>([]);
  const activeGlossSeqRef = useRef<string[]>([]);
  const currentSentenceRef = useRef<string>('');

  // Keep refs in sync
  useEffect(() => {
    activeGlossSeqRef.current = activeGlossSequence;
  }, [activeGlossSequence]);

  useEffect(() => {
    currentSentenceRef.current = currentSentence;
  }, [currentSentence]);

  // Audio gesture unlock for browser autoplay policy
  useEffect(() => {
    const unlockSpeech = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    };
    window.addEventListener('click', unlockSpeech, { once: true });
    window.addEventListener('touchstart', unlockSpeech, { once: true });
    return () => {
      window.removeEventListener('click', unlockSpeech);
      window.removeEventListener('touchstart', unlockSpeech);
    };
  }, []);

  const activeLangInfo =
    SUPPORTED_SIGN_LANGUAGES.find((l) => l.id === activeSignLanguage) ||
    SUPPORTED_SIGN_LANGUAGES[0];

  const handleUpdateSettings = (newSettings: Partial<SubtitleSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Text-To-Speech execution helper
  const speakSubtitle = useCallback(
    async (text: string) => {
      if (!text || text.trim() === '') return;
      const cleanText = text.trim();
      if (lastSpokenTextRef.current === cleanText) return;
      lastSpokenTextRef.current = cleanText;

      setIsSpeaking(true);

      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          window.speechSynthesis.resume();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = settings.speechRate || 1.0;
          utterance.pitch = 1.0;
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = (e) => {
            console.warn('SpeechSynthesis error:', e.error || 'speech failed');
            setIsSpeaking(false);
          };
          window.speechSynthesis.speak(utterance);
        } catch (err: any) {
          console.warn('SpeechSynthesis exception:', err?.message || 'speech exception');
          setIsSpeaking(false);
        }
      } else {
        try {
          const res = await fetch('/api/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText }),
          });
          const data = await res.json();
          if (data.audioBase64) {
            const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => setIsSpeaking(false);
            await audio.play();
          } else {
            setIsSpeaking(false);
          }
        } catch {
          setIsSpeaking(false);
        }
      }
    },
    [settings.speechRate]
  );

  // Finalize active continuous sentence and archive into transcript log
  const finalizeCurrentSentence = useCallback(
    (sentenceToFinalize?: string) => {
      const sentence = (sentenceToFinalize || currentSentenceRef.current).trim();
      if (!sentence) return;

      const nowObj = new Date();
      const formattedTime = nowObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const combinedGloss = activeGlossSeqRef.current.join(' ') || 'SIGN';

      const newTranscript: TranscriptItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        timeFormatted: formattedTime,
        subtitle: sentence,
        gloss: combinedGloss,
        confidence: 'high',
        signSystem: activeLangInfo.name,
        signLanguage: activeSignLanguage,
        wordsCount: sentence.split(/\s+/).length,
      };

      setTranscripts((prev) => [newTranscript, ...prev]);
      recentSentencesRef.current.push(sentence);
      if (recentSentencesRef.current.length > 6) {
        recentSentencesRef.current.shift();
      }

      if (settings.textToSpeech) {
        speakSubtitle(sentence);
      }

      // Reset active sentence builder for next thought
      setActiveGlossSequence([]);
      setCurrentSentence('');
      consecutiveRestCountRef.current = 0;
    },
    [activeLangInfo.name, activeSignLanguage, settings.textToSpeech, speakSubtitle]
  );

  // Fast frame capture & continuous translation
  const handleFrameCapture = useCallback(
    async (currentFrameDataUrl: string, previousFrameDataUrl?: string) => {
      setIsProcessing(true);

      try {
        const response = await fetch('/api/translate-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frame: currentFrameDataUrl,
            previousFrame: previousFrameDataUrl,
            activeGlossSequence: activeGlossSeqRef.current,
            currentSentence: currentSentenceRef.current,
            recentTranscripts: recentSentencesRef.current.slice(-3),
            signSystem: activeLangInfo.name,
            signLanguage: activeSignLanguage,
            targetLanguage: settings.targetSpokenLanguage || 'English',
            continuousMode: settings.continuousSentenceMode,
            sensitivity: settings.gestureSensitivity,
          }),
        });

        if (!response.ok) {
          throw new Error(`Translation status: ${response.status}`);
        }

        const resData = await response.json();
        if (resData.latencyMs) {
          setLastLatencyMs(resData.latencyMs);
        }

        if (resData.success && resData.data) {
          const data = resData.data;
          const detectedSubtitle = (data.subtitle || '').trim() || (data.detected && data.gloss ? data.gloss : '');

          const result: SignTranslationResult = {
            detected: Boolean(data.detected),
            gloss: data.gloss || '',
            subtitle: detectedSubtitle || currentSentenceRef.current,
            currentWord: data.currentWord,
            confidence: data.confidence || 'high',
            gestureDescription: data.gestureDescription,
            handStatus: data.handStatus || 'resting',
            signLanguage: activeSignLanguage,
            twoHandedSign: data.twoHandedSign,
            nonManualMarkers: data.nonManualMarkers,
            isSentenceComplete: data.isSentenceComplete,
            latencyMs: resData.latencyMs,
            timestamp: Date.now(),
          };

          setCurrentResult(result);

          if (data.detected) {
            consecutiveRestCountRef.current = 0;
            const newGloss = (data.gloss || '').trim().toUpperCase();

            // Append new sign to sequence if not duplicate of immediately preceding sign
            if (newGloss) {
              const lastGloss = activeGlossSeqRef.current[activeGlossSeqRef.current.length - 1];
              if (newGloss !== lastGloss) {
                setActiveGlossSequence((prev) => [...prev, newGloss]);
              }
            }

            if (detectedSubtitle) {
              setCurrentSentence(detectedSubtitle);
            }

            // If model recognized sentence completion, finalize it and speak
            if (data.isSentenceComplete && detectedSubtitle) {
              finalizeCurrentSentence(detectedSubtitle);
            }
          } else {
            // Hands at rest
            if (currentSentenceRef.current) {
              consecutiveRestCountRef.current += 1;
              // If hands have rested for 1 interval, finalize accumulated sentence
              if (consecutiveRestCountRef.current >= 1) {
                finalizeCurrentSentence(currentSentenceRef.current);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Error during live sign translation:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [activeLangInfo.name, activeSignLanguage, finalizeCurrentSentence, settings.continuousSentenceMode, settings.gestureSensitivity, settings.targetSpokenLanguage]
  );

  // Manual snapshot trigger
  const handleManualTrigger = () => {
    setAutoTranslate(true);
  };

  // Instant simulation presets for multi-word continuous sentences
  const handleSelectDemo = (demo: {
    term: string;
    gloss: string;
    subtitle: string;
    description: string;
    signLanguage: SignLanguageId;
    twoHanded?: boolean;
  }) => {
    setSelectedDemoGesture(demo.term);
    const mockGlossList = demo.gloss.split(/\s+/);
    setActiveGlossSequence(mockGlossList);
    setCurrentSentence(demo.subtitle);

    const mockResult: SignTranslationResult = {
      detected: true,
      gloss: demo.gloss,
      subtitle: demo.subtitle,
      confidence: 'high',
      gestureDescription: demo.description,
      handStatus: 'active_signing',
      signLanguage: demo.signLanguage,
      twoHandedSign: demo.twoHanded,
      isSentenceComplete: true,
      latencyMs: 140,
      timestamp: Date.now(),
    };

    setCurrentResult(mockResult);

    // Finalize demo sentence into transcript log
    finalizeCurrentSentence(demo.subtitle);
  };

  const handleClearTranscripts = () => {
    setTranscripts([]);
    recentSentencesRef.current = [];
    setActiveGlossSequence([]);
    setCurrentSentence('');
    setCurrentResult(null);
  };

  const handleSelectSignToPractice = (sign: DictionaryItem) => {
    setActiveSignLanguage(sign.signLanguage);
    setSelectedDemoGesture(sign.term);
    setAutoTranslate(true);
  };

  const handleAddTranslatedItem = (subtitle: string, gloss: string, signLang: SignLanguageId) => {
    const nowObj = new Date();
    const formattedTime = nowObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newTranscript: TranscriptItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      timeFormatted: formattedTime,
      subtitle,
      gloss: gloss || 'SIGN',
      confidence: 'high',
      signSystem: `${signLang} Media Translation`,
      signLanguage: signLang,
      wordsCount: subtitle.split(/\s+/).length,
    };
    setTranscripts((prev) => [newTranscript, ...prev.slice(0, 49)]);
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-neutral-950/85 backdrop-blur-md border-b border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Hand className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-white">
                  SignStream<span className="text-cyan-400">AI</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  REAL-TIME SENTENCES
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Continuous Sign Language Sentence Translation for Live Camera, Photos & Videos
              </p>
            </div>
          </div>

          {/* Action buttons & Language Switcher */}
          <div className="flex items-center gap-2">
            {/* Quick Language Switcher Dropdown */}
            <div className="relative">
              <select
                value={activeSignLanguage}
                onChange={(e) => setActiveSignLanguage(e.target.value as SignLanguageId)}
                className="appearance-none bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-xs font-semibold rounded-xl pl-2.5 pr-7 py-1.5 cursor-pointer focus:outline-none focus:border-indigo-500 transition-colors"
                title="Select Sign Language"
              >
                {SUPPORTED_SIGN_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.flag} {lang.id}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Phone Camera Button */}
            <button
              onClick={() => setIsPhoneModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Connect Phone Camera via QR"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Phone Camera</span>
            </button>

            {/* Reference Guide */}
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Sign Dictionary & Practice"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            {/* Audio Voice Readout Toggle */}
            <button
              onClick={() => handleUpdateSettings({ textToSpeech: !settings.textToSpeech })}
              className={`p-2 rounded-xl text-xs transition-colors border ${
                settings.textToSpeech
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
              title={settings.textToSpeech ? 'Voice Readout: Active' : 'Voice Readout: Muted'}
              aria-label="Toggle Voice Readout"
            >
              {settings.textToSpeech ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Media Translation Mode Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 p-2 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setMediaInputMode('live-camera')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
                mediaInputMode === 'live-camera'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Live Camera</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            </button>

            <button
              onClick={() => setMediaInputMode('image')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
                mediaInputMode === 'image'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Translate Image</span>
            </button>

            <button
              onClick={() => setMediaInputMode('video')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
                mediaInputMode === 'video'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-1 ring-purple-400'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Translate Video</span>
            </button>

            <button
              onClick={() => setMediaInputMode('generate-video')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
                mediaInputMode === 'generate-video'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 ring-1 ring-purple-400'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
              }`}
            >
              <Wand2 className="w-4 h-4 text-amber-300" />
              <span>Generate Sign Video</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                AI
              </span>
            </button>
          </div>

          <div className="text-xs text-neutral-400 flex items-center gap-2 px-2">
            <span>Target: <strong className="text-white">{settings.targetSpokenLanguage}</strong></span>
            <span className="text-neutral-600">|</span>
            <span>Sign: <strong className="text-indigo-300">{activeLangInfo.name}</strong></span>
          </div>
        </div>

        {/* View Mode 1: Live Camera Feed with Subtitle Overlay */}
        {mediaInputMode === 'live-camera' && (
          <>
            <section className="relative w-full">
              <CameraFeed
                onFrameCapture={handleFrameCapture}
                isProcessing={isProcessing}
                autoTranslate={autoTranslate}
                cadenceSeconds={settings.autoTranslateCadence}
                onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
                onOpenGuideModal={() => setIsGuideModalOpen(true)}
                demoVideoActive={demoVideoActive}
                onToggleDemoVideo={setDemoVideoActive}
                selectedDemoGesture={selectedDemoGesture}
                showAlignmentGuide={settings.showAlignmentGuide}
                latencyMs={lastLatencyMs}
              />

              {/* Floating Continuous Subtitle Overlay */}
              <SubtitleOverlay
                currentResult={currentResult}
                settings={settings}
                isSpeaking={isSpeaking}
                onManualSpeak={speakSubtitle}
                activeSignLanguage={activeSignLanguage}
                activeGlossSequence={activeGlossSequence}
                isContinuousActive={Boolean(currentSentence)}
              />
            </section>

            {/* Multi-Language Instant Simulation & Sign Testing Bar */}
            <DemoClipSelector
              onSelectDemo={handleSelectDemo}
              isProcessing={isProcessing}
              activeSignLanguage={activeSignLanguage}
              onChangeSignLanguage={setActiveSignLanguage}
            />
          </>
        )}

        {/* View Mode 2: Image Sign Translator (Photos, Diagrams, Charts) */}
        {mediaInputMode === 'image' && (
          <ImageSignTranslator
            activeSignLanguage={activeSignLanguage}
            targetLanguage={settings.targetSpokenLanguage}
            onAddToTranscripts={handleAddTranslatedItem}
            onSpeakText={speakSubtitle}
          />
        )}

        {/* View Mode 3: Video Sign Translator (Uploaded MP4/WebM/MOV) */}
        {mediaInputMode === 'video' && (
          <VideoSignTranslator
            activeSignLanguage={activeSignLanguage}
            targetLanguage={settings.targetSpokenLanguage}
            onAddToTranscripts={handleAddTranslatedItem}
            onSpeakText={speakSubtitle}
          />
        )}

        {/* View Mode 4: Hand Sign Video Generator Studio */}
        {mediaInputMode === 'generate-video' && (
          <HandSignVideoGenerator
            activeSignLanguage={activeSignLanguage}
            targetLanguage={settings.targetSpokenLanguage}
            onOpenInVideoTranslator={() => {
              setMediaInputMode('video');
            }}
            onSpeakText={speakSubtitle}
          />
        )}

        {/* Bottom Control & Log Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Subtitle Appearance & Multi-Sign Language Controls */}
          <div className="lg:col-span-6 space-y-6">
            <SubtitleControls
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              autoTranslate={autoTranslate}
              onToggleAutoTranslate={setAutoTranslate}
              onManualTrigger={handleManualTrigger}
              onFinalizeSentence={() => finalizeCurrentSentence()}
              isProcessing={isProcessing}
              activeSignLanguage={activeSignLanguage}
              onChangeSignLanguage={setActiveSignLanguage}
            />

            {/* Quick Tips Box with Continuous Signing Guidelines */}
            <div className="bg-neutral-900/60 rounded-3xl p-5 border border-neutral-800 text-xs text-neutral-300 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <Info className="w-4 h-4" />
                How Continuous Sentence Translation Works
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-neutral-400 pl-1 leading-relaxed">
                <li>
                  <strong>Continuous Sentence Synthesis:</strong> Sign naturally in sequences (e.g.{' '}
                  <code className="text-indigo-300 bg-neutral-950 px-1 py-0.5 rounded">
                    HELLO → HOW → ARE-YOU
                  </code>
                  ). The engine continuously accumulates your signs into a complete, fluent sentence.
                </li>
                <li>
                  <strong>Automatic Finalization:</strong> When you finish your thought and lower your hands, the sentence automatically finalizes into your transcript log and speaks aloud.
                </li>
                <li>
                  <strong>Zero-Lag Engine:</strong> High-speed frame extraction and low-latency models deliver sub-second responses without video freezing or queue buildup.
                </li>
                <li>
                  <strong>Hand Alignment Box:</strong> Position your chest and signing hands inside the center dashed guide box for optimal recognition accuracy.
                </li>
              </ul>
            </div>
          </div>

          {/* Live Transcript Timeline & Export */}
          <div className="lg:col-span-6">
            <TranscriptHistory
              transcripts={transcripts}
              onClearTranscripts={handleClearTranscripts}
              onSpeakText={speakSubtitle}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <PhoneCompanionModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
      />

      <SignGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onSelectSignToPractice={handleSelectSignToPractice}
        initialLanguage={activeSignLanguage}
        onSelectLanguage={setActiveSignLanguage}
      />
    </div>
  );
}
