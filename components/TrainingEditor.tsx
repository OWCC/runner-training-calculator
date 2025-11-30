
import React, { useState, useEffect, useCallback } from 'react';
import { TrainingSession, Segment } from '../types';
import { calculateEP, addMinutes, generateId, formatTime, parseTime } from '../utils';
import { Save, Plus, Trash2, ArrowLeft, Copy } from 'lucide-react';

interface TrainingEditorProps {
  initialSession?: TrainingSession | null;
  onSave: (session: TrainingSession) => void;
  onCancel: () => void;
}

const DEFAULT_START_TIME = "07:00";

const createEmptySegment = (name: string, description: string): Segment => ({
  id: generateId(),
  name,
  description,
  splitDistKm: 0,
  splitElevM: 0,
  targetEPH: 10, // Default meaningful EPH
  ep: 0,
  targetTimeHours: 0,
  targetTimeMins: 0,
  startTime: DEFAULT_START_TIME,
  endTime: DEFAULT_START_TIME,
  totalDistKm: 0,
  accuElevM: 0,
  accuTimeHours: 0,
  accuEPH: 0,
  customDurationMins: undefined
});

export const TrainingEditor: React.FC<TrainingEditorProps> = ({ initialSession, onSave, onCancel }) => {
  const [name, setName] = useState(initialSession?.name || "New Morning Run");
  const [startTime, setStartTime] = useState(initialSession?.globalStartTime || DEFAULT_START_TIME);
  const [segments, setSegments] = useState<Segment[]>([]);

  // Initialize segments
  useEffect(() => {
    if (initialSession && initialSession.segments.length > 0) {
      setSegments(initialSession.segments);
    } else {
      // Create initial rows similar to PDF: Start (Row 0) and first Segment (Row 1)
      const startRow = createEmptySegment("Start", "Start Point");
      startRow.targetEPH = 0; // Start point has no effort
      
      const firstLeg = createEmptySegment("A", "Start To A");
      setSegments([startRow, firstLeg]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Core Calculation Logic - Runs whenever data changes
  const recalculateSegments = useCallback((currentSegments: Segment[], globalStart: string) => {
    let runningDist = 0;
    let runningElev = 0;
    let runningTimeHours = 0;
    let currentClockTime = globalStart;

    return currentSegments.map((seg, index) => {
      // EP Calculation
      const ep = calculateEP(seg.splitDistKm, seg.splitElevM);
      
      let targetTimeHours = 0;
      let targetTimeMins = 0;
      let effectiveEPH = seg.targetEPH;

      // Calculate Duration & EPH based on mode
      if (index === 0) {
        // Start Row: Always 0 duration
        targetTimeHours = 0;
        targetTimeMins = 0;
      } else {
        if (seg.customDurationMins !== undefined && seg.customDurationMins > 0) {
          // MODE: Fixed Duration (User set End Time)
          // Time is fixed.
          targetTimeMins = seg.customDurationMins;
          targetTimeHours = targetTimeMins / 60;
          
          // We do NOT update effectiveEPH here anymore, per user request.
          // The Target EPH remains as input by the user, unrelated to the time override.
          effectiveEPH = seg.targetEPH; 
        } else {
          // MODE: Fixed Intensity (User set EPH or Default)
          // EPH is fixed, Time floats
          // Time = EP / EPH
          const safeEPH = seg.targetEPH > 0 ? seg.targetEPH : 1;
          targetTimeHours = ep / safeEPH;
          targetTimeMins = targetTimeHours * 60;
          effectiveEPH = seg.targetEPH; // Keep original input
        }
      }
      
      // Update running totals
      runningDist += seg.splitDistKm;
      runningElev += seg.splitElevM;
      runningTimeHours += targetTimeHours;
      
      // Timeline Logic
      const segStartTime = index === 0 ? globalStart : currentClockTime;
      const segEndTime = addMinutes(segStartTime, targetTimeMins);
      currentClockTime = segEndTime; // Carry over for next segment

      const accuEPH = runningTimeHours > 0 ? (runningDist + runningElev/100) / runningTimeHours : 0;

      return {
        ...seg,
        ep,
        targetEPH: effectiveEPH, 
        targetTimeHours,
        targetTimeMins,
        startTime: segStartTime,
        endTime: segEndTime,
        totalDistKm: runningDist,
        accuElevM: runningElev,
        accuTimeHours: runningTimeHours,
        accuEPH: index === 0 ? 0 : accuEPH // Avoid NaN on start row
      };
    });
  }, []);

  // Effect to apply calculations when inputs change
  useEffect(() => {
    setSegments(prev => recalculateSegments(prev, startTime));
  }, [startTime, recalculateSegments]);

  const updateSegment = (index: number, field: keyof Segment, value: string | number) => {
    const updated = [...segments];
    let seg = { ...updated[index], [field]: value };
    
    // If user explicitly edits Target EPH, we switch back to Intensity Mode
    // This unlocks the time so it responds to EP changes again.
    if (field === 'targetEPH') {
      seg.customDurationMins = undefined;
    }

    updated[index] = seg;
    setSegments(recalculateSegments(updated, startTime));
  };

  const handleEndTimeChange = (index: number, newEndTime: string) => {
    // Row 0 End Time is linked to Start Time, but editing should happen in Start Time column now.
    // However, if we want to support it:
    if (index === 0) {
      setStartTime(newEndTime);
      return;
    }
    
    const segment = segments[index];
    const startMins = parseTime(segment.startTime);
    let endMins = parseTime(newEndTime);
    
    // Handle overnight
    if (endMins < startMins) endMins += 24 * 60;
    
    let durationMins = endMins - startMins;
    if (durationMins <= 0) durationMins = 1; // Prevent 0 or negative duration

    // Update segment with FIXED DURATION
    // This puts the segment into "Fixed Duration Mode"
    const updated = [...segments];
    updated[index] = {
      ...segment,
      customDurationMins: durationMins
    };

    setSegments(recalculateSegments(updated, startTime));
  };

  const addRow = () => {
    const lastChar = segments[segments.length - 1].name;
    const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
    const newSeg = createEmptySegment(nextChar.length > 1 ? 'X' : nextChar, `${lastChar} To ${nextChar.length > 1 ? 'X' : nextChar}`);
    setSegments(recalculateSegments([...segments, newSeg], startTime));
  };

  const duplicateRow = (index: number) => {
    const original = segments[index];
    const newSeg = { ...original, id: generateId(), name: original.name + "'" };
    const updated = [...segments];
    updated.splice(index + 1, 0, newSeg);
    setSegments(recalculateSegments(updated, startTime));
  };

  const deleteRow = (index: number) => {
    if (segments.length <= 1) return; // Don't delete the last row
    const updated = segments.filter((_, i) => i !== index);
    setSegments(recalculateSegments(updated, startTime));
  };

  const handleSave = () => {
    const lastSeg = segments[segments.length - 1];
    const session: TrainingSession = {
      id: initialSession?.id || generateId(),
      name,
      date: initialSession?.date || new Date().toISOString(),
      globalStartTime: startTime,
      segments,
      totalDistance: lastSeg.totalDistKm,
      totalElevation: lastSeg.accuElevM,
      totalEP: segments.reduce((acc, s) => acc + s.ep, 0),
      totalDurationHours: lastSeg.accuTimeHours
    };
    onSave(session);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
             <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
               <ArrowLeft size={20} />
             </button>
             <div className="flex flex-col">
               <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Training Name</label>
               <input 
                 type="text" 
                 value={name} 
                 onChange={e => setName(e.target.value)}
                 className="font-bold text-xl bg-yellow-50 dark:bg-yellow-900/30 border-b-2 border-yellow-200 dark:border-yellow-700/50 focus:border-yellow-500 outline-none px-1 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors"
               />
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Start Time</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)}
                className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700/50 rounded px-2 py-1 font-mono text-lg text-slate-800 dark:text-slate-100 outline-none focus:border-yellow-500"
              />
            </div>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-colors"
            >
              <Save size={18} /> Save Plan
            </button>
          </div>
        </div>
      </div>

      {/* The Spreadsheet */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-sm text-center">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-wider transition-colors">
              <tr>
                <th className="p-3 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700 transition-colors">Ref</th>
                <th className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 min-w-[150px]">Route</th>
                <th className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 min-w-[80px] border-l border-yellow-200 dark:border-yellow-800/30">Start Time</th>
                <th className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 min-w-[80px]">End Time</th>
                <th className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 min-w-[80px]">Dist (km)</th>
                <th className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 min-w-[80px]">Elev (m)</th>
                <th className="p-3 min-w-[60px] text-slate-700 dark:text-slate-300">EP</th>
                <th className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 min-w-[80px] border-r border-yellow-200 dark:border-yellow-800/30">TARGET EPH</th>
                <th className="p-3 min-w-[80px] text-slate-700 dark:text-slate-300">DURATION</th>
                <th className="p-3 text-slate-400 min-w-[80px]">Accu Dist</th>
                <th className="p-3 text-slate-400 min-w-[80px]">Accu Elev</th>
                <th className="p-3 text-slate-400 min-w-[80px]">Accu EPH</th>
                <th className="p-3 text-slate-400 min-w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {segments.map((seg, idx) => (
                <tr key={seg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Ref Column - Editable */}
                  <td className="p-1 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-700 transition-colors">
                    <input 
                      type="text" 
                      value={seg.name}
                      onChange={(e) => updateSegment(idx, 'name', e.target.value)}
                      className="w-full text-center bg-transparent hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:bg-yellow-50 dark:focus:bg-yellow-900/30 rounded px-1 py-1 outline-none font-bold font-mono text-slate-700 dark:text-slate-200 transition-colors"
                    />
                  </td>

                  {/* Route Column - Editable */}
                  <td className="p-1">
                    <input 
                      type="text" 
                      value={seg.description}
                      onChange={(e) => updateSegment(idx, 'description', e.target.value)}
                      className="w-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 focus:border-yellow-500 rounded px-2 py-1 outline-none text-slate-700 dark:text-slate-200 text-left transition-colors"
                      placeholder="Description"
                    />
                  </td>
                  
                  {/* Start Time Column */}
                  <td className={`p-1 border-l border-dashed border-slate-200 dark:border-slate-800 ${idx === 0 ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''}`}>
                    {idx === 0 ? (
                       <input 
                       type="time" 
                       value={startTime}
                       onChange={(e) => setStartTime(e.target.value)}
                       className="w-full text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 focus:border-yellow-500 rounded py-1 outline-none font-bold font-mono text-slate-800 dark:text-slate-200 transition-colors"
                     />
                    ) : (
                      <div className="py-1 font-mono text-slate-600 dark:text-slate-400">{seg.startTime}</div>
                    )}
                  </td>

                  {/* End Time Column */}
                  <td className={`p-1 ${idx > 0 ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''}`}>
                    {idx === 0 ? (
                      <div className="py-1 font-mono text-slate-400 dark:text-slate-600">{seg.endTime}</div>
                    ) : (
                      <input 
                        type="time" 
                        value={seg.endTime}
                        onChange={(e) => handleEndTimeChange(idx, e.target.value)}
                        className="w-full text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 focus:border-yellow-500 rounded py-1 outline-none font-bold font-mono text-slate-800 dark:text-slate-200 transition-colors"
                      />
                    )}
                  </td>
                  
                  {/* Inputs - Distance */}
                  <td className="p-1">
                    <input 
                      type="number" 
                      min="0"
                      step="0.1"
                      value={seg.splitDistKm}
                      onChange={(e) => updateSegment(idx, 'splitDistKm', parseFloat(e.target.value) || 0)}
                      className="w-full text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 focus:border-yellow-500 rounded py-1 outline-none font-medium text-slate-800 dark:text-slate-200 transition-colors"
                    />
                  </td>
                  
                  {/* Inputs - Elevation */}
                  <td className="p-1">
                    <input 
                      type="number" 
                      min="0"
                      value={seg.splitElevM}
                      onChange={(e) => updateSegment(idx, 'splitElevM', parseFloat(e.target.value) || 0)}
                      className="w-full text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 focus:border-yellow-500 rounded py-1 outline-none font-medium text-slate-800 dark:text-slate-200 transition-colors"
                    />
                  </td>
                  
                  {/* Calculations - EP */}
                  <td className="p-2 font-bold text-blue-600 dark:text-blue-400">{seg.ep.toFixed(1)}</td>
                  
                  {/* Inputs - Target EPH */}
                  <td className="p-1 border-r border-dashed border-slate-200 dark:border-slate-800">
                    <input 
                      type="number" 
                      min="1"
                      step="0.1"
                      value={seg.targetEPH > 0 ? parseFloat(seg.targetEPH.toFixed(2)) : 0} 
                      onChange={(e) => updateSegment(idx, 'targetEPH', parseFloat(e.target.value) || 0)}
                      className={`w-full text-center border focus:border-yellow-500 rounded py-1 outline-none font-medium transition-colors ${seg.customDurationMins ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/30 text-slate-900 dark:text-slate-200'}`}
                      title={seg.customDurationMins ? "Fixed Target. Time is manually overridden." : "Target Intensity (EPH)"}
                    />
                  </td>
                  
                  <td className="p-2 font-mono text-slate-600 dark:text-slate-400">
                    {formatTime(seg.targetTimeMins)}
                    <span className="block text-[10px] text-slate-400 dark:text-slate-600">({seg.targetTimeHours.toFixed(1)}h)</span>
                  </td>
                  
                  {/* Accumulators */}
                  <td className="p-2 text-slate-500 dark:text-slate-500">{seg.totalDistKm.toFixed(1)}</td>
                  <td className="p-2 text-slate-500 dark:text-slate-500">{seg.accuElevM}</td>
                  <td className="p-2 font-bold text-slate-700 dark:text-slate-300">{seg.accuEPH.toFixed(1)}</td>
                  
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      {idx > 0 && (
                        <>
                          <button 
                            onClick={() => duplicateRow(idx)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Duplicate Row"
                          >
                            <Copy size={14} />
                          </button>
                          <button 
                            onClick={() => deleteRow(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="Delete Row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-center transition-colors">
          <button 
            onClick={addRow}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Plus size={18} /> Add Segment
          </button>
        </div>
      </div>
      
      {/* Legend / Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50 rounded"></div>
          <span>Editable Input Fields</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-4 h-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"></div>
           <span>Auto-Calculated Fields</span>
         </div>
        <div className="md:col-span-1">
          Formula: EP = Dist + (Elev / 100). Time = EP / EPH. 
          <span className="block mt-1 italic">Note: Target EPH is user input only and does not change when Time is edited. Accu EPH shows calculated intensity.</span>
        </div>
      </div>
    </div>
  );
};
