import { useEffect, useMemo, useState } from "react";
import {
  Search, MapPin, Wind, Droplets, Gauge, Sun, Eye, Thermometer,
  Sunrise, Sunset, Loader2, Star, X,
} from "lucide-react";
import {
  fetchWeather, geocode, describeCode, windDirLabel,
  type GeoResult, type WeatherData,
} from "@/lib/weather";

type SavedCity = GeoResult;

const FAV_KEY = "weather.favorites";
const LAST_KEY = "weather.last";
const UNIT_KEY = "weather.unit";

const DEFAULT_CITY: GeoResult = {
  id: 1,
  name: "Karachi",
  country: "Pakistan",
  latitude: 24.8607,
  longitude: 67.0011,
};

export default function WeatherApp() {
  const [city, setCity] = useState<GeoResult>(() => {
    if (typeof window === "undefined") return DEFAULT_CITY;
    try { return JSON.parse(localStorage.getItem(LAST_KEY) || "") || DEFAULT_CITY; }
    catch { return DEFAULT_CITY; }
  });
  const [unit, setUnit] = useState<"celsius" | "fahrenheit">(() => {
    if (typeof window === "undefined") return "celsius";
    return (localStorage.getItem(UNIT_KEY) as "celsius" | "fahrenheit") || "celsius";
  });
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [favorites, setFavorites] = useState<SavedCity[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
  });

  // Load weather
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    fetchWeather(city.latitude, city.longitude, unit)
      .then(d => { if (!cancel) setData(d); })
      .catch(e => { if (!cancel) setError(e.message); })
      .finally(() => { if (!cancel) setLoading(false); });
    localStorage.setItem(LAST_KEY, JSON.stringify(city));
    return () => { cancel = true; };
  }, [city, unit]);

  useEffect(() => { localStorage.setItem(UNIT_KEY, unit); }, [unit]);
  useEffect(() => { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); }, [favorites]);

  // Theme on body based on weather
  const desc = data ? describeCode(data.current.weather_code, data.current.is_day) : null;
  useEffect(() => {
    if (!desc) return;
    document.body.dataset.theme = desc.theme === "day" ? "" : desc.theme;
  }, [desc?.theme]);

  // Search debounced
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      geocode(query).then(setResults).finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const isFav = useMemo(
    () => favorites.some(f => f.id === city.id),
    [favorites, city]
  );

  const toggleFav = () => {
    setFavorites(prev =>
      prev.some(f => f.id === city.id)
        ? prev.filter(f => f.id !== city.id)
        : [...prev, city]
    );
  };

  const useGeo = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCity({
          id: Date.now(),
          name: "My location",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => setError("Location permission denied"),
    );
  };

  const unitSymbol = unit === "celsius" ? "°C" : "°F";

  // Build hourly slice — next 24h from now
  const hourly = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const idx = data.hourly.time.findIndex(t => new Date(t) >= now);
    const start = Math.max(0, idx);
    return data.hourly.time.slice(start, start + 24).map((t, i) => ({
      time: t,
      temp: data.hourly.temperature_2m[start + i],
      code: data.hourly.weather_code[start + i],
      pop: data.hourly.precipitation_probability[start + i] ?? 0,
    }));
  }, [data]);

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-shadow-soft">
          Skyline Weather
        </h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            onClick={useGeo}
            className="glass glass-hover flex items-center gap-2 px-3 py-2 text-sm"
            aria-label="Use current location"
          >
            <MapPin className="size-4" /> <span className="hidden sm:inline">My location</span>
          </button>
          <div className="glass flex items-center text-sm overflow-hidden">
            <button
              onClick={() => setUnit("celsius")}
              className={`px-3 py-2 transition ${unit === "celsius" ? "bg-foreground/15" : ""}`}
            >°C</button>
            <button
              onClick={() => setUnit("fahrenheit")}
              className={`px-3 py-2 transition ${unit === "fahrenheit" ? "bg-foreground/15" : ""}`}
            >°F</button>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="relative mb-6">
        <div className="glass flex items-center gap-2 px-4 py-3">
          <Search className="size-5 opacity-70" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search city — e.g. Lahore, Tokyo, Paris"
            className="bg-transparent outline-none flex-1 placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }}>
              <X className="size-4 opacity-70" />
            </button>
          )}
          {searching && <Loader2 className="size-4 animate-spin opacity-70" />}
        </div>
        {results.length > 0 && (
          <ul className="glass absolute z-20 mt-2 w-full overflow-hidden divide-y divide-glass-border animate-fade-up">
            {results.map(r => (
              <li key={r.id}>
                <button
                  onClick={() => { setCity(r); setQuery(""); setResults([]); }}
                  className="w-full text-left px-4 py-3 hover:bg-foreground/10 transition"
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[r.admin1, r.country].filter(Boolean).join(", ")}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {favorites.map(f => (
            <div key={f.id} className="glass glass-hover flex items-center pl-3 pr-1 py-1 text-sm">
              <button onClick={() => setCity(f)} className="pr-2">{f.name}</button>
              <button
                onClick={() => setFavorites(prev => prev.filter(x => x.id !== f.id))}
                className="p-1 opacity-60 hover:opacity-100"
                aria-label="Remove favorite"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="glass p-4 text-destructive-foreground bg-destructive/30 mb-6">
          {error}
        </div>
      )}

      {/* Current */}
      {loading && !data ? (
        <div className="glass p-10 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : data && desc ? (
        <>
          <section className="glass p-6 sm:p-8 mb-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="text-7xl sm:text-8xl animate-float leading-none">{desc.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>{city.name}{city.country ? `, ${city.country}` : ""}</span>
                  <button
                    onClick={toggleFav}
                    className="ml-2 p-1"
                    aria-label="Toggle favorite"
                  >
                    <Star className={`size-4 transition ${isFav ? "fill-accent text-accent" : "opacity-60"}`} />
                  </button>
                </div>
                <div className="mt-1 flex items-end gap-3">
                  <span className="text-6xl sm:text-7xl font-bold text-shadow-soft">
                    {Math.round(data.current.temperature_2m)}
                  </span>
                  <span className="text-2xl mb-2 opacity-80">{unitSymbol}</span>
                </div>
                <div className="text-lg opacity-90">{desc.label}</div>
                <div className="text-sm text-muted-foreground">
                  Feels like {Math.round(data.current.apparent_temperature)}{unitSymbol}
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat icon={<Wind className="size-4" />} label="Wind"
                  value={`${Math.round(data.current.wind_speed_10m)} km/h`}
                  sub={windDirLabel(data.current.wind_direction_10m)} />
            <Stat icon={<Droplets className="size-4" />} label="Humidity"
                  value={`${data.current.relative_humidity_2m}%`} />
            <Stat icon={<Gauge className="size-4" />} label="Pressure"
                  value={`${Math.round(data.current.surface_pressure)} hPa`} />
            <Stat icon={<Sun className="size-4" />} label="UV index"
                  value={`${Math.round(data.daily.uv_index_max[0] ?? 0)}`}
                  sub={uvLabel(data.daily.uv_index_max[0] ?? 0)} />
            <Stat icon={<Thermometer className="size-4" />} label="Precipitation"
                  value={`${data.current.precipitation} mm`} />
            <Stat icon={<Eye className="size-4" />} label="Today max/min"
                  value={`${Math.round(data.daily.temperature_2m_max[0])}° / ${Math.round(data.daily.temperature_2m_min[0])}°`} />
            <Stat icon={<Sunrise className="size-4" />} label="Sunrise"
                  value={fmtTime(data.daily.sunrise[0])} />
            <Stat icon={<Sunset className="size-4" />} label="Sunset"
                  value={fmtTime(data.daily.sunset[0])} />
          </section>

          {/* Hourly */}
          <section className="glass p-4 sm:p-5 mb-6 animate-fade-up">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 px-1">Next 24 hours</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth">
              {hourly.map(h => {
                const d = describeCode(h.code, isDayHour(h.time, data.daily.sunrise[0], data.daily.sunset[0]) ? 1 : 0);
                return (
                  <div key={h.time} className="glass min-w-20 flex-shrink-0 py-3 px-2 text-center">
                    <div className="text-xs text-muted-foreground">{fmtHour(h.time)}</div>
                    <div className="text-2xl my-1">{d.emoji}</div>
                    <div className="font-semibold">{Math.round(h.temp)}°</div>
                    <div className="text-[10px] text-primary">{h.pop}%</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 7-day */}
          <section className="glass p-4 sm:p-5 animate-fade-up">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 px-1">7-day forecast</h2>
            <ul className="divide-y divide-glass-border">
              {data.daily.time.map((t, i) => {
                const d = describeCode(data.daily.weather_code[i], 1);
                const max = data.daily.temperature_2m_max[i];
                const min = data.daily.temperature_2m_min[i];
                return (
                  <li key={t} className="flex items-center gap-3 py-3">
                    <div className="w-20 text-sm">{i === 0 ? "Today" : fmtDay(t)}</div>
                    <div className="text-2xl w-10">{d.emoji}</div>
                    <div className="flex-1 text-sm text-muted-foreground hidden sm:block">{d.label}</div>
                    <div className="text-xs text-primary w-14 text-right">
                      {data.daily.precipitation_sum[i] > 0 ? `${data.daily.precipitation_sum[i]}mm` : ""}
                    </div>
                    <div className="w-28 sm:w-36">
                      <RangeBar min={min} max={max}
                        weekMin={Math.min(...data.daily.temperature_2m_min)}
                        weekMax={Math.max(...data.daily.temperature_2m_max)} />
                    </div>
                    <div className="w-16 text-right text-sm">
                      <span className="opacity-70">{Math.round(min)}°</span>{" "}
                      <span className="font-semibold">{Math.round(max)}°</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Data by Open-Meteo · Times shown in {data.timezone}
          </p>
        </>
      ) : null}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="glass glass-hover p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RangeBar({ min, max, weekMin, weekMax }: { min: number; max: number; weekMin: number; weekMax: number }) {
  const span = Math.max(1, weekMax - weekMin);
  const left = ((min - weekMin) / span) * 100;
  const width = ((max - min) / span) * 100;
  return (
    <div className="h-2 rounded-full bg-foreground/10 relative">
      <div
        className="absolute h-2 rounded-full"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 4)}%`,
          background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
        }}
      />
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtHour(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric" });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short" });
}
function isDayHour(iso: string, sunrise: string, sunset: string) {
  const t = new Date(iso).getTime();
  const sr = new Date(sunrise).getTime();
  const ss = new Date(sunset).getTime();
  return t >= sr && t <= ss;
}
function uvLabel(uv: number) {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}
