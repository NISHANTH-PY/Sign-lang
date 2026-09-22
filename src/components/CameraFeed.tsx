import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  VideoOff,
  FlipHorizontal,
  Zap,
  Sliders,
  Sparkles,
  Smartphone,
  BookOpen,
  Play,
  Pause,
  AlertCircle,
  HelpCircle,
  Eye,
  Activity,
  Layers,
} from 'lucide-react';
import { VideoDeviceOption } from '../types';

interface CameraFeedProps {
  onFrameCapture: (currentFrame: string, previousFrame?: string) => Promise<void>;
  isProcessing: boolean;
  autoTranslate: boolean;
  cadenceSeconds: number;
  onOpenPhoneModal: () => void;
  onOpenGuideModal: () => void;
  demoVideoActive: boolean;
  onToggleDemoVideo: (active: boolean) => void;
  selectedDemoGesture?: string;
  showAlignmentGuide?: boolean;
  latencyMs?: number;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  onFrameCapture,
  isProcessing,
  autoTranslate,
  cadenceSeconds,
  onOpenPhoneModal,
  onOpenGuideModal,
  demoVideoActive,
  onToggleDemoVideo,
  selectedDemoGesture,
  showAlignmentGuide = true,
  latencyMs,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const inFlightRef = useRef<boolean>(false);
  const loopTimerRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [devices, setDevices] = useState<VideoDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [motionLevel, setMotionLevel] = useState<number>(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const activeStreamRef = useRef<MediaStream | null>(null);
  const previousFrameRef = useRef<string | undefined>(undefined);
  const prevPixelsRef = useRef<Uint8ClampedArray | null>(null);

  // Sync inFlight ref
  useEffect(() => {
    inFlightRef.current = isProcessing;
  }, [isProcessing]);

  // List available video devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1} (${d.deviceId.slice(0, 5)})`,
          isBackCamera:
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment'),
        }));
      setDevices(videoInputs);
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
    }
  }, []);

  // Request camera stream
  const startCamera = useCallback(async () => {
    if (demoVideoActive) return;

    try {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      }

      setErrorMessage('');

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
            },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      activeStreamRef.current = newStream;
      setStream(newStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch((playErr: any) => {
          if (playErr.name !== 'AbortError') {
            console.warn('Video playback warning:', playErr);
          }
        });
      }

      // Check for torch capability
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as any) || {};
        setTorchSupported(Boolean(capabilities.torch));
      }

      await refreshDevices();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Camera access error:', err);
      setHasPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser address bar.'
          : err.name === 'NotFoundError'
          ? 'No camera found. Connect a webcam or scan the QR code to use your phone camera.'
          : `Camera error: ${err.message || 'Unable to open camera feed.'}`
      );
    }
  }, [demoVideoActive, selectedDeviceId, facingMode, refreshDevices]);

  // Clean up stream on unmount
  useEffect(() => {
    startCamera();
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      }
    };
  }, [startCamera]);

  // Handle Torch toggle
  const toggleTorch = async () => {
    if (!stream || !torchSupported) return;
    try {
      const track = stream.getVideoTracks()[0];
      if (track) {
        const nextState = !torchEnabled;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchEnabled(nextState);
      }
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Flip front/back camera (phone lens flip)
  const switchFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setSelectedDeviceId('');
    setIsMirrored(nextMode === 'user');
  };

  // Fast lightweight frame capture (420px, 0.62 JPEG for 15-20KB zero-lag payload)
  const captureAndSendFrame = useCallback(async () => {
    if (inFlightRef.current) return;

    const videoElement = videoRef.current;
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ultra-compact resolution: 420x236 produces tiny ~18KB payload for real-time speed
    const targetWidth = 420;
    const targetHeight = Math.round((videoElement.videoHeight / videoElement.videoWidth) * targetWidth);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

    // Fast motion analysis on 48x27 subcanvas to detect hand activity
    const motionCanvas = motionCanvasRef.current;
    let computedMotion = 0;

    if (motionCanvas) {
      const mWidth = 48;
      const mHeight = 27;
      motionCanvas.width = mWidth;
      motionCanvas.height = mHeight;
      const mCtx = motionCanvas.getContext('2d', { willReadFrequently: true });
      if (mCtx) {
        mCtx.drawImage(canvas, 0, 0, mWidth, mHeight);
        const imgData = mCtx.getImageData(0, 0, mWidth, mHeight).data;

        if (prevPixelsRef.current) {
          let diffSum = 0;
          const prev = prevPixelsRef.current;
          for (let i = 0; i < imgData.length; i += 4) {
            diffSum += Math.abs(imgData[i] - prev[i]) + Math.abs(imgData[i + 1] - prev[i + 1]);
          }
          computedMotion = diffSum / (mWidth * mHeight * 2);
          setMotionLevel(Math.min(100, Math.round(computedMotion * 8)));
        }
        prevPixelsRef.current = new Uint8ClampedArray(imgData);
      }
    }

    const currentFrameDataUrl = canvas.toDataURL('image/jpeg', 0.62);
    const prevFrame = previousFrameRef.current;
    previousFrameRef.current = currentFrameDataUrl;

    inFlightRef.current = true;
    try {
      await onFrameCapture(currentFrameDataUrl, prevFrame);
    } finally {
      inFlightRef.current = false;
    }
  }, [onFrameCapture]);

  // Zero-Lag Self-Scheduling Capture Loop
  useEffect(() => {
    let isCancelled = false;

    const runLoop = async () => {
      if (!autoTranslate || isCancelled) return;

      // Only capture if not currently waiting for a network response
      if (!inFlightRef.current) {
        await captureAndSendFrame();
      }

      // Schedule next execution strictly after previous finishes
      const delayMs = Math.max(700, Math.round(cadenceSeconds * 1000));
      loopTimerRef.current = window.setTimeout(runLoop, delayMs);
    };

    if (autoTranslate) {
      loopTimerRef.current = window.setTimeout(runLoop, 600);
    }

    return () => {
      isCancelled = true;
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
      }
    };
  }, [autoTranslate, cadenceSeconds, captureAndSendFrame]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-2xl group">
      {/* Hidden processing canvases */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={motionCanvasRef} className="hidden" />

      {/* Main Camera Video Display */}
      <div className="relative aspect-video w-full flex items-center justify-center bg-black overflow-hidden">
        {demoVideoActive ? (
          /* Animated Demonstration / Practice Simulation Feed */
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950/60 to-black p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center mb-4 animate-pulse">
              <Sparkles className="w-12 h-12 text-indigo-300" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Practice & Simulation Mode</h3>
            <p className="text-sm text-neutral-300 max-w-md mb-4">
              Demonstrating: <span className="text-amber-300 font-semibold">{selectedDemoGesture || 'ASL / BSL Signs'}</span>
            </p>
            <button
              onClick={() => onToggleDemoVideo(false)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
              Switch Back to Live Camera Feed
            </button>
          </div>
        ) : hasPermission === false ? (
          /* Error / Permission Denied State */
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
              <VideoOff className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Camera Feed Unavailable</h3>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              {errorMessage || 'Allow camera access in your browser or connect your phone as a portable signer camera.'}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
              <button
                onClick={onOpenPhoneModal}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-2 border border-neutral-700 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                Use Phone Camera
              </button>
            </div>
          </div>
        ) : (
          /* Live Camera Stream Video */
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform duration-200 ${
                isMirrored ? 'scale-x-[-1]' : 'scale-x-100'
              }`}
            />

            {/* Visual Signing Alignment Guide Box (Helps accurate recognition!) */}
            {showAlignmentGuide && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-7/12 sm:w-1/2 aspect-square max-w-sm rounded-3xl border-2 border-dashed border-indigo-400/40 bg-indigo-950/5 flex flex-col items-center justify-between p-4 transition-all">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900/80 backdrop-blur-md text-[10px] font-medium text-indigo-300 border border-indigo-500/30">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    Optimal Signing Box (Chest & Hands)
                  </div>
                  <div className="flex items-center justify-between w-full text-[10px] text-neutral-400/70">
                    <span>Left Hand</span>
                    <span>Right Hand</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Top Status & Controls Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto z-20">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Camera Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/85 backdrop-blur-md border border-neutral-700/80 text-white text-xs font-medium shadow-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span>{demoVideoActive ? 'Demo Video' : facingMode === 'user' ? 'Front Camera' : 'Rear Camera'}</span>
            </div>

            {/* Processing / In-flight Indicator with Latency */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-900/85 backdrop-blur-md border border-neutral-700/80 text-xs shadow-lg">
              {isProcessing ? (
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span className="font-semibold text-[11px]">Translating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-mono">
                    {latencyMs ? `⚡ ${latencyMs}ms` : '⚡ Ultra-Fast'}
                  </span>
                </div>
              )}
            </div>

            {/* Hand Motion Level Gauge */}
            {motionLevel > 15 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] text-emerald-300 backdrop-blur-md animate-pulse">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Signing Active</span>
              </div>
            )}
          </div>

          {/* Quick Camera Action Controls */}
          <div className="flex items-center gap-2">
            {/* Mirror Toggle */}
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className={`p-2 rounded-xl backdrop-blur-md border transition-colors shadow-lg ${
                isMirrored
                  ? 'bg-neutral-900/90 text-indigo-300 border-indigo-500/40'
                  : 'bg-neutral-900/80 text-neutral-300 border-neutral-700'
              }`}
              title={isMirrored ? 'Disable Mirroring' : 'Enable Mirroring'}
              aria-label="Toggle Mirror"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>

            {/* Front/Rear Lens Switcher */}
            <button
              onClick={switchFacingMode}
              className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 backdrop-blur-md transition-colors shadow-lg"
              title="Switch Front/Rear Camera (Phone)"
              aria-label="Switch Camera Facing Mode"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Torch Flashlight (if supported on mobile) */}
            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-xl backdrop-blur-md border transition-colors shadow-lg ${
                  torchEnabled
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-neutral-900/80 text-neutral-300 border-neutral-700'
                }`}
                title={torchEnabled ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            {/* Device Selector Dropdown (if multiple cameras detected) */}
            {devices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                }}
                className="bg-neutral-900/90 text-neutral-200 border border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs backdrop-blur-md focus:outline-none focus:border-indigo-500"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
