
import React from 'react';
import { TrainingSession } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Brush, ReferenceLine
} from 'recharts';
import { ArrowLeft } from 'lucide-react';

interface AnalysisViewProps {
  sessions: TrainingSession[];
  onBack: () => void;
  isDarkMode?: boolean;
}

const CustomTooltip = ({ active, payload, label, isDarkMode }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={`p-4 border shadow-xl rounded-xl text-sm z-50 min-w-[200px] ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
        <p className={`font-bold mb-2 border-b pb-1 ${isDarkMode ? 'text-white border-slate-700' : 'text-slate-800 border-slate-100'}`}>{data.name}</p>
        <p className={`text-xs mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{data.date}</p>
        
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
               <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{entry.name}:</span>
             </div>
             <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
               {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
             </span>
          </div>
        ))}
        
        {/* Additional Context Data */}
        <div className={`mt-3 pt-2 border-t text-xs space-y-1 ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
          {data.elevation !== undefined && !payload.some((p: any) => p.dataKey === 'elevation') && (
             <div className="flex justify-between gap-4">
              <span className="font-medium">Elevation:</span> 
              <span>{data.elevation}m</span>
            </div>
          )}
          {data.avgEPH !== undefined && !payload.some((p: any) => p.dataKey === 'avgEPH') && (
            <div className="flex justify-between gap-4">
               <span className="font-medium">Avg Intensity:</span> 
               <span>{data.avgEPH} EPH</span>
            </div>
          )}
           <div className="flex justify-between gap-4">
               <span className="font-medium">Time:</span> 
               <span>{(data.ep / (data.avgEPH || 1)).toFixed(1)}h</span>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ sessions, onBack, isDarkMode = false }) => {
  
  // Prepare data for "Progress Over Time"
  const progressData = sessions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(s => ({
      date: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      fullDate: new Date(s.date).toLocaleDateString(),
      name: s.name,
      distance: s.totalDistance,
      elevation: s.totalElevation,
      ep: s.totalEP,
      avgEPH: s.totalDurationHours > 0 ? parseFloat((s.totalEP / s.totalDurationHours).toFixed(1)) : 0
    }));

  const avgEP = progressData.length > 0 
    ? progressData.reduce((sum, d) => sum + d.ep, 0) / progressData.length 
    : 0;

  const avgEPH = progressData.length > 0 
    ? progressData.reduce((sum, d) => sum + d.avgEPH, 0) / progressData.length 
    : 0;

  // Chart Colors
  const gridColor = isDarkMode ? "#334155" : "#e2e8f0";
  const textColor = isDarkMode ? "#94a3b8" : "#64748b";
  const axisColor = isDarkMode ? "#64748b" : "#8884d8";
  const brushStroke = isDarkMode ? "#475569" : "#cbd5e1";
  const brushFill = isDarkMode ? "#1e293b" : "#f8fafc";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Training Analysis</h1>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400">No training sessions logged yet. Create a plan to see analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: EP vs Distance */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Effort Points vs Distance</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={progressData} 
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  syncId="trainingAnalysis"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: textColor}} tickFormatter={(val) => val.length > 10 ? `${val.substring(0,10)}...` : val} />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{fontSize: 12, fill: textColor}} label={{ value: 'EP', angle: -90, position: 'insideLeft', fill: textColor }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{fontSize: 12, fill: textColor}} label={{ value: 'km', angle: 90, position: 'insideRight', fill: textColor }} />
                  <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <ReferenceLine yAxisId="left" y={avgEP} label={{ value: 'Avg EP', fill: '#8884d8', fontSize: 10 }} stroke="#8884d8" strokeDasharray="3 3" />
                  <Bar yAxisId="left" dataKey="ep" name="Total EP" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="distance" name="Dist (km)" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                  <Brush dataKey="name" height={30} stroke={brushStroke} fill={brushFill} tickFormatter={() => ''} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: EPH Trend */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Average Intensity (EPH) Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={progressData} 
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  syncId="trainingAnalysis"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: textColor}} tickFormatter={(val) => val.length > 10 ? `${val.substring(0,10)}...` : val} />
                  <YAxis domain={['auto', 'auto']} tick={{fontSize: 12, fill: textColor}} label={{ value: 'EPH', angle: -90, position: 'insideLeft', fill: textColor }} />
                  <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <ReferenceLine y={avgEPH} label={{ value: 'Avg Intensity', fill: '#f59e0b', fontSize: 10 }} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="avgEPH" name="Avg EPH" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                  <Brush dataKey="name" height={30} stroke={brushStroke} fill={brushFill} tickFormatter={() => ''} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

           {/* Summary Table */}
           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 col-span-1 lg:col-span-2 transition-colors">
            <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Session History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                <thead className="text-xs text-slate-700 dark:text-slate-200 uppercase bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Dist (km)</th>
                    <th className="px-6 py-3">Elev (m)</th>
                    <th className="px-6 py-3">EP</th>
                    <th className="px-6 py-3">Avg EPH</th>
                    <th className="px-6 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {progressData.map((row, idx) => (
                    <tr key={idx} className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">{row.fullDate}</td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{row.name}</td>
                      <td className="px-6 py-4">{row.distance.toFixed(1)}</td>
                      <td className="px-6 py-4">{row.elevation}</td>
                      <td className="px-6 py-4">{row.ep.toFixed(0)}</td>
                      <td className="px-6 py-4">{row.avgEPH.toFixed(1)}</td>
                      <td className="px-6 py-4">{(row.ep / (row.avgEPH || 1)).toFixed(1)} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
           </div>

        </div>
      )}
    </div>
  );
};
