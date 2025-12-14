import React, { useState, useEffect } from 'react';
import { Ancestor, AncestorFormData } from './types';
import { StorageService } from './services/storage';
import { generateFamilyReport } from './services/reportGenerator';
import { AncestorForm } from './components/AncestorForm';
import { TreeVisualization } from './components/TreeVisualization';
import { Dashboard } from './components/Dashboard';
import { AncestorProfile } from './components/AncestorProfile';
import { RecordVault } from './components/RecordVault';
import { ImportWizard } from './components/ImportWizard';
import { TimeTravelStudio } from './components/TimeTravelStudio';
import { ThreeView } from './components/ThreeView';

type View = 'dashboard' | 'tree' | 'records' | 'profile' | 'search';

const App: React.FC = () => {
  const [ancestors, setAncestors] = useState<Ancestor[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // Modals & Overlays
  const [showForm, setShowForm] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showTimeTravel, setShowTimeTravel] = useState(false);
  const [showThreeView, setShowThreeView] = useState(false);
  
  // Selection State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAncestorId, setSelectedAncestorId] = useState<string | null>(null);
  
  // Filters
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null);

  // Load Data
  useEffect(() => {
    StorageService.checkAndSeed();
    const unsubscribe = StorageService.subscribe((data) => {
        setAncestors(data);
    });
    return () => unsubscribe();
  }, []);

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
  };

  const handleSelectAncestor = (id: string) => {
    setSelectedAncestorId(id);
    setCurrentView('profile');
  };

  const handleQuickAction = (action: string) => {
    if (action === 'import') setShowImportWizard(true);
    if (action === '3d') setShowThreeView(true);
    if (action === 'smart') setShowForm(true); // Simplified for demo
    if (action === 'report') generateFamilyReport(ancestors);
  };

  const handleSaveForm = (data: AncestorFormData) => {
    const payload = {
        name: data.name,
        birthYear: data.birthYear ? parseInt(data.birthYear) : null,
        deathYear: data.deathYear ? parseInt(data.deathYear) : null,
        gender: data.gender,
        country: data.country || null,
        fatherId: data.fatherId || null,
        motherId: data.motherId || null,
        notes: data.notes,
        photoUrl: data.photoUrl
    };

    if (editingId) {
      StorageService.update(editingId, payload);
    } else {
      StorageService.add(payload);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const selectedAncestor = ancestors.find(a => a.id === selectedAncestorId);

  return (
    <div className="h-screen w-full bg-background flex flex-col relative overflow-hidden font-sans text-white">
      
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {currentView === 'dashboard' && (
            <Dashboard 
                ancestors={ancestors} 
                onNavigate={handleNavigate}
                onQuickAction={handleQuickAction}
                onSelectAncestor={handleSelectAncestor}
            />
        )}
        
        {currentView === 'tree' && (
            <div className="h-full w-full relative">
                 <button onClick={() => setCurrentView('dashboard')} className="absolute top-4 left-4 z-20 p-2 rounded-full bg-surface/50 text-white backdrop-blur">
                    <span className="material-symbols-outlined">arrow_back</span>
                 </button>
                 <TreeVisualization 
                    ancestors={ancestors}
                    filteredIds={filteredIds}
                    onSelectNode={handleSelectAncestor}
                 />
                 <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none">
                     <div className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-2xl flex items-center gap-1 pointer-events-auto">
                        <button className="w-10 h-10 rounded-full flex flex-col items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition">
                            <span className="material-symbols-outlined text-[20px]">palette</span>
                        </button>
                        <button onClick={() => setShowForm(true)} className="mx-1 w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition">
                            <span className="material-symbols-outlined text-[24px]">add</span>
                        </button>
                        <button onClick={() => setShowThreeView(true)} className="w-10 h-10 rounded-full flex flex-col items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition">
                            <span className="material-symbols-outlined text-[20px]">view_in_ar</span>
                        </button>
                     </div>
                 </div>
            </div>
        )}

        {currentView === 'profile' && selectedAncestor && (
            <AncestorProfile 
                ancestor={selectedAncestor}
                allAncestors={ancestors}
                onBack={() => setCurrentView('tree')}
                onEdit={(id) => { setEditingId(id); setShowForm(true); }}
                onNavigateTree={() => setCurrentView('tree')}
                onSelectRelative={handleSelectAncestor}
            />
        )}

        {currentView === 'records' && (
            <RecordVault 
                ancestors={ancestors}
                onImportClick={() => setShowImportWizard(true)}
            />
        )}

        {currentView === 'search' && (
             <div className="p-6 h-full flex flex-col items-center justify-center text-gray-500">
                 <span className="material-symbols-outlined text-4xl mb-2">construction</span>
                 <p>Advanced Search Coming Soon</p>
             </div>
        )}
      </main>

      {/* Bottom Navigation */}
      {currentView !== 'tree' && currentView !== 'profile' && (
          <nav className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-white/5 py-3 px-6 flex justify-between items-center z-50">
            {[
                { id: 'dashboard', icon: 'dashboard', label: 'Home' },
                { id: 'tree', icon: 'account_tree', label: 'Tree' },
                { id: 'search', icon: 'search', label: 'Search' },
                { id: 'records', icon: 'folder_open', label: 'Records' }, // Using records view
            ].map((item) => (
                <button 
                    key={item.id}
                    onClick={() => setCurrentView(item.id as View)}
                    className={`flex flex-col items-center gap-1 transition ${currentView === item.id ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                    <span className="text-[10px] font-medium">{item.label}</span>
                </button>
            ))}
          </nav>
      )}

      {/* Modals */}
      {showForm && (
        <AncestorForm 
            ancestors={ancestors}
            editingId={editingId}
            onSave={handleSaveForm}
            onCancel={() => { setShowForm(false); setEditingId(null); }}
        />
      )}
      
      {showImportWizard && (
        <ImportWizard 
            onClose={() => setShowImportWizard(false)} 
            onImportComplete={() => {}}
        />
      )}
      
      {showThreeView && (
        <ThreeView 
            ancestors={ancestors}
            onClose={() => setShowThreeView(false)}
        />
      )}

      {showTimeTravel && (
        <TimeTravelStudio onClose={() => setShowTimeTravel(false)} />
      )}

    </div>
  );
};

export default App;