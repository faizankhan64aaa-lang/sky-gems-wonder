export type GeoResult = {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type WeatherData = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    is_day: number;
    surface_pressure: number;
    precipitation: number;
    uv_index?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    precipitation_sum: number[];
    uv_index_max: number[];
  };
  timezone: string;
};

export async function geocode(q: string): Promise<GeoResult[]> {
  if (!q.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
  const r = await fetch(url);
  const j = await r.json();
  return j.results ?? [];
}

export async function fetchWeather(lat: number, lon: number, unit: "celsius" | "fahrenheit" = "celsius"): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,surface_pressure,precipitation,uv_index",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,uv_index_max",
    timezone: "auto",
    forecast_days: "7",
    temperature_unit: unit,
    wind_speed_unit: "kmh",
  });
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!r.ok) throw new Error("Weather fetch failed");
  return r.json();
}

// WMO weather code → label + emoji + theme key
export function describeCode(code: number, isDay = 1): { label: string; emoji: string; theme: string } {
  const night = !isDay;
  const map: Record<number, { label: string; emoji: string; theme: string }> = {
    0:  { label: "Clear sky",          emoji: night ? "🌙" : "☀️", theme: night ? "night" : "day" },
    1:  { label: "Mainly clear",       emoji: night ? "🌙" : "🌤️", theme: night ? "night" : "day" },
    2:  { label: "Partly cloudy",      emoji: night ? "☁️" : "⛅",  theme: "cloud" },
    3:  { label: "Overcast",           emoji: "☁️", theme: "cloud" },
    45: { label: "Fog",                emoji: "🌫️", theme: "cloud" },
    48: { label: "Rime fog",           emoji: "🌫️", theme: "cloud" },
    51: { label: "Light drizzle",      emoji: "🌦️", theme: "rain" },
    53: { label: "Drizzle",            emoji: "🌦️", theme: "rain" },
    55: { label: "Heavy drizzle",      emoji: "🌧️", theme: "rain" },
    61: { label: "Light rain",         emoji: "🌦️", theme: "rain" },
    63: { label: "Rain",               emoji: "🌧️", theme: "rain" },
    65: { label: "Heavy rain",         emoji: "🌧️", theme: "rain" },
    71: { label: "Light snow",         emoji: "🌨️", theme: "snow" },
    73: { label: "Snow",               emoji: "❄️", theme: "snow" },
    75: { label: "Heavy snow",         emoji: "❄️", theme: "snow" },
    77: { label: "Snow grains",        emoji: "🌨️", theme: "snow" },
    80: { label: "Rain showers",       emoji: "🌦️", theme: "rain" },
    81: { label: "Heavy showers",      emoji: "🌧️", theme: "rain" },
    82: { label: "Violent showers",    emoji: "⛈️", theme: "rain" },
    85: { label: "Snow showers",       emoji: "🌨️", theme: "snow" },
    86: { label: "Heavy snow showers", emoji: "❄️", theme: "snow" },
    95: { label: "Thunderstorm",       emoji: "⛈️", theme: "rain" },
    96: { label: "Thunderstorm + hail",emoji: "⛈️", theme: "rain" },
    99: { label: "Severe thunderstorm",emoji: "⛈️", theme: "rain" },
  };
  return map[code] ?? { label: "Unknown", emoji: "🌡️", theme: "day" };
}

export function windDirLabel(deg: number) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}
