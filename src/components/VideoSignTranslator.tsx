import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Video as VideoIcon,
  Play,
  Pause,
  Sparkles,
  Volume2,
  Copy,
  Check,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Clock,
  Zap,
  Film,
  RotateCcw,
  Trash2,
  Eye,
  Download,
  Wand2,
} from 'lucide-react';
import { VideoTranslationResult, SignLanguageId } from '../types';

interface VideoSignTranslatorProps {
  activeSignLanguage: SignLanguageId;
  targetLanguage?: string;
  onAddToTranscripts: (subtitle: string, gloss: string, signLanguage: SignLanguageId) => void;
  onSpeakText: (text: string) => void;
}

interface VideoCue {
  timeSec: number;
  gloss: string;
  text: string;
}

export interface ASLSignPreset {
  id: string;
  title: string;
  description: string;
  signLanguage: SignLanguageId;
  duration: number;
  cues: VideoCue[];
  iconEmoji: string;
  signerStyle?: 'realistic' | 'skeleton' | 'navi';
}

// Built-in ASL & Na'vi Sign Language Presets
const SAMPLE_PRESET_VIDEOS: ASLSignPreset[] = [
  {
    id: 'sample-hello-howareyou-vid',
    title: 'ASL: Hello & How Are You',
    description: 'Signer greeting and asking how you are doing',
    signLanguage: 'ASL',
    duration: 4.0,
    cues: [
      { timeSec: 0.8, gloss: 'HELLO', text: 'Hello!' },
      { timeSec: 2.0, gloss: 'HOW', text: 'How are you?' },
      { timeSec: 3.2, gloss: 'YOU', text: 'How are you doing today?' },
    ],
    iconEmoji: '👋',
    signerStyle: 'realistic',
  },
  {
    id: 'sample-ily-vid',
    title: 'ASL: I Love You (ILY)',
    description: 'Classic thumb, index & pinky finger sign of affection',
    signLanguage: 'ASL',
    duration: 3.5,
    cues: [
      { timeSec: 0.8, gloss: 'I', text: 'I...' },
      { timeSec: 1.8, gloss: 'I-LOVE-YOU', text: 'I love you!' },
    ],
    iconEmoji: '🤟',
    signerStyle: 'realistic',
  },
  {
    id: 'sample-thankyou-vid',
    title: 'ASL: Thank You Very Much',
    description: 'Signer thanking the viewer with chin-to-forward gesture',
    signLanguage: 'ASL',
    duration: 3.2,
    cues: [
      { timeSec: 0.8, gloss: 'THANK-YOU', text: 'Thank you...' },
      { timeSec: 2.2, gloss: 'MUCH', text: 'Thank you very much!' },
    ],
    iconEmoji: '🙏',
    signerStyle: 'realistic',
  },
  {
    id: 'sample-navi-avatar-vid',
    title: "Na'vi: I See You (Avatar)",
    description: "Reef clan greeting created by Deaf actor CJ Jones for Avatar 2",
    signLanguage: 'ASL',
    duration: 4.5,
    cues: [
      { timeSec: 1.0, gloss: 'I-SEE-YOU', text: 'I see you.' },
      { timeSec: 2.5, gloss: 'HEART-RESPECT', text: 'My heart respects your people.' },
      { timeSec: 3.8, gloss: 'PEACE', text: 'Peace be with you.' },
    ],
    iconEmoji: '🌊',
    signerStyle: 'navi',
  },
  {
    id: 'sample-help-vid',
    title: 'ASL: Please Help Me',
    description: 'Chest circular rub into elevated thumbs-up assistance gesture',
    signLanguage: 'ASL',
    duration: 3.6,
    cues: [
      { timeSec: 0.9, gloss: 'PLEASE', text: 'Please...' },
      { timeSec: 2.3, gloss: 'HELP', text: 'Please help me, I need assistance.' },
    ],
    iconEmoji: '🚨',
    signerStyle: 'realistic',
  },
];

