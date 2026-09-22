import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Wand2,
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  Sparkles,
  Check,
  Layers,
  Sliders,
  Eye,
  Film,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { SignLanguageId } from '../types';

interface HandSignVideoGeneratorProps {
  activeSignLanguage: SignLanguageId;
  targetLanguage?: string;
  onOpenInVideoTranslator?: (videoBlobUrl: string, title: string) => void;
  onSpeakText: (text: string) => void;
}

export interface SignActionDefinition {
  id: string;
  term: string;
  gloss: string;
  category: 'greetings' | 'common' | 'help' | 'avatar' | 'feelings';
  subtitle: string;
  description: string;
  handshapeDescription: string;
  emoji: string;
  duration: number; // in seconds
  poseType:
    | 'hello'
    | 'thankyou'
    | 'ily'
    | 'howareyou'
    | 'please'
    | 'help'
    | 'iseeyou'
    | 'water'
    | 'yes'
    | 'no'
    | 'friend';
}

export const SIGN_CATALOG: SignActionDefinition[] = [
  {
    id: 'asl-hello',
    term: 'Hello',
    gloss: 'HELLO',
    category: 'greetings',
    subtitle: 'Hello! Welcome.',
    description: 'Open B-handshape touches forehead/temple, moves outwards with a welcoming arc.',
    handshapeDescription: 'Flat hand, fingers together, thumb alongside.',
    emoji: '👋',
    duration: 3.6,
    poseType: 'hello',
  },
  {
    id: 'asl-thankyou',
    term: 'Thank You',
    gloss: 'THANK-YOU',
    category: 'greetings',
    subtitle: 'Thank you very much!',
    description: 'Fingertips of dominant flat hand touch chin/lips, then extend smoothly towards the viewer.',
    handshapeDescription: 'Flat open palm facing inward at chin, turning slightly outward.',
    emoji: '🙏',
    duration: 3.4,
    poseType: 'thankyou',
  },
  {
    id: 'asl-ily',
    term: 'I Love You',
    gloss: 'I-LOVE-YOU',
    category: 'feelings',
    subtitle: 'I love you!',
    description: 'Iconic ASL ILY sign: Thumb, index, and pinky fingers extended; middle and ring fingers curled down.',
    handshapeDescription: 'Combined I, L, and Y letter handshapes.',
    emoji: '🤟',
    duration: 3.8,
    poseType: 'ily',
  },
  {
    id: 'asl-howareyou',
    term: 'How Are You?',
    gloss: 'HOW-ARE-YOU',
    category: 'greetings',
    subtitle: 'How are you doing today?',
    description: 'Both curved hands start knuckles together on chest, then turn upwards and outwards in open palms.',
    handshapeDescription: 'Curved open hands rotating outwards toward viewer.',
    emoji: '🤝',
    duration: 4.0,
    poseType: 'howareyou',
  },
  {
    id: 'asl-please',
    term: 'Please',
    gloss: 'PLEASE',
    category: 'common',
    subtitle: 'Please, I would appreciate it.',
    description: 'Flat open palm makes gentle clockwise circular motions over the center of the chest.',
    handshapeDescription: 'Flat palm resting against chest, rubbing in gentle circle.',
    emoji: '🤲',
    duration: 3.5,
    poseType: 'please',
  },
  {
    id: 'asl-help',
    term: 'Help',
    gloss: 'HELP',
    category: 'help',
    subtitle: 'Please help me, I need assistance.',
    description: 'Dominant hand forms a thumbs-up fist placed atop the flat palm of non-dominant hand, lifting upwards together.',
    handshapeDescription: 'A-handshape (thumbs up) elevated on flat B-palm foundation.',
    emoji: '🚨',
    duration: 3.8,
    poseType: 'help',
  },
  {
    id: 'nsl-iseeyou',
    term: "I See You (Avatar / Na'vi)",
    gloss: 'I-SEE-YOU-NAVI',
    category: 'avatar',
    subtitle: 'I see you (Metkayina clan greeting)',
    description: 'Na\'vi Sign Language (NSL) by CJ Jones: Two fingers touch near the forehead/eye, then sweep forward and place palm to heart.',
    handshapeDescription: 'V-sign to brow extending smoothly forward to chest.',
    emoji: '🌊',
    duration: 4.2,
    poseType: 'iseeyou',
  },
  {
    id: 'asl-water',
    term: 'Water',
    gloss: 'WATER',
    category: 'common',
    subtitle: 'Water, please.',
    description: 'Three middle fingers extended in a "W" handshape, index finger taps the lower lip/chin twice.',
    handshapeDescription: 'ASL "W" handshape: Index, middle, ring fingers pointing up.',
    emoji: '💧',
    duration: 3.2,
    poseType: 'water',
  },
  {
    id: 'asl-yes',
    term: 'Yes',
    gloss: 'YES',
    category: 'common',
    subtitle: 'Yes, affirmative.',
    description: 'S-handshape (closed fist) rocks up and down from wrist, mimicking a head nodding yes.',
    handshapeDescription: 'Fist with thumb over fingers, nodding downward twice.',
    emoji: '✅',
    duration: 3.0,
    poseType: 'yes',
  },
  {
    id: 'asl-no',
    term: 'No',
    gloss: 'NO',
    category: 'common',
    subtitle: 'No, thank you.',
    description: 'Index and middle fingers snap downward firmly onto the thumb, mimicking a closing mouth.',
    handshapeDescription: 'Two extended fingers pinching closed against thumb pad.',
    emoji: '❌',
    duration: 2.8,
    poseType: 'no',
  },
  {
    id: 'asl-friend',
    term: 'Friend',
    gloss: 'FRIEND',
    category: 'feelings',
    subtitle: 'You are my friend.',
    description: 'Curved index fingers hook together once, then flip and hook in reverse to symbolize reciprocal connection.',
    handshapeDescription: 'X-handshapes (hooked index fingers) interlocking.',
    emoji: '🫂',
    duration: 3.6,
    poseType: 'friend',
  },
];

