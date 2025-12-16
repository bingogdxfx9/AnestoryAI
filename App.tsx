import React, { useState, useEffect } from 'react';
import { Ancestor, AncestorFormData } from './types';
import { StorageService } from './services/storage';
import { auth } from './services/firebase';
import { signInAnonymously, onAuthStateChanged, User, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { generateFamilyReport } from './services/reportGenerator';
import { AncestorForm } from './components/AncestorForm';
import { TreeVisualization } from './components/TreeVisualization';
import { Dashboard } from './components/Dashboard';
import { AncestorProfile } from './components/AncestorProfile';
import { RecordVault } from './components/RecordVault';
import { ImportWizard } from './components/ImportWizard';
import { TimeTravelStudio } from './components/TimeTravelStudio';
import { ThreeView } from './components/ThreeView';
import { DataScrutinizer } from './components/DataScrutinizer';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ReportGenerationModal } from './components/ReportGenerationModal';
import { LoginModal } from './components/LoginModal';

type View = 'dashboard' | 'tree' | 'records' | 'profile' | 'search' | 'analytics';

const App: React.FC = () => {
  const [ancestors, setAncestors] = useState<Ancestor[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Auth & Data State
  const [user, setUser] = useState<User | null>(null);
  const [isAdminLocal, setIsAdminLocal] = useState(false); // Local state for hardcoded admin
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Modals & Overlays
  const [showForm, setShowForm] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showTimeTravel, setShowTimeTravel] = useState(false);
  const [showThreeView, setShowThreeView] = useState(false);
  const [showScrutinizer, setShowScrutinizer] = useState(false);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  // Selection State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAncestorId, setSelectedAncestorId] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<any>(null);
  
  // Filters
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null);

  // Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
            setUser(u);
            setIsAuthLoading(false);
        } else {
            // Auto sign-in anonymously if no user is present
            signInAnonymously(auth)
                .catch((error) => {
                    console.warn("Anonymous Auth Warning:", error);
                    // Don't fail hard on auth network error; try to proceed as guest to see if DB is public
                    setIsAuthLoading(false);
                });
        }
    });
    return unsubscribe;
  }, []);

  // Data Loading Effect
  useEffect(() => {
    // Only try to seed if we have a user to write with, otherwise we might get permission errors silently or noisily
    if (user) {
        StorageService.checkAndSeed(); 
    }

    // Subscribe to real-time updates
    const unsubscribe = StorageService.subscribe(
        (data) => {
            setAncestors(data);
            setDbError(null); // Clear previous errors on success
        },
        (error: any) => {
             // Handle permission errors
             if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
                 setDbError("Access denied. Firestore Rules block this request.");
             } else {
                 setDbError(`Connection error: ${error.message}`);
             }
        }
    );
    return () => unsubscribe();
  }, [user]);

  // Theme Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
  };

  const handleSelectAncestor = (id: string) => {
    setSelectedAncestorId(id);
    setCurrentView('profile');
  };

  const isAdmin = isAdminLocal || (user && !user.isAnonymous);
  const isReadOnly = !isAdmin;

  const handleQuickAction = (action: string) => {
    // Permission Check
    if (isReadOnly && (action === 'manual-add' || action === 'import' || action === 'smart')) {
        setShowLogin(true); // Prompt login
        return;
    }

    if (action === 'import') setShowImportWizard(true);
    if (action === '3d') setShowThreeView(true);
    if (action === 'time-travel') setShowTimeTravel(true);
    if (action === 'smart') setShowScrutinizer(true);
    if (action === 'analytics') setCurrentView('analytics');
    if (action === 'generate-book') setShowReportGenerator(true);
    
    // Fallback simple report if needed (deprecated by book generator)
    if (action === 'report') generateFamilyReport(ancestors);
    
    if (action === 'manual-add') {
      setEditingId(null);
      setPrefillData(null);
      setShowForm(true);
    }
  };

  const handleScrutinyComplete = (data: any) => {
    setPrefillData(data);
    setShowScrutinizer(false);
    setShowForm(true);
  };

  const handleSaveForm = async (data: AncestorFormData) => {
    if (isReadOnly) {
        alert("Action Denied: You must be an admin to modify records.");
        return;
    }

    // Helper to safely parse numbers, treating NaN/empty as null
    const parseNumber = (val: string) => {
        if (!val) return null;
        const num = parseInt(val, 10);
        return isNaN(num) ? null : num;
    };

    const payload = {
        name: data.name,
        birthYear: parseNumber(data.birthYear),
        deathYear: parseNumber(data.deathYear),
        gender: data.gender,
        country: data.country || null,
        fatherId: data.fatherId || null,
        motherId: data.motherId || null,
        notes: data.notes,
        // photoUrl is guaranteed by form to be string, but if empty, we send null
        // Sanitizer will remove undefined keys if any slip through
        photoUrl: data.photoUrl ? data.photoUrl : null
    };

    try {
        if (editingId) {
            await StorageService.update(editingId, payload);
        } else {
            await StorageService.add(payload);
        }
        setShowForm(false);
        setEditingId(null);
        setPrefillData(null);
    } catch (e: any) {
        // Robust check for permission errors
        if (e.code === 'permission-denied' || e.message?.toLowerCase().includes('permission') || e.message?.toLowerCase().includes('access')) {
             // Set error state to show the permissions help screen
             setDbError("Access denied. Unable to save record. Please check Firestore Rules.");
             setShowForm(false);
        } else {
             alert(`Failed to save: ${e.message}`);
        }
    }
  };
  
  const handleUpdateAncestor = (id: string, updates: Partial<Ancestor>) => {
      if (isReadOnly) {
          setShowLogin(true);
          return;
      }
      StorageService.update(id, updates).catch((e) => {
          if (e.code === 'permission-denied' || e.message?.toLowerCase().includes('permission')) {
              setDbError("Access denied. Unable to update record.");
          } else {
              alert("Update failed.");
          }
      });
  };

  const handleDeleteAncestor = (id: string) => {
      if (isReadOnly) {
          setShowLogin(true);
          return;
      }
      StorageService.delete(id).catch((e) => {
          if (e.code === 'permission-denied' || e.message?.toLowerCase().includes('permission')) {
               setDbError("Access denied. Unable to delete record.");
          } else {
               alert("Delete failed.");
          }
      });
      setSelectedAncestorId(null);
  };

  const handleAdminLogin = async (id: string, pass: string) => {
    // Normalize input
    const username = id.trim().toLowerCase();
    const password = pass.trim();

    // Check for hardcoded credentials first
    if (username === 'admin' && password === 'password') {
        setIsAdminLocal(true);
        setShowLogin(false);
        return;
    }

    // Fallback to Firebase Auth
    try {
        await signInWithEmailAndPassword(auth, id.trim(), pass.trim());
        setShowLogin(false);
    } catch (e) {
        throw e; // Modal will handle error display
    }
  };

  const handleLogout = async () => {
    if (isAdminLocal) {
        setIsAdminLocal(false);
    } else {
        await signOut(auth);
    }
  };

  const selectedAncestor = ancestors.find(a => a.id === selectedAncestorId);

  // Loading / Error Screen
  if (isAuthLoading) {
      return (
          <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
              <p>Authenticating...</p>
          </div>
      );
  }

  if (dbError) {
      return (
          <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
              <span className="material-symbols-outlined text-5xl text-red-500 mb-4">gpp_maybe</span>
              <h2 className="text-2xl font-bold mb-2">Database Access Denied</h2>
              <p className="text-slate-400 max-w-lg mb-6">{dbError}</p>
              
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 max-w-xl w-full text-left">
                  <p className="text-sm text-slate-300 mb-3 font-semibold">Action Required: Update Firestore Rules</p>
                  <p className="text-xs text-slate-500 mb-3">
                      Go to <strong>Firebase Console</strong> &gt; <strong>Firestore Database</strong> &gt; <strong>Rules</strong> and paste this configuration:
                  </p>
                  <div className="bg-black/50 p-4 rounded border border-slate-600 font-mono text-xs text-green-400 overflow-x-auto">
                       <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                      Ensure <strong>Anonymous Authentication</strong> is enabled in <strong>Authentication</strong> &gt; <strong>Sign-in method</strong>.
                  </p>
                  <button 
                    onClick={() => setDbError(null)} 
                    className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-sm font-bold"
                  >
                    Try Again
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-900 flex flex-col relative overflow-hidden font-sans text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* Admin Login Button */}
      <button 
        onClick={() => isAdmin ? handleLogout() : setShowLogin(true)}
        className="absolute top-4 right-20 z-50 px-3 py-2 rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/20 transition shadow-sm flex items-center gap-2"
        title={isAdmin ? "Logout Admin" : "Admin Login"}
      >
         <span className="material-symbols-outlined filled-icon text-[20px]">
            {isAdmin ? 'logout' : 'admin_panel_settings'}
         </span>
         <span className="text-xs font-bold hidden sm:inline">
            {isAdmin ? 'Logout' : 'Admin'}
         </span>
      </button>

      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/20 transition shadow-sm"
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      >
         <span className="material-symbols-outlined filled-icon">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
         </span>
      </button>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {currentView === 'dashboard' && (
            <Dashboard 
                ancestors={ancestors} 
                isReadOnly={isReadOnly}
                onNavigate={handleNavigate}
                onQuickAction={handleQuickAction}
                onSelectAncestor={handleSelectAncestor}
            />
        )}
        
        {currentView === 'tree' && (
            <div className="h-full w-full relative">
                 <button onClick={() => setCurrentView('dashboard')} className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white backdrop-blur hover:bg-white dark:hover:bg-slate-800 transition border border-slate-200 dark:border-white/10 shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                 </button>
                 <TreeVisualization 
                    ancestors={ancestors}
                    filteredIds={filteredIds}
                    onSelectNode={handleSelectAncestor}
                 />
                 <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none">
                     <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-full p-1.5 shadow-2xl flex items-center gap-1 pointer-events-auto">
                        <button className="w-10 h-10 rounded-full flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition">
                            <span className="material-symbols-outlined text-[20px]">palette</span>
                        </button>
                        <button onClick={() => setShowScrutinizer(true)} className="mx-1 w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition">
                            <span className="material-symbols-outlined text-[24px]">add</span>
                        </button>
                        <button onClick={() => setShowThreeView(true)} className="w-10 h-10 rounded-full flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition">
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
                isReadOnly={isReadOnly}
                onBack={() => setCurrentView('tree')}
                onEdit={(id) => { setEditingId(id); setShowForm(true); }}
                onDelete={handleDeleteAncestor}
                onNavigateTree={() => setCurrentView('tree')}
                onSelectRelative={handleSelectAncestor}
            />
        )}

        {currentView === 'records' && (
            <RecordVault 
                ancestors={ancestors}
                isReadOnly={isReadOnly}
                onImportClick={() => setShowImportWizard(true)}
            />
        )}
        
        {currentView === 'analytics' && (
             <div className="h-full w-full overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 pb-24 animate-fade-in transition-colors duration-300">
                 <div className="max-w-4xl mx-auto">
                     <div className="flex items-center mb-6 sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 py-2 transition-colors duration-300">
                         <button onClick={() => setCurrentView('dashboard')} className="mr-4 p-2 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition">
                            <span className="material-symbols-outlined">arrow_back</span>
                         </button>
                         <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500 dark:text-indigo-400">health_and_safety</span>
                                AI Tree Health & Insights
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-gray-500">Predictive gap filling and anomaly detection powered by Gemini.</p>
                         </div>
                     </div>
                     <AnalyticsDashboard 
                        ancestors={ancestors} 
                        isReadOnly={isReadOnly}
                        onUpdateAncestor={handleUpdateAncestor}
                     />
                 </div>
             </div>
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
          <nav className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-white/5 py-3 px-6 flex justify-between items-center z-50 transition-colors duration-300">
            {[
                { id: 'dashboard', icon: 'dashboard', label: 'Home' },
                { id: 'tree', icon: 'account_tree', label: 'Tree' },
                { id: 'analytics', icon: 'insights', label: 'Insights' },
                { id: 'records', icon: 'folder_open', label: 'Records' },
            ].map((item) => (
                <button 
                    key={item.id}
                    onClick={() => setCurrentView(item.id as View)}
                    className={`flex flex-col items-center gap-1 transition ${currentView === item.id ? 'text-primary' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-white'}`}
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
            prefillData={prefillData}
            onSave={handleSaveForm}
            onCancel={() => { setShowForm(false); setEditingId(null); setPrefillData(null); }}
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

      {showScrutinizer && (
        <DataScrutinizer 
            onCancel={() => setShowScrutinizer(false)}
            onAnalysisComplete={handleScrutinyComplete}
        />
      )}

      {showReportGenerator && (
        <ReportGenerationModal 
            ancestors={ancestors}
            onClose={() => setShowReportGenerator(false)}
        />
      )}

      {showLogin && (
        <LoginModal 
            onLogin={handleAdminLogin}
            onCancel={() => setShowLogin(false)}
        />
      )}

    </div>
  );
};

export default App;