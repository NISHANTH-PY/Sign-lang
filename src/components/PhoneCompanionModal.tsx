import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  X,
  Copy,
  Check,
  Camera,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface PhoneCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhoneCompanionModal: React.FC<PhoneCompanionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const url = window.location.href;
    setCurrentUrl(url);

    QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error('QR code generation error:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-neutral-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Use Phone Camera
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                WIRELESS
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Transform your iPhone or Android phone into a live sign translator camera
            </p>
          </div>
        </div>

        {/* QR Code section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 mb-5">
          <div className="p-2 bg-white rounded-2xl shadow-inner shrink-0 flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan to open on phone camera"
                className="w-40 h-40 rounded-xl"
              />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-xs text-neutral-500">
                Generating QR...
              </div>
            )}
          </div>

          <div className="space-y-3 text-xs text-neutral-300">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </span>
              <p>
                Open your <strong>Phone Camera app</strong> and scan this QR code.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </span>
              <p>
                Allow camera permissions when prompted in mobile Safari or Chrome.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                3
              </span>
              <p>
                Switch between <strong>Front (selfie)</strong> or <strong>Rear camera</strong> with 1-tap and watch live subtitles!
              </p>
            </div>
          </div>
        </div>

        {/* Direct Link Copy */}
        <div className="space-y-1.5 mb-5">
          <label className="text-xs text-neutral-400 font-medium">Or open via direct URL on your phone:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 select-all font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Setup advice banner */}
        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
          <p>
            <strong>Pro Tip:</strong> Place your phone upright on a stand or desk facing the signer while looking at your laptop screen for large cinema subtitles.
          </p>
        </div>
      </div>
    </div>
  );
};
