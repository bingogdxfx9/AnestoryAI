import React from 'react';
import { Ancestor } from '../types';
import { calculateStats } from '../utils/genealogy';

interface Props {
  ancestors: Ancestor[];
  userName?: string;
  isReadOnly: boolean;
  onNavigate: (view: string) => void;
  onQuickAction: (action: string) => void;
  onSelectAncestor: (id: string) => void;
}

export const Dashboard: React.FC<Props> = ({ ancestors, userName = "Michael", isReadOnly, onNavigate, onQuickAction, onSelectAncestor }) => {
  const stats = calculateStats(ancestors);
  
  // Stats calculations
  const total = stats.total;
  const malePct = total > 0 ? Math.round((stats.male / total) * 100) : 0;
  const femalePct = total > 0 ? Math.round((stats.female / total) * 100) : 0;
  const avgLife = parseFloat(stats.avgLifespan as string) || 0;

  const recentActivity = [...ancestors]
    .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
    .slice(0, 3);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 px-4 pt-4 animate-fade-in bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="mb-6 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ancestry AI</h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm">Here's what's happening in your family tree.</p>
        </div>
        {/* Time Travel button is already distinctive, no changes needed */}
        <button 
             onClick={() => onQuickAction('time-travel')}
             className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg hover:scale-105 transition border border-white/10"
        >
             <span className="text-lg">✨</span>
             <span>Time Travel</span>
        </button>
      </div>

      {/* Main Stats Card */}
      <div className="mb-6 relative group cursor-pointer" onClick={() => onNavigate('tree')}>
         <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
         <div className="relative bg-gradient-to-br from-primary to-blue-800 rounded-2xl p-6 text-white shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-9xl">groups</span>
            </div>
            <div className="relative z-10">
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Total Members</p>
                <h3 className="text-4xl font-bold">{total.toLocaleString()}</h3>
                <div className="flex items-center gap-1 mt-2 text-blue-100 text-xs bg-white/10 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                   <span className="material-symbols-outlined text-sm">trending_up</span>
                   <span>+{recentActivity.length} recently</span>
                </div>
            </div>
         </div>
      </div>

      {/* Report Download CTA */}
      <button 
        onClick={() => onQuickAction('generate-book')}
        className="mb-6 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-indigo-500/30 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700/80 p-4 rounded-xl flex items-center justify-between group transition shadow-lg"
      >
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition">
                <span className="material-symbols-outlined text-2xl">menu_book</span>
            </div>
            <div className="text-left">
                <h4 className="text-slate-900 dark:text-white font-bold text-sm">Download Family Book</h4>
                <p className="text-indigo-600 dark:text-indigo-300 text-xs">Full PDF Report • Tree & Map Screenshots</p>
            </div>
        </div>
        <span className="material-symbols-outlined text-indigo-400 group-hover:translate-x-1 transition">arrow_forward</span>
      </button>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Lifespan */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
                    <span className="material-symbols-outlined text-sm">hourglass_top</span>
                </div>
                <span className="text-slate-500 dark:text-gray-400 text-xs font-semibold">Avg Lifespan</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(avgLife)}</span>
                <span className="text-xs text-slate-500 dark:text-gray-500">years</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{width: `${Math.min(100, avgLife)}%`}}></div>
            </div>
        </div>

        {/* Gender */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-teal-100 dark:bg-teal-500/20 rounded-lg text-teal-600 dark:text-teal-400">
                    <span className="material-symbols-outlined text-sm">pie_chart</span>
                </div>
                <span className="text-slate-500 dark:text-gray-400 text-xs font-semibold">Gender</span>
            </div>
            <div className="flex h-2 w-full rounded-full overflow-hidden mb-3">
                <div className="bg-blue-500 h-full" style={{width: `${malePct}%`}}></div>
                <div className="bg-pink-500 h-full" style={{width: `${femalePct}%`}}></div>
                <div className="bg-gray-300 dark:bg-gray-600 h-full flex-1"></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> {malePct}% M</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div> {femalePct}% F</span>
            </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-slate-800 dark:text-white text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
            {[
                { id: 'analytics', icon: 'health_and_safety', label: 'AI Health', color: 'text-rose-500 dark:text-rose-400', border: 'group-hover:border-rose-500', bg: 'group-hover:bg-rose-500/10' },
                { id: 'manual-add', icon: 'person_add', label: 'Manual Add', color: 'text-amber-500 dark:text-amber-400', border: 'group-hover:border-amber-500', bg: 'group-hover:bg-amber-500/10', restricted: true },
                { id: '3d', icon: 'view_in_ar', label: '3D View', color: 'text-purple-500 dark:text-purple-400', border: 'group-hover:border-purple-500', bg: 'group-hover:bg-purple-500/10' },
                { id: 'smart', icon: 'auto_fix_high', label: 'Smart Add', color: 'text-white', isGradient: true, restricted: true },
            ].map((action) => (
                <button 
                    key={action.id} 
                    onClick={() => onQuickAction(action.id)} 
                    className={`flex flex-col items-center gap-2 group relative`}
                >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300
                        ${action.isGradient 
                            ? 'bg-gradient-to-br from-primary to-blue-600 shadow-primary/30 group-hover:scale-105' 
                            : `bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 ${action.color} ${action.border} ${action.bg}`
                        }
                        ${action.restricted && isReadOnly ? 'opacity-70 grayscale-[0.5]' : ''}
                        `}>
                        <span className="material-symbols-outlined text-2xl">{action.icon}</span>
                        {action.restricted && isReadOnly && (
                            <div className="absolute top-0 right-0 p-0.5 bg-slate-900 rounded-full border border-slate-700 shadow-md transform translate-x-1 -translate-y-1">
                                <span className="material-symbols-outlined text-[10px] text-white">lock</span>
                            </div>
                        )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{action.label}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-800 dark:text-white text-sm font-semibold">Recent Activity</h3>
            <button onClick={() => onNavigate('records')} className="text-xs text-primary hover:text-blue-300 font-medium">View All</button>
        </div>
        <div className="flex flex-col gap-3">
            {recentActivity.length > 0 ? recentActivity.map((ancestor) => (
                <div key={ancestor.id} onClick={() => onSelectAncestor(ancestor.id)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 flex items-center gap-3 shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition-colors cursor-pointer">
                    <div className="relative shrink-0">
                        {ancestor.photoUrl ? (
                             <div className="h-10 w-10 rounded-full bg-cover bg-center" style={{backgroundImage: `url(${ancestor.photoUrl})`}}></div>
                        ) : (
                             <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-gray-400 font-bold">
                                {ancestor.name.charAt(0)}
                             </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full p-0.5">
                            <span className="material-symbols-outlined text-[10px] text-white block">add</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 dark:text-white font-medium truncate">{ancestor.name}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-500 truncate">{ancestor.birthYear ? `Born ${ancestor.birthYear}` : 'Updated record'}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500 whitespace-nowrap">Just now</span>
                </div>
            )) : (
                <div className="text-center py-6 text-slate-400 dark:text-gray-500 text-sm">No recent activity</div>
            )}
        </div>
      </div>
    </div>
  );
};