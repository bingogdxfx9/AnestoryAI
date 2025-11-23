import React, { useState, useEffect } from 'react';
import { Ancestor, TimelineEvent, SESResult } from '../types';
import { 
    generateGroundedHistory, 
    generateFamilyStory, 
    analyzeMissingData, 
    generateTimeline, 
    predictSES,
    HistoricalContextResponse 
} from '../services/geminiService';

interface Props {
  selectedAncestorId: string | null;
  ancestors: Ancestor[];
}

type TabMode = 'history' | 'story' | 'timeline' | 'insights' | 'suggestions';

export const AIHistorian: React.FC<Props> = ({ selectedAncestorId, ancestors }) => {
  const [mode, setMode] = useState<TabMode>('history');
  
  // State storage for different modes
  const [historyData, setHistoryData] = useState<HistoricalContextResponse | null>(null);
  const [storyData, setStoryData] = useState<string | null>(null);
  const [suggestionsData, setSuggestionsData] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineEvent[] | null>(null);
  const [sesData, setSesData] = useState<SESResult | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [storyStyle, setStoryStyle] = useState<string>('Standard');
  
  const currentAncestor = selectedAncestorId ? ancestors.find(a => a.id === selectedAncestorId) : null;

  useEffect(() => {
    // Reset all data when selection changes
    setHistoryData(null);
    setStoryData(null);
    setSuggestionsData(null);
    setTimelineData(null);
    setSesData(null);
    setMode('history');
  }, [selectedAncestorId]);

  const handleGenerate = async () => {
    if (!currentAncestor) return;
    setLoading(true);

    try {
        if (mode === 'history') {
            const res = await generateGroundedHistory(currentAncestor);
            setHistoryData(res);
        } else if (mode === 'story') {
            const res = await generateFamilyStory(currentAncestor, ancestors, storyStyle);
            setStoryData(res);
        } else if (mode === 'timeline') {
            const res = await generateTimeline(currentAncestor);
            setTimelineData(res);
        } else if (mode === 'insights') {
            const res = await predictSES(currentAncestor);
            setSesData(res);
        } else if (mode === 'suggestions') {
            const res = await analyzeMissingData(currentAncestor);
            setSuggestionsData(res);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  if (!currentAncestor) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 p-6 rounded-xl shadow-md border border-indigo-100 dark:border-slate-700 h-full flex flex-col justify-center items-center text-center min-h-[300px]">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="text-indigo-900 dark:text-slate-400 font-medium">Select an ancestor to view AI insights.</p>
      </div>
    );
  }

  const renderContent = () => {
    if (loading) {
        return (
            <div className="animate-pulse space-y-4 py-4">
                <div className="h-4 bg-indigo-200 dark:bg-indigo-900 rounded w-3/4"></div>
                <div className="h-4 bg-indigo-200 dark:bg-indigo-900 rounded w-full"></div>
                <div className="h-4 bg-indigo-200 dark:bg-indigo-900 rounded w-5/6"></div>
            </div>
        );
    }

    // --- HISTORY TAB ---
    if (mode === 'history') {
        if (!historyData) return renderGenerateButton("Discover History");
        return (
            <div className="space-y-4 animate-fade-in">
                <p className="text-sm leading-relaxed text-indigo-900 dark:text-indigo-100">{historyData.text}</p>
                {historyData.sources && historyData.sources.length > 0 && (
                    <div className="border-t border-indigo-200 dark:border-slate-600 pt-3">
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">Sources:</p>
                        <ul className="list-disc list-inside text-xs text-indigo-600 dark:text-indigo-400">
                            {historyData.sources.map((s, i) => (
                                <li key={i}>
                                    <a href={s.uri} target="_blank" rel="noopener noreferrer" className="hover:underline truncate block">
                                        {s.title || s.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    // --- STORY TAB ---
    if (mode === 'story') {
        if (!storyData) {
            return (
                <div className="text-center py-4">
                     <label className="block text-xs font-medium text-indigo-800 dark:text-indigo-200 mb-2">Narrative Style</label>
                     <select 
                        value={storyStyle} 
                        onChange={(e) => setStoryStyle(e.target.value)}
                        className="mb-4 block w-full max-w-xs mx-auto rounded-md border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm p-2"
                     >
                        <option value="Standard">Standard Biography</option>
                        <option value="Academic">Academic Report</option>
                        <option value="Novel">Historical Novel</option>
                        <option value="Children">Children's Story</option>
                        <option value="Summary">Concise Summary</option>
                     </select>
                     {renderGenerateButton("Write Story")}
                </div>
            );
        }
        return (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-indigo-500 dark:text-indigo-300 uppercase font-bold tracking-wide">{storyStyle} Mode</span>
                    <button onClick={() => setStoryData(null)} className="text-xs text-indigo-400 hover:text-indigo-600">Regenerate</button>
                </div>
                <div className="prose prose-sm text-indigo-900 dark:text-indigo-100 max-h-[300px] overflow-y-auto p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                    <p className="whitespace-pre-line">{storyData}</p>
                </div>
            </div>
        );
    }

    // --- TIMELINE TAB ---
    if (mode === 'timeline') {
        if (!timelineData) return renderGenerateButton("Build Timeline");
        return (
            <div className="animate-fade-in relative pl-4 border-l-2 border-indigo-200 dark:border-indigo-800 ml-2 space-y-6 py-2">
                {timelineData.map((t, idx) => (
                    <div key={idx} className="relative">
                        <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-800"></span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">{t.year}</span>
                        <p className="text-sm text-indigo-900 dark:text-indigo-100 mt-1">{t.event}</p>
                    </div>
                ))}
            </div>
        );
    }

    // --- INSIGHTS (SES) TAB ---
    if (mode === 'insights') {
        if (!sesData) return renderGenerateButton("Analyze SES");
        return (
            <div className="animate-fade-in p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg border border-indigo-100 dark:border-slate-700">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-1">Socio-Economic Status Prediction</h4>
                <p className="text-lg font-light text-indigo-700 dark:text-indigo-300 mb-3">{sesData.socialClass}</p>
                <div className="text-xs text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/40 p-3 rounded border border-indigo-100 dark:border-indigo-800">
                    <strong>Reasoning:</strong> {sesData.reasoning}
                </div>
            </div>
        );
    }

    // --- SUGGESTIONS TAB ---
    if (mode === 'suggestions') {
        if (!suggestionsData) return renderGenerateButton("Find Missing Data");
        return (
             <div className="prose prose-sm text-indigo-900 dark:text-indigo-100 max-h-[300px] overflow-y-auto">
                <p className="whitespace-pre-line">{suggestionsData}</p>
            </div>
        );
    }

    return null;
  };

  const renderGenerateButton = (label: string) => (
    <div className="text-center py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Use AI to generate content for this section.
        </p>
        <button 
            onClick={handleGenerate}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition text-sm shadow flex items-center justify-center mx-auto"
        >
            <span className="mr-2">✨</span> {label}
        </button>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-md border border-indigo-100 dark:border-slate-700 flex flex-col h-full min-h-[450px]">
      {/* Header */}
      <div className="p-4 border-b border-indigo-100 dark:border-slate-700 flex items-center justify-between">
         <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 flex items-center">
            AI Historian
         </h3>
         <span className="text-xs font-medium bg-white dark:bg-slate-700 px-2 py-1 rounded text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-slate-600 truncate max-w-[120px]">
            {currentAncestor.name}
         </span>
      </div>

      {/* Scrollable Tabs */}
      <div className="flex border-b border-indigo-100 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 overflow-x-auto">
        {(['history', 'story', 'timeline', 'insights', 'suggestions'] as TabMode[]).map((t) => (
            <button
                key={t}
                onClick={() => setMode(t)}
                className={`flex-1 py-3 px-3 text-xs font-medium transition whitespace-nowrap ${
                    mode === t 
                    ? 'text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'
                }`}
            >
                {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 flex-grow overflow-hidden flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};