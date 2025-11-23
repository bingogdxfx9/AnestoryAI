import React, { useState } from 'react';
import { parseNaturalLanguageData } from '../services/geminiService';

interface Props {
  onCancel: () => void;
  onAnalysisComplete: (data: any) => void;
}

export const DataScrutinizer: React.FC<Props> = ({ onCancel, onAnalysisComplete }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const result = await parseNaturalLanguageData(text);
      if (result) {
        onAnalysisComplete(result);
      } else {
        setError("Could not identify valid genealogical data. Please try again with more detail.");
      }
    } catch (err) {
      setError("AI Service error. Please check your connection or API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-indigo-100">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex items-center text-white space-x-2">
            <span className="text-2xl">⚡</span>
            <h2 className="text-xl font-bold">Smart Life Event Scrutinizer</h2>
          </div>
          <p className="text-indigo-100 text-sm mt-1">Paste a biography, obituary snippet, or notes. AI will extract the data.</p>
        </div>

        <div className="p-6 space-y-4">
          <textarea
            className="w-full h-40 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 bg-slate-50 resize-none shadow-inner"
            placeholder="e.g. My great-grandfather Arthur Dent was born in 1905. He served in the navy and married Tricia in 1930..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center">
               <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition flex items-center justify-center min-w-[120px] ${
                loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 transform'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Extract Data'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};