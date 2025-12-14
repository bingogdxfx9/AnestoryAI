import React, { useState } from 'react';
import { Ancestor } from '../types';

interface Props {
  ancestors: Ancestor[];
  onImportClick: () => void;
}

export const RecordVault: React.FC<Props> = ({ ancestors, onImportClick }) => {
  const [filter, setFilter] = useState('');
  
  const filtered = ancestors.filter(a => 
      a.name.toLowerCase().includes(filter.toLowerCase()) || 
      a.country?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background pb-20 animate-fade-in px-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
          <div>
              <h2 className="text-xl font-bold text-white">Record Management</h2>
              <p className="text-xs text-gray-400">Harrison Family Vault</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-white">
              <span className="material-symbols-outlined">notifications</span>
          </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
          <span className="absolute left-3 top-2.5 text-gray-500 material-symbols-outlined text-[20px]">search</span>
          <input 
             type="text" 
             placeholder="Search records, dates, or people..."
             value={filter}
             onChange={(e) => setFilter(e.target.value)}
             className="w-full bg-surface border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 text-sm"
          />
          <span className="absolute right-3 top-2.5 text-gray-500 material-symbols-outlined text-[20px]">tune</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {['All Records', 'Birth Certs', 'Census Data', 'Photos'].map((tab, i) => (
              <button key={tab} className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${i === 0 ? 'bg-primary text-white' : 'bg-surface border border-white/10 text-gray-400'}`}>
                  {tab}
              </button>
          ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined">description</span>
              </div>
              <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Total Records</p>
                  <p className="text-xl font-bold text-white">{ancestors.length}</p>
              </div>
          </div>
          <div className="bg-surface border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Unlinked</p>
                  <p className="text-xl font-bold text-white">8</p>
              </div>
          </div>
      </div>

      {/* Import CTA */}
      <button onClick={onImportClick} className="w-full mb-6 bg-surface border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 hover:bg-surface-light/30 transition gap-2">
           <span className="material-symbols-outlined text-3xl text-gray-500">cloud_upload</span>
           <span className="text-sm font-medium">Tap to Upload New Record</span>
      </button>

      {/* Recent List */}
      <h3 className="text-gray-400 text-xs font-bold uppercase mb-3">Recently Added</h3>
      <div className="space-y-3 flex-1 overflow-y-auto">
          {filtered.length > 0 ? filtered.map((rec) => (
              <div key={rec.id} className="bg-surface border border-white/5 rounded-xl p-3 flex gap-3 group">
                  <div className="w-12 h-12 rounded-lg bg-surface-light flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-gray-400">article</span>
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{rec.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded">Person</span>
                          <span className="text-[10px] text-gray-500">• {rec.birthYear || 'No Date'}</span>
                      </div>
                  </div>
                  <button className="text-gray-500 hover:text-white">
                      <span className="material-symbols-outlined">more_vert</span>
                  </button>
              </div>
          )) : (
              <div className="text-center text-gray-500 py-10">No records found matching filter.</div>
          )}
      </div>
    </div>
  );
};