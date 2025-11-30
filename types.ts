
export interface Segment {
  id: string;
  name: string; // "Start", "A", "B"... or profile name
  description: string; // "Start To A", etc.
  
  // Inputs (Yellow cells in PDF)
  splitDistKm: number;
  splitElevM: number;
  targetEPH: number;
  
  // Optional: If set, this segment is in "Fixed Duration" mode.
  // The End Time is locked, and Target EPH is calculated dynamically.
  customDurationMins?: number;
  
  // Calculated (White/Gray cells)
  ep: number;
  targetTimeHours: number;
  targetTimeMins: number;
  
  // Cumulative / Timeline
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  totalDistKm: number;
  accuElevM: number;
  accuTimeHours: number;
  accuEPH: number;
}

export interface TrainingSession {
  id: string;
  name: string;
  date: string; // ISO date string
  globalStartTime: string; // "07:00"
  segments: Segment[];
  
  // Summary stats
  totalDistance: number;
  totalElevation: number;
  totalEP: number;
  totalDurationHours: number;
}

export interface MonthlyGoal {
  monthKey: string; // "YYYY-MM"
  targetDistance: number;
  targetEP: number;
}

export type ViewState = 'DASHBOARD' | 'EDITOR' | 'ANALYSIS';
