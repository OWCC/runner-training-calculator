import React, { useState, useEffect } from 'react';
import { TrainingSession, ViewState, MonthlyGoal } from './types';
import { TrainingEditor } from './components/TrainingEditor';
import { AnalysisView } from './components/AnalysisView';
import { Plus, Activity, Calendar, ChevronRight, BarChart2, Trash2, Copy, Target, Edit2, X, Moon, Sun } from 'lucide-react';
import { generateId, getCurrentMonthKey, getMonthName } from './utils';

const STORAGE_KEY = 'runplanner_sessions_v1';
const GOALS_KEY = 'runplanner_goals_v1';
const THEME_KEY = 'runplanner_theme_v1';

function App() {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [currentSession, setCurrentSession] = useState<TrainingSession | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Goal Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalDistance, setGoalDistance] = useState(100);
  const [goalEP, setGoalEP] = useState(200);

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem(THEME_KEY, 'dark');
      } catch (e) { console.error(e); }
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem(THEME_KEY, 'light');
      } catch (e) { console.error(e); }
    }
  };

  // Load data on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY);
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    
    const savedGoals = localStorage.getItem(GOALS_KEY);
    if (savedGoals) {
      try {
        setGoals(JSON.parse(savedGoals));
      } catch (e) {
        console.error("Failed to parse goals", e);
      }
    }
  }, []);

  // Persist data with Error Handling
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save sessions", e);
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    } catch (e) {
      console.error("Failed to save goals", e);
    }
  }, [goals]);

  // Goal Logic
  const currentMonthKey = getCurrentMonthKey();
  const currentGoal = goals.find(g => g.monthKey === currentMonthKey);
  
  // Calculate current month stats
  const currentMonthSessions = sessions.filter(s => s.date.startsWith(currentMonthKey));
  const currentMonthDist = currentMonthSessions.reduce((sum, s) => sum + s.totalDistance, 0);
  const currentMonthEP = currentMonthSessions.reduce((sum, s) => sum + s.totalEP, 0);

  const openGoalModal = () => {
    if (currentGoal) {
      setGoalDistance(currentGoal.targetDistance);
      setGoalEP(currentGoal.targetEP);
    }
    setIsGoalModalOpen(true);
  };

  const saveGoal = () => {
    const newGoal: MonthlyGoal = {
      monthKey: currentMonthKey,
      targetDistance: Number(goalDistance),
      targetEP: Number(goalEP)
    };

    setGoals(prev => {
      const existingIdx = prev.findIndex(g => g.monthKey === currentMonthKey);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newGoal;
        return updated;
      }
      return [...prev, newGoal];
    });
    setIsGoalModalOpen(false);
  };

  // Session Handlers
  const handleCreateNew = () => {
    setCurrentSession(null);
    setView('EDITOR');
  };

  const handleEditSession = (session: TrainingSession) => {
    setCurrentSession(session);
    setView('EDITOR');
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this training plan?')) {
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleDuplicateSession = (e: React.MouseEvent, session: TrainingSession) => {
    e.stopPropagation();
    const newSession: TrainingSession = {
      ...session,
      id: generateId(),
      name: `${session.name} (Copy)`,
      date: new Date().toISOString(),
      segments: session.segments.map(s => ({...s, id: generateId()}))
    };
    setSessions(prev => [newSession, ...prev]);
  };

  const handleSaveSession = (session: TrainingSession) => {
    setSessions(prev => {
      const exists = prev.findIndex(s => s.id === session.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = session;
        return updated;
      }
      return [...prev, session];
    });
    setView('DASHBOARD');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative transition-colors duration-200">
      {/* Top Navigation Bar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('DASHBOARD')}>
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Activity size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">RunPlanner</span>
          </div>
          
          <div className="flex items-center gap-4">
             {view === 'DASHBOARD' && sessions.length > 0 && (
              <button 
                onClick={() => setView('ANALYSIS')}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <BarChart2 size={18} />
                <span className="hidden sm:inline font-medium">Analysis</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {view === 'DASHBOARD' && (
          <div className="space-y-8 animate-fade-in">
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Training Log</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your run plans and calculate effort points.</p>
              </div>
              <button 
                onClick={handleCreateNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold shadow-lg shadow-blue-200 dark:shadow-blue-900/30 flex items-center gap-2 transition-transform hover:scale-105"
              >
                <Plus size={20} /> New Plan
              </button>
            </div>

            {/* Changed from lg:grid-cols-4 to lg:grid-cols-3 to remove gap left by weather widget */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Overall Stats Cards */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                <p className="text-sm font-medium text-slate-400 uppercase">Total Sessions</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{sessions.length}</p>
              </div>
              
              {/* Monthly Goals Card */}
              <div className="lg:col-span-2 md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative group">
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <Target className="text-blue-500" size={20} />
                       {getMonthName(currentMonthKey)} Goals
                     </h3>
                     <p className="text-xs text-slate-400">Track your monthly progress</p>
                   </div>
                   <button 
                     onClick={openGoalModal}
                     className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
                   >
                     <Edit2 size={16} />
                   </button>
                </div>

                {!currentGoal ? (
                  <div className="flex flex-col items-center justify-center py-2 text-slate-400">
                    <p className="text-sm mb-3">No goals set for this month.</p>
                    <button 
                      onClick={openGoalModal}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 underline"
                    >
                      Set Goals
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Distance Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Distance</span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {currentMonthDist.toFixed(1)} <span className="text-slate-400 font-normal">/ {currentGoal.targetDistance} km</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min((currentMonthDist / currentGoal.targetDistance) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* EP Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Effort Points</span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {currentMonthEP.toFixed(0)} <span className="text-slate-400 font-normal">/ {currentGoal.targetEP} EP</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-purple-500 h-2.5 rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min((currentMonthEP / currentGoal.targetEP) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Session List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Recent Trainings</h2>
              {sessions.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  <div className="text-slate-400 mb-3">
                    <Activity size={48} className="mx-auto opacity-20" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">No training plans yet</h3>
                  <p className="text-slate-400 max-w-sm mx-auto mt-2">Create your first training plan to start calculating Effort Points and predicting run times.</p>
                  <button onClick={handleCreateNew} className="mt-6 text-blue-600 dark:text-blue-400 font-medium hover:underline">Start planning</button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {sessions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((session) => (
                    <div 
                      key={session.id}
                      onClick={() => handleEditSession(session)}
                      className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{session.name}</h3>
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full font-mono">{session.globalStartTime}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(session.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{session.totalDistance.toFixed(1)} km</span>
                          <span>•</span>
                          <span>{session.totalElevation} m elev</span>
                          <span>•</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">EP: {session.totalEP.toFixed(0)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400 uppercase font-bold">Duration</p>
                          <p className="font-mono font-medium text-slate-700 dark:text-slate-300">{session.totalDurationHours.toFixed(1)}h</p>
                        </div>
                        <button 
                          onClick={(e) => handleDuplicateSession(e, session)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                          title="Duplicate Plan"
                        >
                          <Copy size={18} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                          title="Delete Plan"
                        >
                          <Trash2 size={18} />
                        </button>
                        <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'EDITOR' && (
          <TrainingEditor 
            initialSession={currentSession} 
            onSave={handleSaveSession}
            onCancel={() => setView('DASHBOARD')}
          />
        )}

        {view === 'ANALYSIS' && (
          <AnalysisView 
            sessions={sessions}
            onBack={() => setView('DASHBOARD')}
            isDarkMode={isDarkMode}
          />
        )}
      </main>

      {/* Goal Setting Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Set Goals for {getMonthName(currentMonthKey)}</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Target Distance (km)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={goalDistance}
                    onChange={(e) => setGoalDistance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900"
                    placeholder="e.g. 100"
                  />
                  <div className="absolute right-3 top-2 text-slate-400 text-sm">km</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Target Effort Points (EP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={goalEP}
                    onChange={(e) => setGoalEP(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-900"
                    placeholder="e.g. 200"
                  />
                  <div className="absolute right-3 top-2 text-slate-400 text-sm">EP</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
              <button 
                onClick={() => setIsGoalModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveGoal}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md transition-colors"
              >
                Save Goals
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;