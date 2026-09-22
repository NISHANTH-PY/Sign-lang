import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Volume2,
  Copy,
  Check,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  FileText,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { ImageTranslationResult, SignLanguageId } from '../types';

interface ImageSignTranslatorProps {
  activeSignLanguage: SignLanguageId;
  targetLanguage?: string;
  onAddToTranscripts: (subtitle: string, gloss: string, signLanguage: SignLanguageId) => void;
  onSpeakText: (text: string) => void;
}

// Sample presets for quick one-click testing
const SAMPLE_PRESET_IMAGES = [
  {
    id: 'sample-hello',
    name: 'Hello & Welcome (ASL)',
    gloss: 'HELLO WELCOME',
    expectedText: 'Hello and welcome!',
    signLanguage: 'ASL' as SignLanguageId,
    description: 'Forehead salute outward (HELLO) + open flat hands sweeping inward (WELCOME)',
    iconEmoji: '👋',
  },
  {
    id: 'sample-thankyou',
    name: 'Thank You Very Much (ASL)',
    gloss: 'THANK-YOU VERY-MUCH',
    expectedText: 'Thank you very much!',
    signLanguage: 'ASL' as SignLanguageId,
    description: 'Fingertips touch chin and extend outward toward the listener',
    iconEmoji: '🙏',
  },
  {
    id: 'sample-ily',
    name: 'I Love You (ASL)',
    gloss: 'I-LOVE-YOU',
    expectedText: 'I love you.',
    signLanguage: 'ASL' as SignLanguageId,
    description: 'Hand raised with thumb, index, and pinky finger extended (ILY handshape)',
    iconEmoji: '🤟',
  },
  {
    id: 'sample-emergency',
    name: 'Need Help (Emergency ASL)',
    gloss: 'HELP PLEASE',
    expectedText: 'Please help me, I need assistance.',
    signLanguage: 'ASL' as SignLanguageId,
    description: 'Closed fist with thumb up placed on flat base palm and lifted upwards',
    iconEmoji: '🚨',
  },
];

