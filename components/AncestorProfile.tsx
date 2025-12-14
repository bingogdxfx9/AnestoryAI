import React from 'react';
import { Ancestor } from '../types';

interface Props {
  ancestor: Ancestor;
  allAncestors: Ancestor[];
  onBack: () => void;
  onEdit: (id: string) => void;
  onNavigateTree: () => void;
  onSelectRelative: (id: string) => void;
}

export const AncestorProfile: React.FC<Props> = ({ ancestor, allAncestors, onBack, onEdit, onNavigateTree, onSelectRelative }) => {
  const father = allAncestors.find(a => a.id === ancestor.fatherId);
  const mother = allAncestors.find(a => a.id === ancestor.motherId);
  const children = allAncestors.filter(a => a.fatherId === ancestor.id || a.motherId === ancestor.id);

  const lifespan = (ancestor.birthYear && ancestor.deathYear) 
    ? ancestor.deathYear - ancestor.birthYear 
    : null;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto pb-24 animate-fade-in">
      {/* Hero Header */}
      <div className="relative h-64 w-full shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 to-background z-0"></div>
        {ancestor.photoUrl && (
             <div 
                className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm" 
                style={{backgroundImage: `url(${ancestor.photoUrl})`}}
            ></div>
        )}
        
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center">
             <button onClick={onBack} className="p-2 rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40">
                <span className="material-symbols-outlined">arrow_back</span>
             </button>
             <div className="flex gap-2">
                 <button onClick={() => onEdit(ancestor.id)} className="p-2 rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40">
                    <span className="material-symbols-outlined">edit</span>
                 </button>
                 <button className="p-2 rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40">
                    <span className="material-symbols-outlined">share</span>
                 </button>
             </div>
        </div>

        <div className="absolute -bottom-16 left-0 right-0 flex justify-center z-20">
             <div className="relative">
                 {ancestor.photoUrl ? (
                     <div className="w-32 h-32 rounded-full border-4 border-background bg-cover bg-center shadow-2xl" style={{backgroundImage: `url(${ancestor.photoUrl})`}}></div>
                 ) : (
                     <div className="w-32 h-32 rounded-full border-4 border-background bg-surface-light flex items-center justify-center shadow-2xl">
                        <span className="text-4xl text-gray-400 font-bold">{ancestor.name.charAt(0)}</span>
                     </div>
                 )}
                 {ancestor.fatherId && <div className="absolute -top-2 right-0 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">LINKED</div>}
             </div>
        </div>
      </div>

      {/* Main Info */}
      <div className="mt-20 px-6 text-center">
         <h1 className="text-2xl font-bold text-white">{ancestor.name}</h1>
         <p className="text-gray-400 font-medium mt-1">
            {ancestor.birthYear || '?'} – {ancestor.deathYear || 'Present'} 
            {lifespan && <span className="mx-2">•</span>}
            {lifespan && `${lifespan} Years`}
         </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-6 px-6">
         <button onClick={onNavigateTree} className="flex-1 bg-surface border border-white/10 hover:bg-surface-light text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition">
            <span className="material-symbols-outlined text-lg">account_tree</span>
            View Tree
         </button>
         <button onClick={() => onEdit(ancestor.id)} className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-lg">edit_note</span>
            Edit Profile
         </button>
      </div>

      {/* Details Container */}
      <div className="mt-8 mx-4 bg-surface border border-white/5 rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Vital Information</h3>
          
          <div className="space-y-4">
              <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-light flex items-center justify-center text-gray-400 shrink-0">
                      <span className="material-symbols-outlined">cake</span>
                  </div>
                  <div>
                      <p className="text-xs text-gray-400">Born</p>
                      <p className="text-white font-medium">{ancestor.birthYear ? `Approx. ${ancestor.birthYear}` : 'Unknown'}</p>
                      <p className="text-xs text-blue-400 mt-0.5">{ancestor.country}</p>
                  </div>
              </div>
              
              <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-light flex items-center justify-center text-gray-400 shrink-0">
                      <span className="material-symbols-outlined">church</span>
                  </div>
                  <div>
                      <p className="text-xs text-gray-400">Died</p>
                      <p className="text-white font-medium">{ancestor.deathYear ? `Approx. ${ancestor.deathYear}` : 'Living / Unknown'}</p>
                  </div>
              </div>

              {ancestor.notes && (
                  <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-surface-light flex items-center justify-center text-gray-400 shrink-0">
                          <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                          <p className="text-xs text-gray-400">Notes</p>
                          <p className="text-white text-sm mt-1 leading-relaxed">{ancestor.notes}</p>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Family Links */}
      <div className="mt-6 mx-4 mb-8">
          <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white">Family</h3>
              <button className="text-xs text-primary font-medium">View All</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
             {/* Parents */}
             {father && (
                 <div onClick={() => onSelectRelative(father.id)} className="bg-surface border border-white/5 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-surface-light/50 transition">
                     <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center text-gray-400 text-sm font-bold border border-white/10">
                        {father.photoUrl ? <img src={father.photoUrl} className="w-full h-full rounded-full object-cover"/> : father.name.charAt(0)}
                     </div>
                     <div className="min-w-0">
                        <p className="text-xs text-primary font-bold uppercase tracking-wide mb-0.5">Father</p>
                        <p className="text-white text-sm font-medium truncate">{father.name}</p>
                        <p className="text-[10px] text-gray-500">{father.birthYear} - {father.deathYear}</p>
                     </div>
                 </div>
             )}
             {mother && (
                 <div onClick={() => onSelectRelative(mother.id)} className="bg-surface border border-white/5 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-surface-light/50 transition">
                     <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center text-gray-400 text-sm font-bold border border-white/10">
                        {mother.photoUrl ? <img src={mother.photoUrl} className="w-full h-full rounded-full object-cover"/> : mother.name.charAt(0)}
                     </div>
                     <div className="min-w-0">
                        <p className="text-xs text-pink-500 font-bold uppercase tracking-wide mb-0.5">Mother</p>
                        <p className="text-white text-sm font-medium truncate">{mother.name}</p>
                        <p className="text-[10px] text-gray-500">{mother.birthYear} - {mother.deathYear}</p>
                     </div>
                 </div>
             )}
          </div>

          {/* Children */}
          {children.length > 0 && (
             <div className="mt-4">
                 <p className="text-xs text-gray-500 font-medium mb-2 uppercase">Children ({children.length})</p>
                 <div className="space-y-2">
                     {children.map(child => (
                         <div key={child.id} onClick={() => onSelectRelative(child.id)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition">
                             <div className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-gray-400 text-xs font-bold">
                                {child.name.charAt(0)}
                             </div>
                             <p className="text-white text-sm">{child.name}</p>
                         </div>
                     ))}
                 </div>
             </div>
          )}
      </div>
    </div>
  );
};