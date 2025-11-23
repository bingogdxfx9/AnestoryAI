import React, { useState, useEffect } from 'react';
import { Ancestor } from '../types';
import { generateGroundedHistory, HistoricalContextResponse } from '../services/geminiService';

interface Props {
  ancestor: Ancestor;
  onClose: () => void;
}

export const ContextModal: React.FC<Props> = ({ ancestor, onClose }) => {
  const [data, setData] = useState<HistoricalContextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await generateGroundedHistory(ancestor);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError("Failed to retrieve historical context.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [ancestor]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-emerald-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="mr-2">📜</span> Historical Context
            </h2>
            <p className="text-emerald-100 text-sm mt-1">
              The world during the life of <strong>{ancestor.name}</strong> ({ancestor.birthYear || '?'} - {ancestor.deathYear || '?'})
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:text-emerald-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          {loading && (
             <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                  <p className="text-emerald-600 font-medium animate-pulse">Researching historical archives...</p>
                  <p className="text-slate-400 text-xs">Using Google Search Grounding to verify events.</p>
              </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
              <p>{error}</p>
              <button 
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
              >
                Close
              </button>
            </div>
          )}

          {data && !loading && (
            <div className="animate-fade-in space-y-6">
               <div className="prose prose-emerald max-w-none text-slate-800 leading-relaxed">
                  <p className="whitespace-pre-line text-lg">{data.text}</p>
               </div>

               {data.sources && data.sources.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Sources & Citations</h4>
                    <ul className="space-y-2">
                      {data.sources.map((source, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-emerald-500 mr-2">•</span>
                          <a 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm text-indigo-600 hover:underline hover:text-indigo-800 truncate block flex-1"
                          >
                            {source.title || source.uri}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
               )}
            </div>
          )}
        </div>
        
        {data && !loading && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
                <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium shadow"
                >
                    Done
                </button>
            </div>
        )}
      </div>
    </div>
  );
};