export const VideoSignTranslator: React.FC<VideoSignTranslatorProps> = ({
  activeSignLanguage,
  targetLanguage = 'English',
  onAddToTranscripts,
  onSpeakText,
}) => {
  // Video source & active preset
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<ASLSignPreset | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Real-time video watching state
  const [isWatchingVideo, setIsWatchingVideo] = useState<boolean>(false);
  const [isAnalyzingFrame, setIsAnalyzingFrame] = useState<boolean>(false);
  const [activeSubtitleCue, setActiveSubtitleCue] = useState<string>('');
  const [liveCues, setLiveCues] = useState<VideoCue[]>([]);
  const [liveGlosses, setLiveGlosses] = useState<string[]>([]);
  const [liveSentence, setLiveSentence] = useState<string>('');

  // Generator Modal state
  const [showGeneratorModal, setShowGeneratorModal] = useState<boolean>(false);
  const [generatorSignWord, setGeneratorSignWord] = useState<string>('HELLO');
  const [generatorStyle, setGeneratorStyle] = useState<'realistic' | 'skeleton' | 'navi'>('realistic');
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);

  // Batch scan status
  const [isBatchScanning, setIsBatchScanning] = useState<boolean>(false);
  const [translationResult, setTranslationResult] = useState<VideoTranslationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [copied, setCopied] = useState<boolean>(false);
  const [addedToHistory, setAddedToHistory] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const presetCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presetAnimationRef = useRef<number | null>(null);
  const presetLastTickRef = useRef<number>(0);
  const lastCapturedFrameRef = useRef<string | null>(null);
  const lastSpokenPhraseRef = useRef<string>('');

  // Start fresh handler
  const handleStartFresh = useCallback(() => {
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
    }
    if (presetAnimationRef.current) {
      cancelAnimationFrame(presetAnimationRef.current);
      presetAnimationRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }
    setIsPlaying(false);
    setIsWatchingVideo(false);
    setIsAnalyzingFrame(false);
    setActiveSubtitleCue('');
    setLiveCues([]);
    setLiveGlosses([]);
    setLiveSentence('');
    setTranslationResult(null);
    setErrorMessage(null);
    setAddedToHistory(false);
    setCurrentTime(0);
    lastCapturedFrameRef.current = null;
    lastSpokenPhraseRef.current = '';
  }, []);

  // Articulated Signer Canvas Renderer: Renders anatomically articulated hands & motions
  const drawPresetFrame = useCallback((preset: ASLSignPreset, timeSec: number) => {
    const canvas = presetCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const isNavi = preset.signerStyle === 'navi';
    const isSkeleton = preset.signerStyle === 'skeleton';

    // 1. Background Scene
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    if (isNavi) {
      bgGrad.addColorStop(0, '#041624');
      bgGrad.addColorStop(0.5, '#072b3e');
      bgGrad.addColorStop(1, '#021018');
    } else if (isSkeleton) {
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
    } else {
      bgGrad.addColorStop(0, '#0b0f19');
      bgGrad.addColorStop(0.5, '#111827');
      bgGrad.addColorStop(1, '#1e1b4b');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle Grid Overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Color Palettes
    const skinTone = isNavi ? '#38bdf8' : isSkeleton ? '#22d3ee' : '#fbcfe8';
    const bodyTone = isNavi ? '#0284c7' : isSkeleton ? '#06b6d4' : '#6366f1';
    const highlight = isNavi ? '#7dd3fc' : isSkeleton ? '#a5f3fc' : '#f472b6';

    // 2. Signer Torso & Head Silhouette
    const centerX = w / 2;
    const headCenterY = h * 0.28;

    // Torso
    ctx.fillStyle = bodyTone;
    ctx.globalAlpha = isSkeleton ? 0.3 : 0.6;
    ctx.beginPath();
    ctx.ellipse(centerX, h * 0.72, 90, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = skinTone;
    ctx.globalAlpha = isSkeleton ? 0.4 : 0.85;
    ctx.beginPath();
    ctx.arc(centerX, headCenterY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Na'vi Clan Headdress Markings if Na'vi
    if (isNavi) {
      ctx.fillStyle = '#ef4444';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.rect(centerX - 4, headCenterY - 38, 8, 30);
      ctx.fill();

      // Side feathers
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2.5;
      for (let i = -4; i <= 4; i++) {
        if (i === 0) continue;
        const angle = -Math.PI / 2 + (i * Math.PI) / 10;
        ctx.beginPath();
        ctx.moveTo(centerX, headCenterY - 35);
        ctx.lineTo(centerX + Math.cos(angle) * 45, headCenterY - 35 + Math.sin(angle) * 45);
        ctx.stroke();
      }
    }

    // Eyes & Smile
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = isSkeleton ? '#ffffff' : '#0f172a';
    ctx.beginPath();
    ctx.arc(centerX - 12, headCenterY - 3, 3.5, 0, Math.PI * 2);
    ctx.arc(centerX + 12, headCenterY - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Friendly smile
    ctx.strokeStyle = isSkeleton ? '#ffffff' : '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, headCenterY + 12, 12, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // 3. Find current sign cue for this timecode
    const currentCue =
      [...preset.cues].reverse().find((c) => timeSec >= c.timeSec) || preset.cues[0];
    const gloss = currentCue.gloss;

    // 4. Kinematic Hand Gestures
    const drawArticulatedHand = (
      x: number,
      y: number,
      scale: number,
      pose: 'open' | 'salute' | 'ily' | 'fist' | 'touch_chin' | 'chest_palm'
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Wrist joint
      ctx.fillStyle = highlight;
      ctx.beginPath();
      ctx.arc(0, 30, 8, 0, Math.PI * 2);
      ctx.fill();

      // Arm connecting to torso
      ctx.strokeStyle = bodyTone;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(x > centerX ? 60 : -60, 110);
      ctx.stroke();

      // Palm base
      ctx.fillStyle = skinTone;
      ctx.strokeStyle = isSkeleton ? '#ffffff' : '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-22, -10, 44, 40, 10);
      ctx.fill();
      ctx.stroke();

      // Fingers
      const drawFinger = (angleDeg: number, length: number, curl: number) => {
        const rad = (angleDeg * Math.PI) / 180;
        const x1 = Math.sin(rad) * (length * 0.5);
        const y1 = -Math.cos(rad) * (length * 0.5) * (1 - curl * 0.6);
        const x2 = x1 + Math.sin(rad) * (length * 0.5);
        const y2 = y1 - Math.cos(rad) * (length * 0.5) * (1 - curl * 0.8);

        ctx.strokeStyle = skinTone;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (isSkeleton) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x1, y1, 3, 0, Math.PI * 2);
          ctx.arc(x2, y2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      if (pose === 'ily') {
        // ILY: Thumb out, Index out, Middle curled, Ring curled, Pinky out
        ctx.save();
        ctx.translate(-16, 10);
        drawFinger(-60, 26, 0); // Thumb
        ctx.restore();

        ctx.save();
        ctx.translate(-10, -10);
        drawFinger(-12, 36, 0); // Index extended
        ctx.restore();

        ctx.save();
        ctx.translate(-2, -10);
        drawFinger(0, 36, 0.9); // Middle curled
        ctx.restore();

        ctx.save();
        ctx.translate(6, -10);
        drawFinger(8, 32, 0.9); // Ring curled
        ctx.restore();

        ctx.save();
        ctx.translate(14, -10);
        drawFinger(20, 30, 0); // Pinky extended
        ctx.restore();
      } else if (pose === 'salute' || pose === 'open') {
        // Flat hand open (B-handshape)
        ctx.save();
        ctx.translate(-16, 12);
        drawFinger(-35, 24, 0.1); // Thumb alongside
        ctx.restore();

        [-10, -3, 5, 13].forEach((fx, idx) => {
          ctx.save();
          ctx.translate(fx, -10);
          drawFinger((idx - 1.5) * 4, 34, 0);
          ctx.restore();
        });
      } else if (pose === 'fist') {
        // Thumbs up / HELP fist
        ctx.save();
        ctx.translate(-12, 6);
        drawFinger(-10, 28, 0); // Thumb pointing UP
        ctx.restore();

        [-8, -2, 4, 10].forEach((fx) => {
          ctx.save();
          ctx.translate(fx, -6);
          drawFinger(0, 24, 0.85); // All fingers curled
          ctx.restore();
        });
      } else if (pose === 'chest_palm') {
        // Flat palm placed on chest
        ctx.save();
        ctx.translate(-14, 12);
        drawFinger(-30, 22, 0.1);
        ctx.restore();

        [-8, -2, 4, 10].forEach((fx, idx) => {
          ctx.save();
          ctx.translate(fx, -8);
          drawFinger((idx - 1.5) * 6, 32, 0.1);
          ctx.restore();
        });
      } else {
        // Generic open pose
        [-10, -3, 5, 13].forEach((fx) => {
          ctx.save();
          ctx.translate(fx, -10);
          drawFinger(0, 32, 0);
          ctx.restore();
        });
      }

      ctx.restore();
    };

    // Calculate dynamic animation time for gesture
    const cycle = (timeSec % 1.5) / 1.5;
    const waveSin = Math.sin(cycle * Math.PI * 2);
    const cosVal = Math.cos(cycle * Math.PI * 2);

    if (gloss.includes('HELLO')) {
      // Hand at temple waving outward
      const handX = centerX + 45 + waveSin * 18;
      const handY = headCenterY - 8 + cosVal * 10;
      drawArticulatedHand(handX, handY, 1.1, 'salute');
    } else if (gloss.includes('I-LOVE-YOU')) {
      // Centered ILY sign rocking gently
      const handX = centerX + waveSin * 14;
      const handY = h * 0.48 + cosVal * 8;
      drawArticulatedHand(handX, handY, 1.2, 'ily');
    } else if (gloss.includes('THANK-YOU')) {
      // From chin pushing forward
      const progress = cycle;
      const handX = centerX + progress * 20;
      const handY = headCenterY + 20 + progress * 40;
      drawArticulatedHand(handX, handY, 1.15, 'salute');
    } else if (gloss.includes('HELP')) {
      // Base flat hand at bottom, thumbs-up on top lifting upward
      const lift = Math.abs(waveSin) * 25;
      // Base hand
      drawArticulatedHand(centerX - 25, h * 0.62 - lift, 1.0, 'open');
      // Thumbs-up top
      drawArticulatedHand(centerX - 20, h * 0.52 - lift, 1.05, 'fist');
    } else if (gloss.includes('I-SEE-YOU') || isNavi) {
      // Na'vi greeting: Hand from forehead/eyes extending forward with open fingers
      const naviX = centerX + 35 + waveSin * 20;
      const naviY = h * 0.44 + cosVal * 12;
      drawArticulatedHand(naviX, naviY, 1.2, 'open');
    } else if (gloss.includes('PLEASE')) {
      // Circular rub on chest
      const handX = centerX + Math.cos(timeSec * 4) * 22;
      const handY = h * 0.52 + Math.sin(timeSec * 4) * 16;
      drawArticulatedHand(handX, handY, 1.1, 'chest_palm');
    } else {
      // Default conversational hand
      const handX = centerX + 40 + waveSin * 12;
      const handY = h * 0.50 + cosVal * 10;
      drawArticulatedHand(handX, handY, 1.1, 'open');
    }

    // Motion glow arc
    ctx.strokeStyle = highlight;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(centerX + 35, h * 0.48, 55, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;

    // Sign Gloss Overlay Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isNavi ? 'rgba(56, 189, 248, 0.6)' : 'rgba(129, 140, 248, 0.6)';
    ctx.lineWidth = 1.5;
    const badgeW = 210;
    const badgeH = 34;
    const badgeX = centerX - badgeW / 2;
    const badgeY = h * 0.78;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isNavi ? '#38bdf8' : '#818cf8';
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SIGN: ${gloss}`, centerX, badgeY + badgeH / 2 + 5);

    // Title at bottom
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(preset.title, centerX, h * 0.93);
  }, []);

  // Capture single frame from whichever video source is active
  const captureCurrentVideoFrame = (): string | null => {
    // 1. If preset canvas is active
    if (activePreset && presetCanvasRef.current) {
      try {
        return presetCanvasRef.current.toDataURL('image/jpeg', 0.68);
      } catch {
        return null;
      }
    }

    // 2. If uploaded video is active
    if (videoRef.current && videoRef.current.readyState >= 2) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(videoRef.current, 0, 0, 480, 270);
        return canvas.toDataURL('image/jpeg', 0.68);
      } catch {
        return null;
      }
    }

    return null;
  };

  // Video Watcher: analyzes frames continuously while video/preset plays
  const processLiveVideoFrame = useCallback(async () => {
    const currentFrame = captureCurrentVideoFrame();
    if (!currentFrame) return;

    const prevFrame = lastCapturedFrameRef.current;
    lastCapturedFrameRef.current = currentFrame;

    const timeSec = activePreset
      ? Math.round(currentTime * 10) / 10
      : videoRef.current
      ? Math.round(videoRef.current.currentTime * 10) / 10
      : 0;

    setIsAnalyzingFrame(true);

    try {
      const res = await fetch('/api/translate-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: currentFrame,
          previousFrame: prevFrame,
          activeGlossSequence: liveGlosses,
          currentSentence: liveSentence,
          signLanguage: activeSignLanguage,
          targetLanguage,
          continuousMode: true,
          sensitivity: 'high',
        }),
      });

      if (!res.ok) return;
      const json = await res.json();
      const data = json.data;

      if (data && data.detected && data.gloss) {
        const detectedGloss = String(data.gloss).toUpperCase().trim();
        const subtitleText = data.subtitle || detectedGloss;

        setActiveSubtitleCue(subtitleText);
        setLiveSentence(subtitleText);

        setLiveGlosses((prev) => {
          if (prev[prev.length - 1] === detectedGloss) return prev;
          return [...prev, detectedGloss];
        });

        setLiveCues((prev) => {
          const lastCue = prev[prev.length - 1];
          if (lastCue && Math.abs(lastCue.timeSec - timeSec) < 0.6 && lastCue.gloss === detectedGloss) {
            return prev;
          }
          return [...prev, { timeSec, gloss: detectedGloss, text: subtitleText }];
        });

        if (subtitleText !== lastSpokenPhraseRef.current && subtitleText.length > 2) {
          lastSpokenPhraseRef.current = subtitleText;
        }
      }
    } catch (err: any) {
      console.debug('Video frame watch check:', err?.message || 'frame skipped');
    } finally {
      setIsAnalyzingFrame(false);
    }
  }, [activePreset, currentTime, liveGlosses, liveSentence, activeSignLanguage, targetLanguage]);

  // Start watching interval
  const startWatcherInterval = useCallback(() => {
    if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
    watchIntervalRef.current = setInterval(() => {
      processLiveVideoFrame();
    }, 900);
  }, [processLiveVideoFrame]);

  // Stop watching interval
  const stopWatcherInterval = useCallback(() => {
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
    }
  }, []);

  // Preset Animation Loop
  useEffect(() => {
    if (!activePreset || !isPlaying) return;

    let animId: number;
    presetLastTickRef.current = performance.now();

    const tick = (now: number) => {
      const deltaSec = (now - presetLastTickRef.current) / 1000;
      presetLastTickRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + deltaSec;
        if (next >= activePreset.duration) {
          // Reached end of preset
          setIsPlaying(false);
          setIsWatchingVideo(false);
          stopWatcherInterval();
          return activePreset.duration;
        }
        drawPresetFrame(activePreset, next);
        return next;
      });

      animId = requestAnimationFrame(tick);
      presetAnimationRef.current = animId;
    };

    animId = requestAnimationFrame(tick);
    presetAnimationRef.current = animId;
    startWatcherInterval();

    return () => {
      cancelAnimationFrame(animId);
      stopWatcherInterval();
    };
  }, [activePreset, isPlaying, drawPresetFrame, startWatcherInterval, stopWatcherInterval]);

  // Safe Play Controller
  const requestPlay = async () => {
    setErrorMessage(null);

    if (activePreset) {
      if (currentTime >= activePreset.duration) {
        setCurrentTime(0);
      }
      setIsPlaying(true);
      setIsWatchingVideo(true);
      return;
    }

    if (!videoRef.current) return;
    try {
      await videoRef.current.play();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Playback error:', err?.message || 'Playback issue');
      }
    }
  };

  // Safe Pause Controller
  const requestPause = () => {
    if (activePreset) {
      setIsPlaying(false);
      setIsWatchingVideo(false);
      stopWatcherInterval();
      return;
    }

    if (!videoRef.current) return;
    try {
      videoRef.current.pause();
    } catch (err: any) {
      console.debug('Pause error:', err?.message || 'pause issue');
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      requestPause();
    } else {
      requestPlay();
    }
  };

  // Replay from start
  const handleRestart = () => {
    setCurrentTime(0);
    setErrorMessage(null);
    if (activePreset) {
      drawPresetFrame(activePreset, 0);
      requestPlay();
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0;
      requestPlay();
    }
  };

  // Scrubber Seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    setErrorMessage(null);

    if (activePreset) {
      drawPresetFrame(activePreset, seekTime);
    } else if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
  };

  // File Upload Handler
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please select a valid video file (MP4, WebM, MOV)');
      return;
    }

    handleStartFresh();
    setActivePreset(null);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setFileName(file.name);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please drop a video file (MP4, WebM, MOV)');
      return;
    }

    handleStartFresh();
    setActivePreset(null);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setFileName(file.name);
  };

  // Preset Selection Handler
  const handleSelectPreset = (preset: ASLSignPreset) => {
    handleStartFresh();
    setVideoSrc(null);
    setActivePreset(preset);
    setFileName(preset.title);
    setDuration(preset.duration);
    setCurrentTime(0);

    setTimeout(() => {
      drawPresetFrame(preset, 0);
    }, 50);
  };

  // ASL Sign Video Generator: Generates a custom animated sign video preset
  const handleGenerateCustomSignVideo = (signWord: string, style: 'realistic' | 'skeleton' | 'navi') => {
    const cleanWord = signWord.trim().toUpperCase() || 'HELLO';
    const gloss = cleanWord.replace(/\s+/g, '-');
    const displayWord = cleanWord.charAt(0) + cleanWord.slice(1).toLowerCase();

    const newPreset: ASLSignPreset = {
      id: `generated-asl-${Date.now()}`,
      title: `Generated ASL: "${displayWord}"`,
      description: `Articulated ${style} ASL sign animation for ${cleanWord}`,
      signLanguage: 'ASL',
      duration: 3.8,
      cues: [
        { timeSec: 0.6, gloss, text: `${displayWord}!` },
        { timeSec: 2.2, gloss, text: `${displayWord} in sign language.` },
      ],
      iconEmoji: cleanWord.includes('LOVE') ? '🤟' : cleanWord.includes('THANK') ? '🙏' : '👋',
      signerStyle: style,
    };

    handleStartFresh();
    setVideoSrc(null);
    setActivePreset(newPreset);
    setFileName(newPreset.title);
    setDuration(newPreset.duration);
    setCurrentTime(0);
    setShowGeneratorModal(false);

    setTimeout(() => {
      drawPresetFrame(newPreset, 0);
      requestPlay();
    }, 80);
  };

  // Export current ASL canvas animation to downloadable video (.webm)
  const handleExportCanvasVideo = async () => {
    if (!activePreset || !presetCanvasRef.current) return;
    setIsExportingVideo(true);

    try {
      const canvas = presetCanvasRef.current;
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activePreset.title.replace(/[^a-zA-Z0-9]/g, '_')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExportingVideo(false);
      };

      recorder.start();

      // Play through preset
      const totalSteps = 60;
      const stepDuration = activePreset.duration / totalSteps;
      for (let i = 0; i <= totalSteps; i++) {
        drawPresetFrame(activePreset, i * stepDuration);
        await new Promise((r) => setTimeout(r, 45));
      }

      recorder.stop();
    } catch (err: any) {
      console.warn('Video export warning:', err?.message || 'export failed');
      setIsExportingVideo(false);
    }
  };

  // Copy Translated Text
  const handleCopyText = () => {
    const textToCopy = translationResult?.translatedText || liveSentence;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add to Transcripts History
  const handleAddToHistory = () => {
    const textToSave = translationResult?.translatedText || liveSentence;
    if (!textToSave) return;
    onAddToTranscripts(
      textToSave,
      (translationResult?.glossSequence || liveGlosses).join(' '),
      activeSignLanguage
    );
    setAddedToHistory(true);
  };

  // Batch Scan entire video keyframes
  const handleBatchScanEntireVideo = async () => {
    setIsBatchScanning(true);
    setErrorMessage(null);

    try {
      const dur = duration || 4.0;
      const timestamps = [0.2, 0.4, 0.6, 0.8].map((ratio) => ratio * dur);
      const frames: Array<{ timestamp: number; frame: string }> = [];

      if (activePreset && presetCanvasRef.current) {
        for (const t of timestamps) {
          drawPresetFrame(activePreset, t);
          frames.push({
            timestamp: t,
            frame: presetCanvasRef.current.toDataURL('image/jpeg', 0.65),
          });
        }
        drawPresetFrame(activePreset, currentTime);
      } else if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not available');

        const origTime = videoRef.current.currentTime;
        for (const t of timestamps) {
          videoRef.current.currentTime = t;
          await new Promise((r) => setTimeout(r, 120));
          ctx.drawImage(videoRef.current, 0, 0, 480, 270);
          frames.push({ timestamp: t, frame: canvas.toDataURL('image/jpeg', 0.65) });
        }
        videoRef.current.currentTime = origTime;
      }

      const res = await fetch('/api/translate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          signLanguage: activeSignLanguage,
          targetLanguage,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const result: VideoTranslationResult = {
          translatedText: d.translatedText,
          fullTranscript: d.fullTranscript || d.translatedText,
          glossSequence: Array.isArray(d.glossSequence) ? d.glossSequence : ['SIGN'],
          timeline: Array.isArray(d.timeline) ? d.timeline : [],
          confidence: d.confidence || 'high',
          signLanguage: activeSignLanguage,
          summary: d.summary || 'Video translated into continuous natural sentence.',
          videoDuration: dur,
          timestamp: Date.now(),
        };
        setTranslationResult(result);
        setLiveSentence(result.translatedText);
        setLiveGlosses(result.glossSequence);
        setLiveCues(result.timeline);
        setActiveSubtitleCue(result.translatedText);
      } else {
        throw new Error(json.error || 'Video scan failed');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Unable to scan video. Click Play (▶) to translate sign language in real-time as it plays.'
      );
    } finally {
      setIsBatchScanning(false);
    }
  };

  // Active display items
  const displaySentence = translationResult?.translatedText || liveSentence;
  const displayGlosses = translationResult?.glossSequence || liveGlosses;
  const displayTimeline = translationResult?.timeline || liveCues;
  const hasActiveMedia = Boolean(videoSrc || activePreset);

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Video Sign Language Translator
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              WATCH & TRANSLATE
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Upload your video clip, test with sample gestures (including Avatar Na'vi Sign Language), or generate your own animated ASL sign video.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* ASL Video Generator Trigger Button */}
          <button
            onClick={() => setShowGeneratorModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-300" />
            Generate ASL Sign Video
          </button>

          {hasActiveMedia && (
            <>
              <button
                onClick={handleStartFresh}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700"
                title="Clear subtitles and restart from 0:00"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Start Fresh
              </button>
              <button
                onClick={() => {
                  handleStartFresh();
                  setVideoSrc(null);
                  setActivePreset(null);
                  setFileName('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-neutral-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Change Video
              </button>
            </>
          )}
        </div>
      </div>

      {/* Generator Modal */}
      {showGeneratorModal && (
        <div className="p-5 rounded-2xl bg-neutral-950 border border-indigo-500/40 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Generate Custom ASL Hand Sign Video
              </h3>
            </div>
            <button
              onClick={() => setShowGeneratorModal(false)}
              className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quick Pick Sign Word */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">
                Choose Sign Gesture:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { word: 'HELLO', emoji: '👋' },
                  { word: 'THANK YOU', emoji: '🙏' },
                  { word: 'I LOVE YOU', emoji: '🤟' },
                  { word: 'HELP', emoji: '🚨' },
                  { word: 'PLEASE', emoji: '🤲' },
                  { word: 'HOW ARE YOU', emoji: '🤝' },
                ].map((item) => (
                  <button
                    key={item.word}
                    type="button"
                    onClick={() => setGeneratorSignWord(item.word)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                      generatorSignWord === item.word
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.word}</span>
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Or type custom sign (e.g. FRIEND, PEACE)"
                  value={generatorSignWord}
                  onChange={(e) => setGeneratorSignWord(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Choose Signer Visual Style */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">
                Signer Visual Style:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'realistic', label: 'Realistic Signer', desc: 'Natural anatomy' },
                  { id: 'skeleton', label: 'Kinetic Skeleton', desc: 'Glow joint tracking' },
                  { id: 'navi', label: "Na'vi (Avatar)", desc: 'Metkayina style' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setGeneratorStyle(st.id as any)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      generatorStyle === st.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white truncate">{st.label}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateCustomSignVideo(generatorSignWord, generatorStyle)}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Generate & Watch Video Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone (shown when no video is selected) */}
      {!hasActiveMedia ? (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-indigo-400 bg-indigo-500/10 scale-[0.99]'
                : 'border-neutral-700 hover:border-cyan-500/60 bg-neutral-950/60 hover:bg-neutral-900/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/ogg"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <VideoIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Select or drop your sign language video
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4">
              Supports MP4, WebM, MOV. Once loaded, click Play to watch and translate the signing gestures live.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Browse Video from Device
            </div>
          </div>

          {/* Quick Preset Samples */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Or test with built-in ASL & Na'vi video clips:</span>
              </div>
              <span className="text-[11px] text-neutral-500 font-normal">
                100% compatible on all devices
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SAMPLE_PRESET_VIDEOS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="p-3 rounded-2xl bg-neutral-950/80 hover:bg-neutral-800/90 border border-neutral-800 hover:border-cyan-500/40 text-left transition-all group flex items-start gap-2.5"
                >
                  <span className="text-2xl select-none group-hover:scale-110 transition-transform">
                    {preset.iconEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                      {preset.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Video Player with Live Real-time Sign Watching & Subtitles */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Video Player */}
          <div className="lg:col-span-6 space-y-3">
            {/* Live Watching Status Banner */}
            <div
              className={`p-2.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
                isWatchingVideo
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : 'bg-neutral-950/70 border-neutral-800 text-neutral-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isWatchingVideo ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
                  }`}
                />
                <span>
                  {isWatchingVideo
                    ? `Watching & Translating Video (${currentTime.toFixed(1)}s)`
                    : 'Press Play (▶) to watch signs and translate'}
                </span>
              </div>
              {isAnalyzingFrame && (
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <Eye className="w-3 h-3 animate-spin" />
                  Reading Frame...
                </span>
              )}
            </div>

            {/* Video Canvas & Player Box */}
            <div className="relative rounded-2xl overflow-hidden border border-neutral-700 bg-black shadow-xl aspect-video flex items-center justify-center">
              {activePreset ? (
                /* Preset Universal Canvas Player */
                <canvas
                  ref={presetCanvasRef}
                  width={640}
                  height={360}
                  className="w-full h-full object-contain"
                />
              ) : videoSrc ? (
                /* Native HTML5 Video Element */
                <video
                  ref={videoRef}
                  src={videoSrc}
                  playsInline
                  muted
                  onPlay={() => {
                    setErrorMessage(null);
                    setIsPlaying(true);
                    setIsWatchingVideo(true);
                    startWatcherInterval();
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    setIsWatchingVideo(false);
                    stopWatcherInterval();
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    setIsWatchingVideo(false);
                    stopWatcherInterval();
                  }}
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      setCurrentTime(videoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration);
                    }
                  }}
                  onError={() => {
                    if (!videoSrc) return;
                    setErrorMessage(
                      'Your video file codec may not be natively supported by your mobile browser. Click "Generate ASL Sign Video" or try a sample clip.'
                    );
                  }}
                  className="w-full h-full object-contain"
                />
              ) : null}

              {/* Live Subtitle Overlay Bar directly over video */}
              {activeSubtitleCue && (
                <div className="absolute bottom-4 inset-x-4 flex justify-center pointer-events-none">
                  <div className="bg-black/85 backdrop-blur-md border border-amber-400/50 rounded-xl px-4 py-2 text-center shadow-2xl max-w-lg animate-in fade-in zoom-in duration-200">
                    <div className="text-amber-300 font-bold text-sm sm:text-base tracking-wide drop-shadow-md">
                      "{activeSubtitleCue}"
                    </div>
                  </div>
                </div>
              )}

              {/* Big Center Play / Pause Click Overlay */}
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 transition-colors group"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {!isPlaying && (
                  <div className="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 ml-1" />
                  </div>
                )}
              </button>
            </div>

            {/* Video Controls Bar */}
            <div className="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3 space-y-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayPause}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                  title={isPlaying ? 'Pause video' : 'Play & Watch Video'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <button
                  onClick={handleRestart}
                  className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors shrink-0"
                  title="Replay from beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Scrubber Bar */}
                <input
                  type="range"
                  min={0}
                  max={duration || 10}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />

                <div className="text-[11px] font-mono text-neutral-400 shrink-0">
                  {currentTime.toFixed(1)}s / {(duration || 0).toFixed(1)}s
                </div>
              </div>
            </div>

            {/* Actions: Start Fresh, Download Video, or Batch Scan */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleStartFresh}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Start Fresh
              </button>

              {activePreset && (
                <button
                  onClick={handleExportCanvasVideo}
                  disabled={isExportingVideo}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors disabled:opacity-50"
                  title="Download animated ASL sign video"
                >
                  <Download className={`w-3.5 h-3.5 ${isExportingVideo ? 'animate-bounce' : ''}`} />
                  {isExportingVideo ? 'Exporting...' : 'Save Video (.webm)'}
                </button>
              )}

              <button
                disabled={isBatchScanning || isPlaying}
                onClick={handleBatchScanEntireVideo}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBatchScanning ? 'animate-spin' : ''}`} />
                {isBatchScanning ? 'Scanning Video...' : 'Scan Entire Video'}
              </button>
            </div>
          </div>

          {/* Right Column: Live Subtitle Stream & Translated Text */}
          <div className="lg:col-span-6 space-y-4">
            {displaySentence || displayGlosses.length > 0 ? (
              <div className="space-y-4">
                {/* Main Translated Text Box */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-neutral-900 to-cyan-950/30 border-2 border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-xl">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      TRANSLATED FROM VIDEO
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-400">
                      Language: {activeSignLanguage}
                    </span>
                  </div>

                  <div className="text-xl sm:text-2xl font-extrabold text-amber-300 tracking-tight leading-snug py-1">
                    "{displaySentence}"
                  </div>

                  {/* Sign Gloss Path */}
                  {displayGlosses.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-neutral-800/80">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                        Sign Path:
                      </span>
                      {displayGlosses.map((gloss, idx) => (
                        <React.Fragment key={idx}>
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-mono text-xs font-bold">
                            {gloss}
                          </span>
                          {idx < displayGlosses.length - 1 && (
                            <span className="text-neutral-500 text-xs">➔</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamped Cue Points */}
                {displayTimeline.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Signs Watched in Video
                    </h4>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {displayTimeline.map((cue, idx) => {
                        const isCurrent =
                          currentTime >= cue.timeSec &&
                          (idx === displayTimeline.length - 1 ||
                            currentTime < displayTimeline[idx + 1].timeSec);

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setCurrentTime(cue.timeSec);
                              if (activePreset) {
                                drawPresetFrame(activePreset, cue.timeSec);
                              } else if (videoRef.current) {
                                videoRef.current.currentTime = cue.timeSec;
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-3 transition-all ${
                              isCurrent
                                ? 'bg-indigo-600/20 border-indigo-500/60 text-white font-semibold'
                                : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300 hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-neutral-900 font-mono text-[10px] text-cyan-400 shrink-0">
                                {cue.timeSec.toFixed(1)}s
                              </span>
                              <span className="font-mono text-indigo-400 font-bold shrink-0">
                                [{cue.gloss}]
                              </span>
                              <span className="truncate text-neutral-200">"{cue.text}"</span>
                            </div>
                            <span className="text-[10px] text-neutral-500 shrink-0">Jump ➔</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => onSpeakText(displaySentence)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                    title="Speak translated text aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Speak Aloud
                  </button>

                  <button
                    onClick={handleCopyText}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 border border-neutral-700 transition-colors active:scale-95"
                    title="Copy text to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>

                  <button
                    onClick={handleAddToHistory}
                    disabled={addedToHistory}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 active:scale-95"
                    title="Save to session transcript log"
                  >
                    {addedToHistory ? (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <PlusCircle className="w-3.5 h-3.5" />
                    )}
                    {addedToHistory ? 'Saved to Transcripts' : 'Add to Transcripts'}
                  </button>
                </div>
              </div>
            ) : (
              /* Clean Empty State when video is loaded and waiting to be played */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-3 bg-neutral-950/60 rounded-2xl border border-dashed border-neutral-800">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  <Play className="w-6 h-6 ml-0.5 text-cyan-400" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  Ready to Translate
                </h4>
                <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                  Click the <strong>Play button (▶)</strong> on the video to start watching the signs. As the video plays, subtitles and text will generate live.
                </p>
                <button
                  onClick={requestPlay}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  Play Video & Translate Signs
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setShowGeneratorModal(true)}
            className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 font-semibold text-[11px]"
          >
            Generate ASL Video
          </button>
        </div>
      )}
    </div>
  );
};
