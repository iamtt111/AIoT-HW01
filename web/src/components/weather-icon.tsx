import { Cloud, CloudLightning, CloudRain, CloudSun, Sun } from "lucide-react";

import type { WeatherIconName } from "@/lib/weather-presentation";

const icons = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
  cloudy: Cloud,
} satisfies Record<WeatherIconName, typeof Sun>;

export function WeatherIcon({ name, className = "h-5 w-5" }: { name: WeatherIconName; className?: string }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />;
}
