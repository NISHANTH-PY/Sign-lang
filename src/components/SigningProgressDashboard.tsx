import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { TranscriptItem } from '../types';
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  Flame,
  CheckCircle,
} from 'lucide-react';

interface SigningProgressDashboardProps {
  transcripts: TranscriptItem[];
}

interface SignFrequencyData {
  sign: string;
  count: number;
  lastLanguage?: string;
  percentage: number;
}

const BAR_COLORS = [
  '#6366F1', // Indigo 500
  '#06B6D4', // Cyan 500
  '#3B82F6', // Blue 500
  '#10B981', // Emerald 500
  '#8B5CF6', // Purple 500
  '#F59E0B', // Amber 500
  '#EC4899', // Pink 500
  '#14B8A6', // Teal 500
];

export const SigningProgressDashboard: React.FC<SigningProgressDashboardProps> = ({
  transcripts,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeMetricTab, setActiveMetricTab] = useState<'frequency' | 'metrics'>('frequency');

  // Compute sign frequency and session analytics
  const { chartData, totalSignsCount, uniqueSignsCount, highConfidenceRate, avgSignsPerSentence } =
    useMemo(() => {
      const frequencyMap = new Map<string, { count: number; lastLanguage?: string }>();
      let totalGlosses = 0;
      let highConfidenceCount = 0;

      transcripts.forEach((t) => {
        if (t.confidence === 'high') highConfidenceCount++;

        // Extract individual gloss tokens
        // e.g. "HELLO HOW-ARE-YOU" or "ME -> HUNGRY -> WANT FOOD"
        const rawTokens = (t.gloss || '')
          .split(/[\s->;,]+/)
          .map((s) => s.trim().toUpperCase())
          .filter(
            (s) =>
              s.length > 0 &&
              s !== 'SIGN' &&
              s !== 'NONE' &&
              s !== 'NULL' &&
              !/^[0-9]+$/.test(s)
          );

        // Fallback: If gloss was generic, also inspect key keywords from subtitle
        if (rawTokens.length === 0 && t.subtitle) {
          const subTokens = t.subtitle
            .toUpperCase()
            .replace(/[^A-Z\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 2 && !['THE', 'AND', 'FOR', 'ARE', 'YOU', 'WAS'].includes(w));
          rawTokens.push(...subTokens);
        }

        rawTokens.forEach((token) => {
          totalGlosses++;
          const existing = frequencyMap.get(token) || { count: 0, lastLanguage: t.signLanguage };
          existing.count += 1;
          existing.lastLanguage = t.signLanguage || existing.lastLanguage;
          frequencyMap.set(token, existing);
        });
      });

      // Sort descending by count and take top 8
      const sortedEntries = Array.from(frequencyMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8);

      const computedChartData: SignFrequencyData[] = sortedEntries.map(([sign, data]) => ({
        sign,
        count: data.count,
        lastLanguage: data.lastLanguage,
        percentage: totalGlosses > 0 ? Math.round((data.count / totalGlosses) * 100) : 0,
      }));

      const highConfRate =
        transcripts.length > 0
          ? Math.round((highConfidenceCount / transcripts.length) * 100)
          : 0;

      const avgPerSentence =
        transcripts.length > 0
          ? (totalGlosses / transcripts.length).toFixed(1)
          : '0.0';

      return {
        chartData: computedChartData,
        totalSignsCount: totalGlosses,
        uniqueSignsCount: frequencyMap.size,
        highConfidenceRate: highConfRate,
        avgSignsPerSentence: avgPerSentence,
      };
    }, [transcripts]);

  // Sample placeholder data if user hasn't signed yet so the chart layout is intuitive
  const displayData = chartData.length > 0
    ? chartData
    : [
        { sign: 'HELLO', count: 4, percentage: 32 },
        { sign: 'THANK-YOU', count: 3, percentage: 24 },
        { sign: 'PLEASE', count: 2, percentage: 16 },
        { sign: 'HELP', count: 2, percentage: 16 },
        { sign: 'NAME', count: 1, percentage: 8 },
        { sign: 'NICE', count: 1, percentage: 8 },
      ];

  const isSimulated = chartData.length === 0;

  return (
    <div className="bg-neutral-950/70 border border-neutral-800/90 rounded-2xl p-4 sm:p-5 shadow-lg transition-all space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm">Signing Progress & Frequency</h3>
              {isSimulated && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                  Sample Preview
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">
              Real-time frequency tracking of recognized signs per session
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View Tab Buttons */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-0.5 flex text-[11px]">
            <button
              onClick={() => setActiveMetricTab('frequency')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeMetricTab === 'frequency'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Frequency Chart
            </button>
            <button
              onClick={() => setActiveMetricTab('metrics')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeMetricTab === 'metrics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Session Stats
            </button>
          </div>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title={isExpanded ? 'Collapse dashboard' : 'Expand dashboard'}
            aria-label="Toggle signing dashboard"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 pt-1">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">Total Signs</span>
                <span className="text-base font-bold text-white font-mono">
                  {isSimulated ? '13' : totalSignsCount}
                </span>
              </div>
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">Vocabulary Size</span>
                <span className="text-base font-bold text-cyan-300 font-mono">
                  {isSimulated ? '6' : uniqueSignsCount}
                </span>
              </div>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">High Accuracy</span>
                <span className="text-base font-bold text-emerald-300 font-mono">
                  {isSimulated ? '92%' : `${highConfidenceRate}%`}
                </span>
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">Signs / Sentence</span>
                <span className="text-base font-bold text-amber-300 font-mono">
                  {isSimulated ? '2.4' : avgSignsPerSentence}
                </span>
              </div>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          {activeMetricTab === 'frequency' ? (
            /* Recharts Frequency Bar Chart */
            <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  Most Frequently Recognized Signs
                </span>
                <span className="text-[11px] text-neutral-400">
                  {isSimulated ? 'Demonstration values' : `${displayData.length} active gestures`}
                </span>
              </div>

              {/* Bar Chart Container */}
              <div className="h-44 sm:h-52 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={displayData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis
                      dataKey="sign"
                      tick={{ fill: '#A3A3A3', fontSize: 11, fontWeight: 500 }}
                      stroke="#404040"
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#737373', fontSize: 10 }}
                      stroke="#404040"
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as SignFrequencyData;
                          return (
                            <div className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded-xl shadow-2xl text-xs space-y-1">
                              <p className="font-bold text-white flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                Sign: {item.sign}
                              </p>
                              <div className="text-neutral-300 flex justify-between gap-4">
                                <span>Times Recognized:</span>
                                <span className="font-bold font-mono text-cyan-300">{item.count}</span>
                              </div>
                              {item.percentage > 0 && (
                                <div className="text-neutral-400 flex justify-between gap-4 text-[11px]">
                                  <span>Session Share:</span>
                                  <span className="font-mono text-neutral-200">{item.percentage}%</span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {displayData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Progress Mastery Badges */}
              <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Top Sign:</span>
                  <span className="font-semibold text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded">
                    {displayData[0]?.sign || 'HELLO'} ({displayData[0]?.count || 1}x)
                  </span>
                </div>
                <span className="text-neutral-500 text-[10px]">
                  Updated live as you sign in front of the camera
                </span>
              </div>
            </div>
          ) : (
            /* Session Stats Detail View */
            <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl p-4 text-xs space-y-3">
              <h4 className="font-semibold text-neutral-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Signing Session Insights
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-300">
                <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800/60 space-y-1">
                  <div className="text-[11px] text-neutral-400">Fluency & Pacing</div>
                  <div className="font-medium text-white">
                    {Number(avgSignsPerSentence) > 2.0
                      ? 'High Continuous Flow (Multi-Sign Phrases)'
                      : 'Expressive Single Sign / Learning Mode'}
                  </div>
                  <p className="text-[10px] text-neutral-400 pt-0.5">
                    Signs grouped into fluent sentences via dynamic sentence accumulation.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800/60 space-y-1">
                  <div className="text-[11px] text-neutral-400">Recognition Quality</div>
                  <div className="font-medium text-emerald-300">
                    {highConfidenceRate >= 75
                      ? 'Optimal Clarity (Clear Hands & Gestures)'
                      : 'Good Visibility (Try centering hands in guide box)'}
                  </div>
                  <p className="text-[10px] text-neutral-400 pt-0.5">
                    Maintains high recognition accuracy with balanced lighting.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
