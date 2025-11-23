import React, { useState } from 'react';
import { Ancestor } from '../types';
import { naturalLanguageSearch } from '../services/geminiService';

interface Props {
  ancestors: Ancestor[];
  onFilter: (ids: string[]) => void;
  onClear: () => void;
}

export const SmartSearch: React.FC<Props> = ({ ancestors, onFilter, onClear }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setActive(true);
    try {
      const filteredIds = await naturalLanguageSearch(query, ancestors);
      onFilter(filteredIds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setActive(false);
    onClear();
  };

  return (
    <div className="relative w-full max-w-xl mx-auto mb-6">
      <form onSubmit={handleSearch} className="relative">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask: 'Find all female ancestors born before 1950' or 'Cousins of John'"
          className={`w-full pl-10 pr-24 py-3 rounded-full border shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none 
            ${active 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200' 
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
        />
        <div className="absolute left-4 top-3.5 text-slate-400">
           {loading ? (
             <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
           ) : (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
             </svg>
           )}
        </div>
        
        {active && (
            <button 
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-2.5 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200 rounded-full p-1 text-xs px-3 font-medium transition"
            >
                Clear
            </button>
        )}
        
        {!active && query && (
             <button 
                type="submit"
                className="absolute right-2 top-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 py-1.5 text-sm font-medium transition"
             >
                Search
             </button>
        )}
      </form>
    </div>
  );
};