export const ImageSignTranslator: React.FC<ImageSignTranslatorProps> = ({
  activeSignLanguage,
  targetLanguage = 'English',
  onAddToTranscripts,
  onSpeakText,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [translationResult, setTranslationResult] = useState<ImageTranslationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [addedToHistory, setAddedToHistory] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to generate an SVG placeholder or image canvas for quick presets
  const createPresetImage = (sample: typeof SAMPLE_PRESET_IMAGES[0]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Modern gradient card background
    const grad = ctx.createLinearGradient(0, 0, 640, 400);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(1, '#1E1B4B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 400);

    // Decorative grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }
    for (let y = 0; y < 400; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 600, 360);

    // Large emoji
    ctx.font = '60px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sample.iconEmoji, 320, 110);

    // Title
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(sample.name, 320, 160);

    // Gloss badge
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText(`[ ${sample.gloss} ]`, 320, 200);

    // Description
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(sample.description, 320, 250);

    // Expected text
    ctx.font = 'italic 18px sans-serif';
    ctx.fillStyle = '#FDE047';
    ctx.fillText(`"${sample.expectedText}"`, 320, 310);

    return canvas.toDataURL('image/png');
  };

  const processImage = async (dataUrl: string, name: string) => {
    setImageSrc(dataUrl);
    setFileName(name);
    setErrorMessage(null);
    setTranslationResult(null);
    setAddedToHistory(false);
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/translate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          signLanguage: activeSignLanguage,
          targetLanguage,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        const result: ImageTranslationResult = {
          translatedText: data.translatedText || 'Sign language detected in image.',
          glossSequence: Array.isArray(data.glossSequence) ? data.glossSequence : ['SIGN'],
          confidence: data.confidence || 'high',
          signLanguage: activeSignLanguage,
          stepBreakdown: Array.isArray(data.stepBreakdown) ? data.stepBreakdown : [],
          notes: data.notes,
          imageUrl: dataUrl,
          timestamp: Date.now(),
        };
        setTranslationResult(result);
      } else {
        throw new Error(json.error || 'Unable to translate image');
      }
    } catch (err: any) {
      console.warn('Image translation error:', err);
      setErrorMessage(err.message || 'Unable to recognize signs in this image. Please upload a clear photo of hand gestures.');
      setTranslationResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processImage(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please drop an image file (PNG, JPG, WEBP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processImage(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof SAMPLE_PRESET_IMAGES[0]) => {
    const dataUrl = createPresetImage(preset);
    processImage(dataUrl, `${preset.name}.png`);
  };

  const handleCopyText = () => {
    if (!translationResult?.translatedText) return;
    navigator.clipboard.writeText(translationResult.translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToHistory = () => {
    if (!translationResult?.translatedText) return;
    onAddToTranscripts(
      translationResult.translatedText,
      translationResult.glossSequence.join(' '),
      translationResult.signLanguage
    );
    setAddedToHistory(true);
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Image Sign Language Translator
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PHOTO TO TEXT
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Upload any photo, chart, screenshot, or diagram showing sign language gestures. The AI translates the signs directly into text.
          </p>
        </div>

        {imageSrc && (
          <button
            onClick={() => {
              setImageSrc(null);
              setTranslationResult(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-neutral-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Upload New Image
          </button>
        )}
      </div>

      {/* Upload Zone / Preview Area */}
      {!imageSrc ? (
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
                ? 'border-cyan-400 bg-cyan-500/10 scale-[0.99]'
                : 'border-neutral-700 hover:border-indigo-500/60 bg-neutral-950/60 hover:bg-neutral-900/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Click to upload or drag & drop sign photo
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4">
              Supports PNG, JPG, JPEG, WEBP or GIF. Works with photographs of hand gestures, fingerspelling charts, and multi-step diagrams.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Browse Image from Device
            </div>
          </div>

          {/* Quick Preset Samples */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Or try a sample sign image:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {SAMPLE_PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="p-3 rounded-2xl bg-neutral-950/80 hover:bg-neutral-800/90 border border-neutral-800 hover:border-indigo-500/40 text-left transition-all group flex items-start gap-2.5"
                >
                  <span className="text-2xl select-none group-hover:scale-110 transition-transform">
                    {preset.iconEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-indigo-400 font-mono mt-0.5">
                      {preset.gloss}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      "{preset.expectedText}"
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Image Display & Translation Results */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Uploaded Image Preview */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-neutral-700 bg-black/60 shadow-lg">
              <img
                src={imageSrc}
                alt="Uploaded sign"
                className="w-full h-auto max-h-[360px] object-contain mx-auto"
              />
              <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm border border-neutral-700 text-[11px] text-neutral-300 font-mono truncate max-w-[200px]">
                {fileName || 'Sign Image'}
              </div>
            </div>

            {/* Re-analyze Button */}
            <button
              disabled={isAnalyzing}
              onClick={() => processImage(imageSrc, fileName)}
              className="w-full py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 border border-neutral-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Translating Signs...' : 'Re-Analyze Image'}
            </button>
          </div>

          {/* Right Column: AI Translation & Text Breakdown */}
          <div className="lg:col-span-7 space-y-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 bg-neutral-950/60 rounded-2xl border border-neutral-800">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <h4 className="text-sm font-bold text-white">Analyzing Sign Language in Image...</h4>
                <p className="text-xs text-neutral-400 max-w-xs">
                  Examining handshapes, palm orientation, fingerspelling letters, and movement path...
                </p>
              </div>
            ) : translationResult ? (
              <div className="space-y-4">
                {/* Main Translated Text Box */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-neutral-900 to-cyan-950/30 border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      TRANSLATED TEXT
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-400">
                      System: {translationResult.signLanguage}
                    </span>
                  </div>

                  <div className="text-xl sm:text-2xl font-extrabold text-amber-300 tracking-tight leading-snug py-1">
                    "{translationResult.translatedText}"
                  </div>

                  {/* Gloss Flow Sequence */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-neutral-800/80">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                      Signs:
                    </span>
                    {translationResult.glossSequence.map((gloss, idx) => (
                      <React.Fragment key={idx}>
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-mono text-xs font-bold">
                          {gloss}
                        </span>
                        {idx < translationResult.glossSequence.length - 1 && (
                          <span className="text-neutral-500 text-xs">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Step Breakdown of Gestures */}
                {translationResult.stepBreakdown && translationResult.stepBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      Sign-by-Sign Analysis
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {translationResult.stepBreakdown.map((step) => (
                        <div
                          key={step.step}
                          className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 text-xs space-y-1 hover:border-neutral-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cyan-300 font-mono">
                              Step {step.step}: {step.sign}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-semibold">
                              {step.meaning}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-300 leading-normal">
                            {step.handshape}
                          </p>
                          {step.movement && (
                            <p className="text-[10px] text-neutral-400 italic">
                              Motion: {step.movement}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes if present */}
                {translationResult.notes && (
                  <div className="p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80 text-[11px] text-neutral-400 leading-relaxed flex items-start gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{translationResult.notes}</span>
                  </div>
                )}

                {/* Action Buttons: Speak, Copy, Add to History */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => onSpeakText(translationResult.translatedText)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                    title="Speak translated text aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Speak Aloud
                  </button>

                  <button
                    onClick={handleCopyText}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 border border-neutral-700 transition-colors active:scale-95"
                    title="Copy translated text to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>

                  <button
                    onClick={handleAddToHistory}
                    disabled={addedToHistory}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 active:scale-95"
                    title="Save this translation to your session transcript log"
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
            ) : null}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
