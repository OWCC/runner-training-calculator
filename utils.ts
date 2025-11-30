
// Time Utilities
export const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const formatTime = (totalMinutes: number): string => {
  let mins = Math.round(totalMinutes); // Use round to avoid 59.999 -> 59 issues
  const hours = Math.floor(mins / 60) % 24; // Wrap around 24h
  mins = mins % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const addMinutes = (timeStr: string, minutesToAdd: number): string => {
  const currentMinutes = parseTime(timeStr);
  return formatTime(currentMinutes + minutesToAdd);
};

export const timeDiffInHours = (start: string, end: string): number => {
  let s = parseTime(start);
  let e = parseTime(end);
  if (e < s) e += 24 * 60; // Handle overnight
  return (e - s) / 60;
};

// EP Logic
export const calculateEP = (distanceKm: number, elevM: number): number => {
  // EP Formula derived from PDF: Dist + (Elev / 100)
  // Example Row 2: 13.2km + 1260m = 25.8 EP (Rounded to 26 in PDF, we will keep decimals for precision but display rounded)
  return distanceKm + (elevM / 100);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Date Helpers
export const getCurrentMonthKey = (): string => {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
};

export const getMonthName = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
