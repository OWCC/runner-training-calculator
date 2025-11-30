
import React, { useState, useEffect } from 'react';
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun, Wind, MapPin, Loader2, AlertCircle } from 'lucide-react';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  isDay: number;
  windSpeed: number;
}

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("Local Weather");

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number, label: string) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        
        if (!response.ok) throw new Error("Failed to fetch weather");
        
        const data = await response.json();
        setWeather({
          temperature: data.current_weather.temperature,
          weatherCode: data.current_weather.weathercode,
          isDay: data.current_weather.is_day,
          windSpeed: data.current_weather.windspeed
        });
        setLocationName(label);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Weather unavailable");
      } finally {
        setLoading(false);
      }
    };

    if (!navigator.geolocation) {
      // Fallback if geolocation is missing
      fetchWeather(51.5074, -0.1278, "London (Default)");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeather(latitude, longitude, "Local Weather");
      },
      (err) => {
        console.warn("Geolocation denied or failed", err);
        // Fallback to London on error/deny
        fetchWeather(51.5074, -0.1278, "London (Default)");
      },
      { timeout: 5000 } // Add timeout to prevent hanging
    );
  }, []);

  const getWeatherIcon = (code: number, isDay: number) => {
    // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
    const size = 32;
    const colorClass = isDay ? "text-yellow-500" : "text-blue-400";
    const cloudClass = "text-slate-400 dark:text-slate-500";
    const rainClass = "text-blue-500 dark:text-blue-400";
    const snowClass = "text-sky-300";

    if (code === 0) {
      return isDay ? <Sun size={size} className={colorClass} /> : <Moon size={size} className="text-slate-300" />;
    }
    if (code >= 1 && code <= 3) {
      return <Cloud size={size} className={cloudClass} />;
    }
    if (code === 45 || code === 48) {
      return <CloudFog size={size} className="text-slate-400" />;
    }
    if (code >= 51 && code <= 67) {
      return <CloudRain size={size} className={rainClass} />;
    }
    if (code >= 71 && code <= 77) {
      return <CloudSnow size={size} className={snowClass} />;
    }
    if (code >= 80 && code <= 82) {
      return <CloudRain size={size} className={rainClass} />;
    }
    if (code >= 85 && code <= 86) {
      return <CloudSnow size={size} className={snowClass} />;
    }
    if (code >= 95) {
      return <CloudLightning size={size} className="text-purple-500" />;
    }

    return <Sun size={size} className={colorClass} />;
  };

  const getWeatherDescription = (code: number) => {
    switch (code) {
      case 0: return "Clear sky";
      case 1: return "Mainly clear";
      case 2: return "Partly cloudy";
      case 3: return "Overcast";
      case 45: case 48: return "Foggy";
      case 51: case 53: case 55: return "Drizzle";
      case 61: case 63: case 65: return "Rain";
      case 71: case 73: case 75: return "Snow";
      case 95: case 96: case 99: return "Thunderstorm";
      default: return "Conditions varied";
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center h-full min-h-[140px]">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
        <p className="text-xs text-slate-400">Loading weather...</p>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center h-full min-h-[140px]">
        <AlertCircle className="text-slate-300 mb-2" size={24} />
        <p className="text-xs text-slate-400">{error || "No data"}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase mb-1">
            <MapPin size={12} /> {locationName}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-4xl font-bold text-slate-800 dark:text-white">
              {Math.round(weather.temperature)}°
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {getWeatherDescription(weather.weatherCode)}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Wind size={10} /> {weather.windSpeed} km/h
              </span>
            </div>
          </div>
        </div>
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full">
          {getWeatherIcon(weather.weatherCode, weather.isDay)}
        </div>
      </div>
    </div>
  );
};
