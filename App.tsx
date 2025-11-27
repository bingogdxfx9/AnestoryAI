import React, { useState, useEffect } from 'react';
import { Ancestor, AncestorFormData } from './types';
import { StorageService } from './services/storage';
import { calculateStats, calculateCompleteness } from './utils/genealogy';
import { generateFamilyReport } from './services/reportGenerator';
import { AncestorForm } from './components/AncestorForm';
import { TreeVisualization } from './components/TreeVisualization';
import { RelationshipCalculator } from './components/RelationshipCalculator';
import { AIHistorian } from './components/AIHistorian';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DataScrutinizer } from './components/DataScrutinizer';
import { SmartSearch } from './components/SmartSearch';
import { TimeTravelStudio } from './components/TimeTravelStudio';
import { StoryModal } from './components/StoryModal';
import { ContextModal } from './components/ContextModal';
import { ImportWizard } from './components/ImportWizard';
import { ThreeView } from './components/ThreeView';

const App: React.FC = () => {
  const [ancestors, setAncestors] = useState<Ancestor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showScrutinizer, setShowScrutinizer] = useState(false);
  const [showTimeTravel, setShowTimeTravel] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showThreeView, setShowThreeView] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAncestorId, setSelectedAncestorId] = useState<string | null>(null);
  const [storyAncestorId, setStoryAncestorId] = useState<string | null>(null);
  const [contextAncestorId, setContextAncestorId] = useState<string | null>(null);
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [scrutinizedData, setScrutinizedData] = useState<any>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  
  // Search State
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') === 'dark' || 
               (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Dark Mode Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Load Data via Firestore Subscription
  useEffect(() => {
    // Check for seed
    StorageService.checkAndSeed();

    const unsubscribe = StorageService.subscribe((data) => {
        setAncestors(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddClick = () => {
    setEditingId(null);
    setScrutinizedData(null);
    setShowForm(true);
  };

  const handleSmartAddClick = () => {
    setShowScrutinizer(true);
  };

  const handleScrutinyComplete = (data: any) => {
    setScrutinizedData(data);
    setShowScrutinizer(false);
    setEditingId(null);
    setShowForm(true); // Open form populated with data
  };

  const handleEditClick = (id: string) => {
    setEditingId(id);
    setScrutinizedData(null);
    setShowForm(true);
  };

  const handleDelete = (id: string, name: string) => {
    const shouldDelete = window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`);
    if (shouldDelete) {
      StorageService.delete(id);
      if (selectedAncestorId === id) setSelectedAncestorId(null);
    }
  };

  const handleStoryClick = (id: string) => {
    setStoryAncestorId(id);
    setShowStoryModal(true);
  };

  const handleContextClick = (id: string) => {
    setContextAncestorId(id);
    setShowContextModal(true);
  };

  const handleSaveForm = (data: AncestorFormData) => {
    if (editingId) {
      StorageService.update(editingId, {
        name: data.name,
        birthYear: data.birthYear ? parseInt(data.birthYear) : null,
        deathYear: data.deathYear ? parseInt(data.deathYear) : null,
        gender: data.gender,
        country: data.country || null, // Changed from undefined to null for Firestore compatibility
        fatherId: data.fatherId || null,
        motherId: data.motherId || null,
        notes: data.notes
      });
    } else {
      StorageService.add({
        name: data.name,
        birthYear: data.birthYear ? parseInt(data.birthYear) : null,
        deathYear: data.deathYear ? parseInt(data.deathYear) : null,
        gender: data.gender,
        country: data.country || null, // Changed from undefined to null for Firestore compatibility
        fatherId: data.fatherId || null,
        motherId: data.motherId || null,
        notes: data.notes
      });
    }
    setShowForm(false);
    setScrutinizedData(null);
  };

  const handleUpdateFromAnalytics = (id: string, updates: Partial<Ancestor>) => {
    StorageService.update(id, updates);
  };

  const handleDownloadReport = async () => {
    setReportGenerating(true);
    let treeImage = undefined;
    let threeImage = undefined;

    // 1. Capture SVG Tree
    try {
        const svgElement = document.getElementById('tree-svg') as any;
        if (svgElement) {
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            img.src = url;
            await new Promise((resolve) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = svgElement.clientWidth;
                    canvas.height = svgElement.clientHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                        treeImage = canvas.toDataURL('image/png');
                    }
                    URL.revokeObjectURL(url);
                    resolve(null);
                };
                img.onerror = () => resolve(null);
            });
        }
    } catch (e) {
        console.error("Tree screenshot capture failed", e);
    }

    // 2. Capture Three.js Canvas
    if (showThreeView) {
        const canvasElement = document.getElementById('three-canvas');
        if (canvasElement) {
           try {
               threeImage = (canvasElement as HTMLCanvasElement).toDataURL('image/png');
           } catch(e) {
               console.error("WebGL screenshot capture failed", e);
           }
        }
    }

    generateFamilyReport(ancestors, { tree: treeImage, three: threeImage });
    setReportGenerating(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const stats = calculateStats(ancestors);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-200 flex flex-col">
      {/* Header */}
      <header className="bg-slate-850 text-white shadow-lg sticky top-0 z-40 dark:border-b dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">AncestryAI</h1>
            <p className="text-slate-400 text-xs">Advanced Genealogy & Context</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center items-center">
             
             {/* Dark Mode Toggle */}
             <button
               onClick={toggleDarkMode}
               className="bg-slate-700 hover:bg-slate-600 text-yellow-300 p-2 rounded-full transition shadow-md"
               title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
               {darkMode ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                 </svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-200" viewBox="0 0 20 20" fill="currentColor">
                   <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                 </svg>
               )}
             </button>

             <button
                onClick={handleDownloadReport}
                disabled={reportGenerating}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-3 py-2 rounded-md font-medium transition shadow-md flex items-center text-sm"
                title="Download Family Book PDF"
             >
                <span className="mr-1">{reportGenerating ? '⏳' : '📄'}</span> Report
             </button>
             
             <button
                onClick={() => setShowImportWizard(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-md font-medium transition shadow-md flex items-center text-sm"
                title="Import GEDCOM or CSV"
             >
                <span className="mr-1">📂</span> Import
             </button>
            
             <button
                onClick={() => setShowThreeView(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-md font-medium transition shadow-md flex items-center text-sm"
             >
                <span className="mr-1">🧊</span> 3D View
             </button>

             <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`px-3 py-2 rounded text-sm font-medium transition ${showAnalytics ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
             >
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
             </button>
             
             <button
                onClick={() => setShowTimeTravel(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-3 py-2 rounded-md font-medium transition shadow-md flex items-center text-sm"
             >
                <span className="mr-1">⏳</span> Time Travel
             </button>

             <button
                onClick={handleSmartAddClick}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-md font-medium transition shadow-md flex items-center text-sm"
             >
                <span className="mr-1">⚡</span> Smart Add
             </button>
             <button 
                onClick={handleAddClick}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition shadow-md flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Ancestor
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        <SmartSearch 
            ancestors={ancestors} 
            onFilter={(ids) => setFilteredIds(ids)} 
            onClear={() => setFilteredIds(null)} 
        />

        {showAnalytics && (
             <div className="mb-8 animate-fade-in-down">
                 <AnalyticsDashboard ancestors={ancestors} onUpdateAncestor={handleUpdateFromAnalytics} />
             </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Stats & List */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Family Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="block text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Total Members</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.avgLifespan}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Avg Lifespan</span>
                </div>
              </div>
              <div className="mt-4 flex justify-between text-sm text-slate-600 dark:text-slate-300 border-t dark:border-slate-700 pt-4">
                 <span>Male: <b>{stats.male}</b></span>
                 <span>Female: <b>{stats.female}</b></span>
                 <span>Unk: <b>{stats.unknown}</b></span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[600px] transition-colors">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Records</h3>
                {filteredIds && <span className="text-xs text-indigo-600 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-900/50 px-2 py-1 rounded">Filtered: {filteredIds.length}</span>}
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {ancestors.map(person => {
                  const completeness = calculateCompleteness(person);
                  const completenessColor = completeness === 100 ? 'bg-emerald-500' : completeness > 50 ? 'bg-yellow-500' : 'bg-red-500';
                  const hasDates = person.birthYear && person.deathYear;
                  
                  const isMatch = !filteredIds || filteredIds.includes(person.id);
                  const opacity = isMatch ? 'opacity-100' : 'opacity-40';

                  return (
                    <div 
                        key={person.id}
                        onClick={() => setSelectedAncestorId(person.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition flex justify-between items-center group ${opacity}
                        ${selectedAncestorId === person.id 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 ring-1 ring-indigo-300 dark:ring-indigo-700' 
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
                        `}
                    >
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-slate-800 dark:text-slate-100">{person.name}</p>
                                <div className="flex items-center gap-1" title={`Data Completeness: ${completeness}%`}>
                                    <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${completenessColor}`} style={{ width: `${completeness}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {person.birthYear || '?'} - {person.deathYear || '?'}
                                {person.country && <span className="ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px]">{person.country}</span>}
                            </p>
                        </div>
                        <div className="flex gap-2 items-center ml-2">
                          {hasDates && (
                             <button
                                onClick={(e) => { e.stopPropagation(); handleContextClick(person.id); }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900 rounded-full transition opacity-0 group-hover:opacity-100"
                                title="Historical Context"
                             >
                                 <span className="text-lg leading-none">📜</span>
                             </button>
                          )}

                          <button
                             onClick={(e) => { e.stopPropagation(); handleStoryClick(person.id); }}
                             className="p-1.5 text-slate-400 hover:text-purple-600 bg-slate-50 dark:bg-slate-700 hover:bg-purple-50 dark:hover:bg-purple-900 rounded-full transition opacity-0 group-hover:opacity-100"
                             title="Generate Story"
                          >
                              <span className="text-lg leading-none">📖</span>
                          </button>

                          <button 
                              onClick={(e) => { e.stopPropagation(); handleEditClick(person.id); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 transition opacity-0 group-hover:opacity-100"
                              title="Edit"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                          </button>
                          <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(person.id, person.name); }}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                              title="Delete"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                          </button>
                        </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <TreeVisualization 
                ancestors={ancestors} 
                filteredIds={filteredIds}
                onSelectNode={setSelectedAncestorId} 
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-1">
                 <AIHistorian selectedAncestorId={selectedAncestorId} ancestors={ancestors} />
              </div>
               <div className="md:col-span-1">
                 <RelationshipCalculator ancestors={ancestors} />
               </div>
            </div>

          </div>
        </div>
      </main>

      {showScrutinizer && (
        <DataScrutinizer 
            onCancel={() => setShowScrutinizer(false)}
            onAnalysisComplete={handleScrutinyComplete}
        />
      )}

      {showImportWizard && (
        <ImportWizard 
            onClose={() => setShowImportWizard(false)}
            onImportComplete={() => {}} // No-op, realtime listener updates automatically
        />
      )}

      {showTimeTravel && (
        <TimeTravelStudio onClose={() => setShowTimeTravel(false)} />
      )}

      {showThreeView && (
        <ThreeView 
            ancestors={ancestors}
            onClose={() => setShowThreeView(false)}
        />
      )}

      {showStoryModal && storyAncestorId && (
          <StoryModal 
              ancestor={ancestors.find(a => a.id === storyAncestorId)!} 
              allAncestors={ancestors} 
              onClose={() => { setShowStoryModal(false); setStoryAncestorId(null); }} 
          />
      )}

      {showContextModal && contextAncestorId && (
          <ContextModal
              ancestor={ancestors.find(a => a.id === contextAncestorId)!}
              onClose={() => { setShowContextModal(false); setContextAncestorId(null); }}
          />
      )}

      {showForm && (
        <AncestorForm 
          ancestors={ancestors}
          editingId={editingId}
          prefillData={scrutinizedData}
          onSave={handleSaveForm}
          onCancel={() => { setShowForm(false); setScrutinizedData(null); }}
        />
      )}
    </div>
  );
};

export default App;