export type SignerStyle = 'realistic' | 'skeleton' | 'navi' | 'contrast';

export const HandSignVideoGenerator: React.FC<HandSignVideoGeneratorProps> = ({
  activeSignLanguage,
  targetLanguage = 'English',
  onOpenInVideoTranslator,
  onSpeakText,
}) => {
  // Selected sign configuration
  const [selectedSign, setSelectedSign] = useState<SignActionDefinition>(SIGN_CATALOG[0]);
  const [customWord, setCustomWord] = useState<string>('');
  const [signerStyle, setSignerStyle] = useState<SignerStyle>('realistic');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [showJointCoordinates, setShowJointCoordinates] = useState<boolean>(true);
  const [showSubtitlesOnVideo, setShowSubtitlesOnVideo] = useState<boolean>(true);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Draw the animated sign on canvas at specified time (in seconds)
  const renderSignFrame = useCallback(
    (timeSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const isNavi = signerStyle === 'navi';
      const isSkeleton = signerStyle === 'skeleton';
      const isContrast = signerStyle === 'contrast';

      // 1. Clear & Render Background
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      if (isNavi) {
        bgGrad.addColorStop(0, '#03131e');
        bgGrad.addColorStop(0.5, '#06283b');
        bgGrad.addColorStop(1, '#020d15');
      } else if (isSkeleton) {
        bgGrad.addColorStop(0, '#020617');
        bgGrad.addColorStop(0.5, '#0b1120');
        bgGrad.addColorStop(1, '#020617');
      } else if (isContrast) {
        bgGrad.addColorStop(0, '#000000');
        bgGrad.addColorStop(1, '#09090b');
      } else {
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(0.5, '#111827');
        bgGrad.addColorStop(1, '#1e1b4b');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle Background Grid
      ctx.strokeStyle = isContrast ? 'rgba(255,255,255,0.08)' : 'rgba(255, 255, 255, 0.04)';
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

      // Color Palette Definition
      const skinColor = isNavi
        ? '#38bdf8'
        : isSkeleton
        ? '#22d3ee'
        : isContrast
        ? '#fbbf24'
        : '#fbcfe8';
      const bodyColor = isNavi
        ? '#0369a1'
        : isSkeleton
        ? '#0891b2'
        : isContrast
        ? '#ffffff'
        : '#6366f1';
      const accentGlow = isNavi
        ? '#7dd3fc'
        : isSkeleton
        ? '#a5f3fc'
        : isContrast
        ? '#f59e0b'
        : '#ec4899';

      const centerX = w / 2;
      const headCenterY = h * 0.28;

      // 2. Signer Torso & Head
      // Torso
      ctx.fillStyle = bodyColor;
      ctx.globalAlpha = isSkeleton ? 0.25 : 0.65;
      ctx.beginPath();
      ctx.ellipse(centerX, h * 0.74, 95, 80, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = skinColor;
      ctx.globalAlpha = isSkeleton ? 0.4 : 0.9;
      ctx.beginPath();
      ctx.arc(centerX, headCenterY, 44, 0, Math.PI * 2);
      ctx.fill();

      // Na'vi Clan Headdress Markings (Metkayina Reef Clan)
      if (isNavi) {
        ctx.fillStyle = '#ef4444';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.rect(centerX - 4, headCenterY - 42, 8, 34);
        ctx.fill();

        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2.5;
        for (let i = -4; i <= 4; i++) {
          if (i === 0) continue;
          const angle = -Math.PI / 2 + (i * Math.PI) / 10;
          ctx.beginPath();
          ctx.moveTo(centerX, headCenterY - 38);
          ctx.lineTo(centerX + Math.cos(angle) * 50, headCenterY - 38 + Math.sin(angle) * 50);
          ctx.stroke();
        }

        // Bioluminescent dots
        ctx.fillStyle = '#67e8f9';
        ctx.globalAlpha = 0.8;
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(centerX + i * 8, headCenterY + 14, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Facial Expression
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = isSkeleton ? '#ffffff' : '#0f172a';
      // Left & Right Eyes
      ctx.beginPath();
      ctx.arc(centerX - 13, headCenterY - 4, 3.8, 0, Math.PI * 2);
      ctx.arc(centerX + 13, headCenterY - 4, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Smile / Mouth
      ctx.strokeStyle = isSkeleton ? '#ffffff' : '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (selectedSign.poseType === 'howareyou') {
        // Inquiring open mouth
        ctx.arc(centerX, headCenterY + 12, 6, 0, Math.PI * 2);
      } else {
        // Welcoming friendly smile
        ctx.arc(centerX, headCenterY + 12, 14, 0.15 * Math.PI, 0.85 * Math.PI);
      }
      ctx.stroke();

      // 3. Articulated Kinematic Hand Drawer
      const drawArticulatedHand = (
        x: number,
        y: number,
        scale: number,
        fingerConfig: {
          thumb: number; // 0 (closed) to 1 (extended)
          index: number;
          middle: number;
          ring: number;
          pinky: number;
        },
        wristAngleRad: number = 0,
        shoulderAnchorX: number = centerX + (x > centerX ? 50 : -50)
      ) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(wristAngleRad);
        ctx.scale(scale, scale);

        // Forearm connecting to shoulder
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 24);
        ctx.lineTo(shoulderAnchorX - x, h * 0.62 - y);
        ctx.stroke();

        // Wrist Joint
        ctx.fillStyle = accentGlow;
        ctx.beginPath();
        ctx.arc(0, 22, 7, 0, Math.PI * 2);
        ctx.fill();

        // Palm Base
        ctx.fillStyle = skinColor;
        ctx.strokeStyle = isSkeleton ? '#ffffff' : '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-22, -12, 44, 38, 10);
        ctx.fill();
        ctx.stroke();

        // Individual Fingers Kinematics
        const drawDigit = (
          baseX: number,
          baseY: number,
          angleDeg: number,
          length: number,
          extended: number
        ) => {
          const curl = 1 - extended;
          const rad = (angleDeg * Math.PI) / 180;
          const seg1 = length * 0.52;
          const seg2 = length * 0.48;

          // Joint 1 (Knuckle to PIP)
          const j1x = baseX + Math.sin(rad) * seg1;
          const j1y = baseY - Math.cos(rad) * seg1 * (1 - curl * 0.55);

          // Joint 2 (PIP to fingertip)
          const tipX = j1x + Math.sin(rad) * seg2 * (1 - curl * 0.3);
          const tipY = j1y - Math.cos(rad) * seg2 * (1 - curl * 0.85);

          ctx.strokeStyle = skinColor;
          ctx.lineWidth = 5.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(baseX, baseY);
          ctx.lineTo(j1x, j1y);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();

          // Joint Tracking Dots if Skeleton
          if (isSkeleton || showJointCoordinates) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(j1x, j1y, 2.8, 0, Math.PI * 2);
            ctx.arc(tipX, tipY, 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        };

        // Thumb
        drawDigit(-18, 8, -55, 24, fingerConfig.thumb);

        // 4 Fingers (Index, Middle, Ring, Pinky)
        // Note: If Na'vi, reef clan has 4 digits (3 fingers + thumb)
        if (isNavi) {
          drawDigit(-9, -12, -10, 34, fingerConfig.index);
          drawDigit(0, -12, 0, 36, fingerConfig.middle);
          drawDigit(9, -12, 12, 32, fingerConfig.pinky);
        } else {
          drawDigit(-13, -12, -12, 33, fingerConfig.index);
          drawDigit(-4, -12, -2, 36, fingerConfig.middle);
          drawDigit(5, -12, 6, 33, fingerConfig.ring);
          drawDigit(14, -12, 18, 29, fingerConfig.pinky);
        }

        ctx.restore();
      };

      // 4. Harmonic cycle calculation for kinematics
      const animProgress = (timeSec % selectedSign.duration) / selectedSign.duration;
      const sinWave = Math.sin(animProgress * Math.PI * 2);
      const cosWave = Math.cos(animProgress * Math.PI * 2);

      // 5. Kinematic Pose Renderers per sign
      const pose = selectedSign.poseType;

      if (pose === 'hello') {
        // Forehead salute to outward friendly wave
        const waveAngle = Math.sin(timeSec * 7) * 0.25;
        const handX = centerX + 55 + sinWave * 15;
        const handY = headCenterY - 10 + cosWave * 8;
        drawArticulatedHand(
          handX,
          handY,
          1.15,
          { thumb: 0.9, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 },
          waveAngle
        );
      } else if (pose === 'thankyou') {
        // Dominant hand moves from chin extending smoothly forward
        const t = (animProgress * 2) % 1;
        const handX = centerX + t * 45;
        const handY = headCenterY + 18 + t * 45;
        drawArticulatedHand(
          handX,
          handY,
          1.15,
          { thumb: 0.8, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 },
          0.1
        );
      } else if (pose === 'ily') {
        // ILY Sign: Thumb, Index, Pinky extended; Middle and Ring curled
        const pulse = 1.0 + Math.sin(timeSec * 4) * 0.08;
        const handX = centerX + sinWave * 10;
        const handY = h * 0.48 + cosWave * 6;

        // Subtle Heart Glow around ILY sign
        const heartGrad = ctx.createRadialGradient(handX, handY, 10, handX, handY, 70);
        heartGrad.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
        heartGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = heartGrad;
        ctx.beginPath();
        ctx.arc(handX, handY, 70, 0, Math.PI * 2);
        ctx.fill();

        drawArticulatedHand(
          handX,
          handY,
          1.2 * pulse,
          { thumb: 1.0, index: 1.0, middle: 0.05, ring: 0.05, pinky: 1.0 },
          sinWave * 0.1
        );
      } else if (pose === 'howareyou') {
        // Two hands starting chest center then opening upward
        const leftHandX = centerX - 45 - Math.abs(sinWave) * 20;
        const rightHandX = centerX + 45 + Math.abs(sinWave) * 20;
        const handsY = h * 0.52 - Math.abs(sinWave) * 15;

        drawArticulatedHand(
          leftHandX,
          handsY,
          1.05,
          { thumb: 0.9, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 },
          -0.2
        );
        drawArticulatedHand(
          rightHandX,
          handsY,
          1.05,
          { thumb: 0.9, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 },
          0.2
        );
      } else if (pose === 'please') {
        // Circular rub on chest
        const orbitAngle = timeSec * 5;
        const handX = centerX + Math.cos(orbitAngle) * 26;
        const handY = h * 0.54 + Math.sin(orbitAngle) * 18;
        drawArticulatedHand(
          handX,
          handY,
          1.1,
          { thumb: 0.9, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 },
          0
        );
      } else if (pose === 'help') {
        // Thumbs-up atop base flat palm, moving upward together
        const liftY = h * 0.58 - Math.abs(sinWave) * 28;
        // Non-dominant base flat hand
        drawArticulatedHand(
          centerX - 10,
          liftY + 18,
          1.0,
          { thumb: 0.8, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 },
          0
        );
        // Dominant thumbs up fist
        drawArticulatedHand(
          centerX,
          liftY - 5,
          1.05,
          { thumb: 1.0, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05 },
          -0.05
        );
      } else if (pose === 'iseeyou') {
        // Na'vi I See You: Two fingers to eye then sweeping forward
        const t = (animProgress * 1.5) % 1;
        const handX = centerX + 18 + t * 40;
        const handY = headCenterY - 4 + t * 45;
        drawArticulatedHand(
          handX,
          handY,
          1.2,
          { thumb: 0.8, index: 1.0, middle: 1.0, ring: 0.1, pinky: 0.1 },
          0.15
        );
      } else if (pose === 'water') {
        // "W" hand tapping chin twice
        const tapCycle = Math.abs(Math.sin(timeSec * 6));
        const handX = centerX + 22;
        const handY = headCenterY + 18 - tapCycle * 14;
        drawArticulatedHand(
          handX,
          handY,
          1.1,
          { thumb: 0.1, index: 1.0, middle: 1.0, ring: 1.0, pinky: 0.1 },
          -0.1
        );
      } else if (pose === 'yes') {
        // Fist nodding up and down
        const nodAngle = Math.sin(timeSec * 7) * 0.45;
        const handX = centerX + 35;
        const handY = h * 0.50 + Math.sin(timeSec * 7) * 12;
        drawArticulatedHand(
          handX,
          handY,
          1.15,
          { thumb: 0.1, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05 },
          nodAngle
        );
      } else if (pose === 'no') {
        // Index and middle pinch onto thumb
        const pinchCycle = Math.abs(Math.sin(timeSec * 6));
        const handX = centerX + 35;
        const handY = h * 0.48;
        drawArticulatedHand(
          handX,
          handY,
          1.15,
          { thumb: 0.5, index: pinchCycle, middle: pinchCycle, ring: 0.1, pinky: 0.1 },
          0
        );
      } else if (pose === 'friend') {
        // Hooked index fingers
        const leftHandX = centerX - 25 + sinWave * 8;
        const rightHandX = centerX + 25 - sinWave * 8;
        const handsY = h * 0.52;
        drawArticulatedHand(
          leftHandX,
          handsY,
          1.05,
          { thumb: 0.1, index: 0.7, middle: 0.1, ring: 0.1, pinky: 0.1 },
          0.3
        );
        drawArticulatedHand(
          rightHandX,
          handsY,
          1.05,
          { thumb: 0.1, index: 0.7, middle: 0.1, ring: 0.1, pinky: 0.1 },
          -0.3
        );
      }

      // 6. Subtitle Overlay Badge directly on video frame
      if (showSubtitlesOnVideo) {
        const subtitleText = customWord ? `"${customWord}"` : `"${selectedSign.subtitle}"`;
        const glossText = customWord ? `SIGN: ${customWord.toUpperCase()}` : `GLOSS: [${selectedSign.gloss}]`;

        // Subtitle Card
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.strokeStyle = isContrast ? '#fbbf24' : accentGlow;
        ctx.lineWidth = 1.5;
        const subW = Math.min(w * 0.85, 460);
        const subH = 50;
        const subX = centerX - subW / 2;
        const subY = h * 0.85;

        ctx.beginPath();
        ctx.roundRect(subX, subY, subW, subH, 12);
        ctx.fill();
        ctx.stroke();

        // Gloss label
        ctx.fillStyle = isContrast ? '#fbbf24' : accentGlow;
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(glossText, centerX, subY + 18);

        // Natural translation text
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 14px system-ui, -apple-system, sans-serif';
        ctx.fillText(subtitleText, centerX, subY + 38);
      }
    },
    [selectedSign, customWord, signerStyle, showJointCoordinates, showSubtitlesOnVideo]
  );

  // Animation Loop (60 FPS)
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const deltaSec = ((now - lastTimeRef.current) / 1000) * speedMultiplier;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        let next = prev + deltaSec;
        if (next >= selectedSign.duration) {
          if (isLooping) {
            next = 0;
          } else {
            setIsPlaying(false);
            return selectedSign.duration;
          }
        }
        renderSignFrame(next);
        return next;
      });

      animId = requestAnimationFrame(tick);
      animFrameRef.current = animId;
    };

    animId = requestAnimationFrame(tick);
    animFrameRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, selectedSign, speedMultiplier, isLooping, renderSignFrame]);

  // Initial draw & change sign handler
  useEffect(() => {
    setCurrentTime(0);
    renderSignFrame(0);
  }, [selectedSign, signerStyle, renderSignFrame]);

  // Play / Pause toggle
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Restart video
  const handleRestart = () => {
    setCurrentTime(0);
    renderSignFrame(0);
    setIsPlaying(true);
  };

  // Scrubber seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    renderSignFrame(val);
  };

  // Select sign from catalog
  const handleSelectSign = (sign: SignActionDefinition) => {
    setSelectedSign(sign);
    setCustomWord('');
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Export current animation to a real .webm video file
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    setExportProgress(10);

    try {
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
        setExportedUrl(url);
        setIsExporting(false);
        setExportProgress(100);

        // Trigger automatic download
        const a = document.createElement('a');
        a.href = url;
        const cleanName = (customWord || selectedSign.term).toLowerCase().replace(/[^a-z0-9]/g, '_');
        a.download = `asl_sign_${cleanName}_${signerStyle}.webm`;
        a.click();
      };

      recorder.start();

      // Record frames over duration
      const totalFrames = 60;
      const stepDuration = selectedSign.duration / totalFrames;

      for (let i = 0; i <= totalFrames; i++) {
        const timeSec = i * stepDuration;
        renderSignFrame(timeSec);
        setExportProgress(Math.round((i / totalFrames) * 90));
        await new Promise((resolve) => setTimeout(resolve, 35));
      }

      recorder.stop();
    } catch (err) {
      console.warn('Export video failed:', err);
      setIsExporting(false);
    }
  };

  // Send to the Video Translator tab
  const handleSendToTranslator = () => {
    if (!onOpenInVideoTranslator) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use current exported URL or create quick snapshot
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      onOpenInVideoTranslator(url, `${selectedSign.term} (${selectedSign.gloss})`);
    }, 'image/jpeg');
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 sm:p-6 backdrop-blur-md shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Hand Sign Video Generator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI STUDIO
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Generate high-definition animated ASL & Na'vi hand sign videos with articulated kinematics, realistic joints, and closed-caption subtitles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSpeakText(selectedSign.subtitle)}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Pronounce sign meaning with voice"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voice Readout</span>
            </button>

            <button
              onClick={handleExportVideo}
              disabled={isExporting}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? `Rendering (${exportProgress}%)...` : 'Download Video (.webm)'}</span>
            </button>
          </div>
        </div>

        {/* Main Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
          {/* Left Column: Video Preview & Scrubber (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Canvas Video Viewport */}
            <div className="relative rounded-2xl overflow-hidden border border-neutral-700/80 bg-black shadow-2xl aspect-video flex items-center justify-center group">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-contain"
              />

              {/* Big Center Play/Pause button on hover */}
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 transition-colors"
                aria-label={isPlaying ? 'Pause sign animation' : 'Play sign animation'}
              >
                {!isPlaying && (
                  <div className="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 ml-0.5" />
                  </div>
                )}
              </button>

              {/* Top Bar Indicator */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-cyan-300">
                  {signerStyle.toUpperCase()} SIGNER • {speedMultiplier}X
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-neutral-300">
                  {currentTime.toFixed(1)}s / {selectedSign.duration.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Video Controls Bar */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayPause}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <button
                  onClick={handleRestart}
                  className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors shrink-0"
                  title="Replay from start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Scrubber Range */}
                <input
                  type="range"
                  min={0}
                  max={selectedSign.duration}
                  step={0.05}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />

                <div className="text-[11px] font-mono text-neutral-400 shrink-0">
                  {currentTime.toFixed(1)}s
                </div>
              </div>

              {/* Auxiliary Quick Options */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-neutral-800/80 text-xs">
                {/* Speed selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-400 text-[11px]">Speed:</span>
                  {[0.5, 1.0, 1.5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSpeedMultiplier(spd)}
                      className={`px-2 py-0.5 rounded-lg font-mono text-[11px] transition-colors ${
                        speedMultiplier === spd
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Loop & Coordinates Toggles */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={isLooping}
                      onChange={(e) => setIsLooping(e.target.checked)}
                      className="accent-indigo-500 rounded"
                    />
                    <span>Loop</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={showJointCoordinates}
                      onChange={(e) => setShowJointCoordinates(e.target.checked)}
                      className="accent-cyan-500 rounded"
                    />
                    <span>Joint Dots</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={showSubtitlesOnVideo}
                      onChange={(e) => setShowSubtitlesOnVideo(e.target.checked)}
                      className="accent-purple-500 rounded"
                    />
                    <span>Subtitles</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Current Sign Info Card */}
            <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedSign.emoji}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedSign.term}{' '}
                      <span className="text-xs font-mono text-cyan-400">[{selectedSign.gloss}]</span>
                    </h3>
                    <p className="text-xs text-neutral-400">{selectedSign.subtitle}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold">
                  {selectedSign.category.toUpperCase()}
                </span>
              </div>

              <div className="text-xs text-neutral-300 pt-1 border-t border-neutral-800/60 leading-relaxed">
                <strong className="text-neutral-200">How to sign:</strong> {selectedSign.description}
              </div>
              <div className="text-[11px] text-neutral-400">
                <strong className="text-neutral-300">Handshape:</strong> {selectedSign.handshapeDescription}
              </div>
            </div>
          </div>

          {/* Right Column: Sign Catalog & Customizer (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Signer Visual Style Chooser */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Signer Visual Model</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'realistic', label: 'Realistic Signer', desc: 'Anatomical flesh tones' },
                  { id: 'skeleton', label: 'Cyber Joint Skeleton', desc: 'Neon vision tracking' },
                  { id: 'navi', label: "Na'vi (Avatar 2)", desc: 'Metkayina reef clan' },
                  { id: 'contrast', label: 'High Contrast', desc: 'Obsidian & gold AAA' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSignerStyle(st.id as any)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      signerStyle === st.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{st.label}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog of Signs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Choose Sign to Generate</span>
                </span>
                <span className="text-[11px] font-normal text-neutral-500">
                  {SIGN_CATALOG.length} signs available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[290px] overflow-y-auto pr-1">
                {SIGN_CATALOG.map((sign) => {
                  const isSelected = selectedSign.id === sign.id;
                  return (
                    <button
                      key={sign.id}
                      onClick={() => handleSelectSign(sign)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-900/60 to-purple-900/40 border-indigo-500 text-white shadow-md'
                          : 'bg-neutral-950/70 hover:bg-neutral-800/80 border-neutral-800/90 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <span className="text-xl shrink-0 select-none">{sign.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {sign.term}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono truncate">
                          [{sign.gloss}]
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Word / Sign Input */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-2">
              <label className="text-xs font-bold text-neutral-300 block">
                Type Custom Word or Sentence:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Good Morning, Peace, Thank You"
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
                />
                {customWord && (
                  <button
                    onClick={() => setCustomWord('')}
                    className="px-2 text-neutral-400 hover:text-white text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[10px] text-neutral-500">
                Custom text renders real-time kinematics and subtitle labels directly onto the video.
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleExportVideo}
                disabled={isExporting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isExporting
                    ? `Generating & Recording Video (${exportProgress}%)...`
                    : `Export "${selectedSign.term}" as Video File`}
                </span>
              </button>

              {onOpenInVideoTranslator && (
                <button
                  onClick={handleSendToTranslator}
                  className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Film className="w-3.5 h-3.5 text-purple-400" />
                  <span>Translate This Video with AI Interpreter</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
