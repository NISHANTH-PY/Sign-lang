import React, { useState } from 'react';
import { MULTI_LANGUAGE_DICTIONARY, SUPPORTED_SIGN_LANGUAGES } from '../data/signLanguages';
import { DictionaryItem, SignLanguageId } from '../types';
import {
  BookOpen,
  X,
  Search,
  Hand,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Globe2,
} from 'lucide-react';

interface SignGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSignToPractice?: (sign: DictionaryItem) => void;
  initialLanguage?: SignLanguageId;
  onSelectLanguage?: (lang: SignLanguageId) => void;
}

export const SignGuideModal: React.FC<SignGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectSignToPractice,
  initialLanguage = 'ASL',
  onSelectLanguage,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SignLanguageId>(initialLanguage);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSign, setSelectedSign] = useState<DictionaryItem | null>(null);

  if (!isOpen) return null;

  const categories = ['All', 'Basics', 'Phrases', 'Emergency', 'Alphabet'];

  const filteredSigns = MULTI_LANGUAGE_DICTIONARY.filter((item) => {
    const matchesLang = item.signLanguage === selectedLanguage;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.gloss.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.handshape.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLang && matchesCategory && matchesSearch;
  });

  const activeLangInfo =
    SUPPORTED_SIGN_LANGUAGES.find((l) => l.id === selectedLanguage) ||
    SUPPORTED_SIGN_LANGUAGES[0];

  const handleLanguageTabClick = (langId: SignLanguageId) => {
    setSelectedLanguage(langId);
    setSelectedSign(null);
    if (onSelectLanguage) {
      onSelectLanguage(langId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-neutral-200 max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Sign Language Visual Dictionary & Reference
            </h3>
            <p className="text-xs text-neutral-400">
              Interactive handshape guides for ASL, BSL (2-handed), Auslan, ISL, LSF, and International Sign
            </p>
          </div>
        </div>

        {/* Sign Language Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 border-b border-neutral-800 shrink-0 scrollbar-none">
          {SUPPORTED_SIGN_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleLanguageTabClick(lang.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                selectedLanguage === lang.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.id}</span>
              <span className="text-[10px] opacity-75">({lang.alphabetType})</span>
            </button>
          ))}
        </div>

        {/* Language Summary Banner */}
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 mb-4 flex items-center justify-between gap-4 text-xs text-neutral-300 shrink-0">
          <div>
            <span className="font-semibold text-white">
              {activeLangInfo.name} ({activeLangInfo.region})
            </span>
            <p className="text-neutral-400 text-[11px] mt-0.5">{activeLangInfo.description}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {activeLangInfo.keyFeatures.map((feat, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-[10px] border border-indigo-500/20"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder={`Search ${activeLangInfo.id} signs (e.g., Hello, Thank you, Letter A)...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600/30 border border-indigo-500 text-indigo-200'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Split List & Detail */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
          {/* Sign cards grid */}
          <div className="space-y-2 overflow-y-auto max-h-[46vh] pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
            {filteredSigns.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No signs found matching your query for {activeLangInfo.id}.
              </div>
            ) : (
              filteredSigns.map((sign) => (
                <div
                  key={sign.id}
                  onClick={() => setSelectedSign(sign)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selectedSign?.id === sign.id
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
                      : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl p-2 rounded-xl bg-neutral-900 border border-neutral-800 shrink-0">
                      {sign.symbolEmoji}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-sm truncate">{sign.term}</h4>
                        {sign.isTwoHanded && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            2-Handed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span className="font-mono text-indigo-300 font-semibold">{sign.gloss}</span>
                        <span>•</span>
                        <span>{sign.category}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-500 shrink-0" />
                </div>
              ))
            )}
          </div>

          {/* Sign Detail View */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between">
            {selectedSign ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800">
                    {selectedSign.symbolEmoji}
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-white">{selectedSign.term}</h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-indigo-400 font-semibold">
                        GLOSS: {selectedSign.gloss}
                      </span>
                      {selectedSign.isTwoHanded && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          2-HANDED CONFIG
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="font-semibold text-neutral-400 block mb-1">Handshape Configuration:</span>
                    <p className="text-neutral-200 bg-neutral-900/90 p-2.5 rounded-xl border border-neutral-800/80 leading-relaxed">
                      {selectedSign.handshape}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-neutral-400 block mb-1">Movement & Location:</span>
                    <p className="text-neutral-200 bg-neutral-900/90 p-2.5 rounded-xl border border-neutral-800/80 leading-relaxed">
                      {selectedSign.movement}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-neutral-400 block mb-1">Linguistic & Cultural Tip:</span>
                    <p className="text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                      💡 {selectedSign.tips}
                    </p>
                  </div>
                </div>

                {onSelectSignToPractice && (
                  <button
                    onClick={() => {
                      onSelectSignToPractice(selectedSign);
                      onClose();
                    }}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors"
                  >
                    <Hand className="w-4 h-4" />
                    Practice this Sign with Camera
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                <Hand className="w-12 h-12 text-neutral-700 mb-3" />
                <p className="text-sm font-medium text-neutral-400 mb-1">Select any sign on the left</p>
                <p className="text-xs text-neutral-500 max-w-xs">
                  Learn handshapes, movement patterns, and practice in front of your laptop or phone camera
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
