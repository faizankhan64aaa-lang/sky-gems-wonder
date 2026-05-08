import { createFileRoute } from "@tanstack/react-router";
import WeatherApp from "@/components/WeatherApp";

export const Route = createFileRoute("/")({
  component: WeatherApp,
  head: () => ({
    meta: [
      { title: "Skyline Weather — Live forecast & 7-day outlook" },
      { name: "description", content: "Beautiful real-time weather with hourly and 7-day forecasts, geolocation, favorites, and °C/°F units." },
      { property: "og:title", content: "Skyline Weather" },
      { property: "og:description", content: "Live weather, hourly + 7-day forecast, geolocation, favorites." },
    ],
  }),
});
