import React, { useState } from 'react';
import { TranscriptItem } from '../types';
import {
  FileText,
  Copy,
  Check,
  Download,
  Trash2,
  Search,
  Volume2,
  Hand,
  Sparkles,
} from 'lucide-react';

interface TranscriptHistoryProps {
  transcripts: TranscriptItem[];
  onClearTranscripts: () => void;
  onSpeakText: (text: string) => void;
}

export const TranscriptHistory: React.FC<TranscriptHistoryProps> = ({
  transcripts,
  onClearTranscripts,
  onSpeakText,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const filtered = transcripts.filter(
    (item) =>
      item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.gloss.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyAll = async () => {
    if (transcripts.length === 0) return;
    const text = transcripts
      .map((t) => `[${t.timeFormatted}] (${t.gloss}): ${t.subtitle}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export as SRT (SubRip Subtitle Format)
  const handleExportSRT = () => {
    if (transcripts.length === 0) return;
    let srtContent = '';
    transcripts.forEach((item, index) => {
      const idx = index + 1;
      const startSec = index * 3;
      const endSec = startSec + 2.8;

      const formatSRTTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = Math.floor(totalSeconds % 60);
        const ms = Math.floor((totalSeconds % 1) * 1000);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };

      srtContent += `${idx}\n${formatSRTTime(startSec)} --> ${formatSRTTime(endSec)}\n${item.subtitle}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sign-language-subtitles-${Date.now()}.srt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export as plain text
  const handleExportTXT = () => {
    if (transcripts.length === 0) return;
    const txtContent = transcripts
      .map((item) => `[${item.timeFormatted}] ${item.subtitle} (Gloss: ${item.gloss})`)
      .join('\n');
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `signstream-transcript-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-neutral-900/90 rounded-2xl p-5 border border-neutral-800 text-neutral-200 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-white text-base">Live Transcript & Caption Log</h2>
          <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            {transcripts.length} {transcripts.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyAll}
            disabled={transcripts.length === 0}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-xs font-medium text-gray-300 hover:text-white border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Copy full transcript"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={handleExportSRT}
            disabled={transcripts.length === 0}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 disabled:opacity-40 text-xs font-medium text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition-colors"
            title="Download broadcast SRT subtitle file"
          >
            <Download className="w-3.5 h-3.5" />
            Export .SRT
          </button>

          <button
            onClick={handleExportTXT}
            disabled={transcripts.length === 0}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-xs font-medium text-gray-300 hover:text-white border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Download plain text log"
          >
            <Download className="w-3.5 h-3.5" />
            .TXT
          </button>

          <button
            onClick={onClearTranscripts}
            disabled={transcripts.length === 0}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-rose-900/40 text-neutral-400 hover:text-rose-300 disabled:opacity-40 border border-neutral-700 transition-colors"
            title="Clear all transcripts"
            aria-label="Clear all transcripts"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {transcripts.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search transcript by word or ASL gloss..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Transcript Items Scroll list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
            <Hand className="w-6 h-6 text-neutral-600" />
            {transcripts.length === 0
              ? 'No sign language translated yet. Start signing towards your laptop or phone camera!'
              : 'No matching subtitles found for your search.'}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-start justify-between gap-3 group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="font-mono text-neutral-500">{item.timeFormatted}</span>
                  {item.signLanguage && (
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px] border border-neutral-700">
                      {item.signLanguage}
                    </span>
                  )}
                  {item.gloss && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono text-[10px] border border-indigo-500/20">
                      {item.gloss}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      item.confidence === 'high'
                        ? 'text-emerald-400'
                        : item.confidence === 'medium'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {item.confidence}
                  </span>
                </div>
                <p className="text-sm text-neutral-100 font-medium break-words leading-relaxed">
                  “{item.subtitle}”
                </p>
              </div>

              {/* Speak button */}
              <button
                onClick={() => onSpeakText(item.subtitle)}
                className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                title="Speak this sentence aloud"
                aria-label="Speak subtitle"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
