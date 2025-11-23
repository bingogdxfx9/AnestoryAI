import React, { useState } from 'react';
import { Ancestor } from '../types';
import { generateFamilyStory } from '../services/geminiService';

interface Props {
  ancestor: Ancestor;
  allAncestors: Ancestor[];
  onClose: () => void;
}

const STYLES = [
    { id: 'Standard', label: 'Standard Biography', desc: 'Balanced and engaging.' },
    { id: 'Academic', label: 'Formal Academic', desc: 'Objective, fact-based, archival style.' },
    { id: 'Novel', label: 'Historical Novel', desc: 'Emotive, atmospheric, creative.' },
    { id: 'Children', label: 'Children’s Story', desc: 'Simple, gentle, educational.' },
    { id: 'Summary', label: 'Concise Summary', desc: 'Bullet points and key facts.' },
];

export const StoryModal: React.FC<Props> = ({ ancestor, allAncestors, onClose }) => {
  const [selectedStyle, setSelectedStyle] = useState('Standard');
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
        const result = await generateFamilyStory(ancestor, allAncestors, selectedStyle);
        setStory(result);
    } catch (e) {
        setStory("Failed to generate story. Please check your API connection.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-indigo-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="mr-2">📖</span> Family Story Generator
            </h2>
            <p className="text-indigo-200 text-sm mt-1">
              Crafting a narrative for <strong>{ancestor.name}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:text-indigo-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          {!story && !loading && (
              <div className="space-y-6">
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                      <p className="text-indigo-800 text-sm mb-2 font-bold uppercase">Select Narrative Style:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {STYLES.map((s) => (
                              <button
                                  key={s.id}
                                  onClick={() => setSelectedStyle(s.id)}
                                  className={`text-left p-3 rounded-lg border transition ${
                                      selectedStyle === s.id 
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                      : 'bg-white border-indigo-200 text-slate-700 hover:bg-indigo-50'
                                  }`}
                              >
                                  <div className="font-bold text-sm">{s.label}</div>
                                  <div className={`text-xs mt-1 ${selectedStyle === s.id ? 'text-indigo-200' : 'text-slate-500'}`}>{s.desc}</div>
                              </button>
                          ))}
                      </div>
                  </div>

                  <button 
                      onClick={handleGenerate}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg hover:scale-[1.01] transition transform"
                  >
                      Write Story
                  </button>
              </div>
          )}

          {loading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <p className="text-indigo-600 font-medium animate-pulse">Analyzing historical data...</p>
                  <p className="text-slate-400 text-xs">The AI is checking dates, relationships, and context.</p>
              </div>
          )}

          {story && (
              <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">{selectedStyle} Narrative</span>
                      <button onClick={() => setStory(null)} className="text-sm text-slate-500 hover:text-indigo-600 underline">
                          Start Over
                      </button>
                  </div>
                  <div className="prose prose-indigo max-w-none text-slate-800 leading-relaxed">
                      {story.split('\n').map((paragraph, i) => (
                          <p key={i} className="mb-4">{paragraph}</p>
                      ))}
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};