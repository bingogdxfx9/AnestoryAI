import React, { useState } from 'react';
import { Ancestor } from '../types';
import { calculateRelationship } from '../utils/genealogy';

interface Props {
  ancestors: Ancestor[];
}

export const RelationshipCalculator: React.FC<Props> = ({ ancestors }) => {
  const [personA, setPersonA] = useState<string>('');
  const [personB, setPersonB] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);

  const handleCalculate = () => {
    if (!personA || !personB) {
      setResult("Please select two people.");
      return;
    }
    const rel = calculateRelationship(ancestors, personA, personB);
    setResult(rel);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-2.828-1.414l-7 7a1 1 0 101.414 1.414l3-3a1 1 0 001.414 0 1 1 0 001.414 1.414l7-7z" clipRule="evenodd" />
        </svg>
        Relationship Calculator
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Person A</label>
          <select 
            className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md shadow-sm border p-2 text-sm"
            value={personA}
            onChange={(e) => setPersonA(e.target.value)}
          >
            <option value="">Select Person...</option>
            {ancestors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Person B</label>
          <select 
            className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md shadow-sm border p-2 text-sm"
            value={personB}
            onChange={(e) => setPersonB(e.target.value)}
          >
            <option value="">Select Person...</option>
            {ancestors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <button 
        onClick={handleCalculate}
        className="w-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 py-2 rounded font-medium hover:bg-indigo-100 dark:hover:bg-indigo-800 transition"
      >
        Calculate Relationship
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-center">
          <span className="text-slate-500 dark:text-slate-400 text-sm">Result:</span>
          <p className="text-lg font-bold text-slate-800 dark:text-white">{result}</p>
        </div>
      )}
    </div>
  );
};