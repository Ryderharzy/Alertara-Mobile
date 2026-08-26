import { LeafletMap } from "@/components/leaflet-map";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TealColors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import { barangayWeatherPoints } from "@/data/barangay-weather-points";
import { evacuationLocations, type EvacuationLocation } from "@/data/evacuation-locations";
import { useTranslate } from "@/hooks/useTranslate";
import { LocationService } from "@/services/location/location-service";
import type { UserLocation } from "@/types/crime";
import { calculateDistance, formatDistance } from "@/utils/geo-utils";
import { getQCBoundaryCoordinates } from "@/utils/qc-boundary";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

const EMPTY_CRIME_DATA: never[] = [];

// API Key for OpenWeatherMap (Should be in .env)
const OWM_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

const WeatherIcons = {
  sunny: require("../assets/images/weather-forecast-animation/weather_sunny.gif"),
  broken_clouds: require("../assets/images/weather-forecast-animation/weather_broken_clouds.gif"),
  mist: require("../assets/images/weather-forecast-animation/weather_mist.gif"),
  rain: require("../assets/images/weather-forecast-animation/weather_rain.gif"),
  rainy: require("../assets/images/weather-forecast-animation/weather_rainy.gif"),
  heavy_rain: require("../assets/images/weather-forecast-animation/weather_heavy_rain.gif"),
  snow: require("../assets/images/weather-forecast-animation/weather_snow.gif"),
  thunder: require("../assets/images/weather-forecast-animation/weather_thunder.gif"),
  thunderstorm: require("../assets/images/weather-forecast-animation/weather_thunderstorm.gif"),
  clear_day: require("../assets/images/weather-forecast-animation/weather_clear_day.gif"),
  default: require("../assets/images/weather-forecast-animation/weather_sunny.gif"),
};

interface WeatherMarkerData {
  id: string;
  barangay: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  weatherLabel: string;
  weatherIcon: any;
  weatherIconUrl?: string | null;
  forecastTimeLabel: string | null;
  weeklyForecast: DailyForecast[];
  feelsLike: number | null;
  humidity: number | null;
  precipitationChance: number | null;
}

interface DailyForecast {
  date: number;
  label: string;
  high: number;
  low: number;
  weatherLabel: string;
  weatherIcon: any;
}

const WEATHER_REFRESH_MS = 10 * 60 * 1000;
const WEATHER_REQUEST_TIMEOUT_MS = 12000;
const WEATHER_REQUEST_RETRIES = 2;
const OWM_ICON_BASE = "https://openweathermap.org/img/wn";
const INFO_PANEL_MAX_HEIGHT = Dimensions.get("window").height * 0.42;
const FALLBACK_CONDITIONS: {
  label: string;
  icon: any;
  owmIcon: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  precipitationChance: number;
}[] = [
  {
    label: "Clear Sky",
    icon: WeatherIcons.sunny,
    owmIcon: "01d",
    temp: 32,
    feelsLike: 35,
    humidity: 52,
    precipitationChance: 5,
  },
  {
    label: "Scattered Clouds",
    icon: WeatherIcons.broken_clouds,
    owmIcon: "03d",
    temp: 30,
    feelsLike: 32,
    humidity: 58,
    precipitationChance: 12,
  },
  {
    label: "Light Rain",
    icon: WeatherIcons.rain,
    owmIcon: "10d",
    temp: 28,
    feelsLike: 29,
    humidity: 71,
    precipitationChance: 38,
  },
  {
    label: "Overcast",
    icon: WeatherIcons.broken_clouds,
    owmIcon: "04d",
    temp: 29,
    feelsLike: 30,
    humidity: 64,
    precipitationChance: 20,
  },
];

/**
 * OpenWeatherMap Condition Codes Mapping
 * Ref: https://openweathermap.org/weather-conditions
 */
function owmCodeToLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return "Unavailable";
  
  if (code >= 200 && code <= 232) return "Thunderstorm";
  if (code >= 300 && code <= 321) return "Drizzle";
  if (code >= 500 && code <= 531) return "Rain";
  if (code >= 600 && code <= 622) return "Snow";
  if (code >= 701 && code <= 781) return "Mist/Fog";
  if (code === 800) return "Clear Sky";
  if (code === 801) return "Few Clouds";
  if (code === 802) return "Scattered Clouds";
  if (code >= 803 && code <= 804) return "Overcast";
  
  return "Unknown";
}

function owmCodeToIcon(code: number | null | undefined): any {
  if (code === null || code === undefined) return WeatherIcons.default;

  if (code >= 200 && code <= 232) return WeatherIcons.thunderstorm;
  if (code >= 300 && code <= 321) return WeatherIcons.rain;
  if (code >= 500 && code <= 504) return WeatherIcons.rainy;
  if (code >= 511 && code <= 531) return WeatherIcons.heavy_rain;
  if (code >= 600 && code <= 622) return WeatherIcons.snow;
  if (code >= 701 && code <= 781) return WeatherIcons.mist;
  if (code === 800) return WeatherIcons.sunny;
  if (code === 801 || code === 802) return WeatherIcons.broken_clouds;
  if (code >= 803 && code <= 804) return WeatherIcons.broken_clouds;

  return WeatherIcons.default;
}

function openMeteoCodeToLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return "Unavailable";
  if (code === 0) return "Clear Sky";
  if (code === 1 || code === 2) return "Mainly Clear";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm w/ Hail";
  return "Unknown";
}

function toUnavailableWeather(point: (typeof barangayWeatherPoints)[number]): WeatherMarkerData {
  return {
    id: point.id,
    barangay: point.barangay,
    latitude: point.latitude,
    longitude: point.longitude,
    temperatureC: null,
    weatherLabel: "Unavailable",
    weatherIcon: WeatherIcons.default,
    weatherIconUrl: null,
    forecastTimeLabel: null,
    weeklyForecast: [],
    feelsLike: null,
    humidity: null,
    precipitationChance: null,
  };
}

async function fetchWeatherForCoords(
  latitude: number,
  longitude: number,
  label: string
): Promise<WeatherMarkerData | null> {
  // Try OpenWeatherMap if available
  if (OWM_API_KEY) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${OWM_API_KEY}`;
      const data = await fetchForecastWithRetry(url, label);
      const nearestSlot = pickNearestForecastSlot(data?.list);
      const weeklyData = compileWeeklyForecast(data?.list);
      const temp = nearestSlot?.main?.temp;
      const weatherCode = nearestSlot?.weather?.[0]?.id;
      const forecastTimeLabel = formatForecastTimeLabel(nearestSlot?.dt);
      const iconCode = nearestSlot?.weather?.[0]?.icon;
      const iconUrl = iconCode ? `https://openweathermap.org/img/wn/${iconCode}@4x.png` : null;
      return {
        id: `user-${Date.now()}`,
        barangay: label,
        latitude,
        longitude,
        temperatureC: typeof temp === "number" ? Math.round(temp) : null,
        weatherLabel: owmCodeToLabel(weatherCode),
        weatherIcon: owmCodeToIcon(weatherCode),
        weatherIconUrl: iconUrl,
        forecastTimeLabel,
        weeklyForecast: weeklyData,
        feelsLike:
          typeof nearestSlot?.main?.feels_like === "number"
            ? Math.round(nearestSlot.main.feels_like)
            : null,
        humidity:
          typeof nearestSlot?.main?.humidity === "number"
            ? Math.round(nearestSlot.main.humidity)
            : null,
        precipitationChance:
          typeof nearestSlot?.pop === "number"
            ? Math.round(nearestSlot.pop * 100)
            : null,
      };
    } catch (err) {
      console.warn("OWM fetch failed; trying Open-Meteo", err);
    }
  }

  // Fallback: Open-Meteo (no API key)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation_probability&timezone=auto`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const cw = data?.current_weather;
      const temp = typeof cw?.temperature === "number" ? Math.round(cw.temperature) : null;
      const weatherCode = cw?.weathercode ?? null;
      const forecastTimeLabel = cw?.time ? `At ${cw.time}` : "Current weather";
      return {
        id: `user-${Date.now()}`,
        barangay: label,
        latitude,
        longitude,
        temperatureC: temp,
        weatherLabel: openMeteoCodeToLabel(weatherCode),
        weatherIcon: WeatherIcons.default,
        weatherIconUrl: null,
        forecastTimeLabel,
        weeklyForecast: [],
        feelsLike: null,
        humidity: Array.isArray(data?.hourly?.relativehumidity_2m)
          ? Math.round(data.hourly.relativehumidity_2m[0])
          : null,
        precipitationChance: Array.isArray(data?.hourly?.precipitation_probability)
          ? Math.round(data.hourly.precipitation_probability[0])
          : null,
      };
    }
  } catch (err) {
    console.warn("Open-Meteo fetch failed", err);
  }

  return null;
}

function buildOwmIconUrl(iconCode?: string | null): string | null {
  if (!iconCode) return null;
  return `${OWM_ICON_BASE}/${iconCode}@4x.png`;
}

function buildFallbackWeather(): WeatherMarkerData[] {
  const now = Date.now();
  return barangayWeatherPoints.map((point, index) => {
    const fallback = FALLBACK_CONDITIONS[index % FALLBACK_CONDITIONS.length];
    const iconUrl = buildOwmIconUrl(fallback.owmIcon);
    const weeklyForecast: DailyForecast[] = Array.from({ length: 4 }).map((_, dayIndex) => ({
      date: now + dayIndex * 24 * 60 * 60 * 1000,
      label: new Date(now + dayIndex * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
        weekday: "short",
      }),
      high: fallback.temp + (dayIndex % 2 === 0 ? 1 : -1),
      low: fallback.temp - 2,
      weatherLabel: fallback.label,
      weatherIcon: fallback.icon,
    }));
    return {
      id: point.id,
      barangay: point.barangay,
      latitude: point.latitude,
      longitude: point.longitude,
      temperatureC: fallback.temp,
      weatherLabel: fallback.label,
      weatherIcon: fallback.icon,
      weatherIconUrl: iconUrl,
      forecastTimeLabel: "Local snapshot",
      weeklyForecast,
      feelsLike: fallback.feelsLike,
      humidity: fallback.humidity,
      precipitationChance: fallback.precipitationChance,
    };
  });
}

function compileWeeklyForecast(list?: any[]): DailyForecast[] {
  if (!Array.isArray(list)) return [];
  const days: Record<string, { item: any; targetHoursDiff: number }> = {};
  list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().split("T")[0];
    const targetHour = 12;
    const diff = Math.abs(date.getHours() - targetHour);
    const previous = days[dayKey];
    if (!previous || diff < previous.targetHoursDiff) {
      days[dayKey] = { item, targetHoursDiff: diff };
    }
  });

  return Object.values(days)
    .sort((a, b) => a.item.dt - b.item.dt)
    .slice(0, 7)
    .map(({ item }) => {
      const weatherCode = item?.weather?.[0]?.id;
      return {
        date: item.dt * 1000,
        label: new Date(item.dt * 1000).toLocaleDateString(undefined, {
          weekday: "short",
        }),
        high: Math.round(item?.main?.temp_max ?? item?.main?.temp ?? 0),
        low: Math.round(item?.main?.temp_min ?? item?.main?.temp ?? 0),
        weatherLabel: owmCodeToLabel(weatherCode),
        weatherIcon: owmCodeToIcon(weatherCode),
      } as DailyForecast;
    });
}

function pickNearestForecastSlot(list: any[]): any | null {
  if (!Array.isArray(list) || list.length === 0) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  return list.find((item) => typeof item?.dt === "number" && item.dt >= nowSeconds) ?? list[0];
}

function formatForecastTimeLabel(dtSeconds: number | undefined): string | null {
  if (typeof dtSeconds !== "number") return null;

  const date = new Date(dtSeconds * 1000);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchForecastWithRetry(
  url: string,
  barangay: string,
  retries = WEATHER_REQUEST_RETRIES
): Promise<any> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEATHER_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          console.error("Weather API 401: Key invalid or not yet activated. (It can take up to 2 hours for new OWM keys).");
        } else {
          console.error(`Weather API error: ${response.status} for ${barangay}`);
        }
        throw new Error(`Weather API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      const isLastAttempt = attempt === retries;
      if (!isLastAttempt) {
        // Small backoff for transient mobile network failures.
        await delay(450 * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error(`Forecast fetch failed for ${barangay}`);
}

export default function SafetyMapScreen() {
  const { isDarkMode } = useTheme();
  const { t } = useTranslate();
  const [showLegend, setShowLegend] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState({
    alert: true,
    weather: true,
    evac: true,
  });
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedMarkerData, setSelectedMarkerData] = useState<any>(null);
  const [routePath, setRoutePath] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    latitude: number;
    longitude: number;
    zoomDelta?: number;
    key: string;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [weatherMarkers, setWeatherMarkers] = useState<WeatherMarkerData[]>([]);
  const [weeklyForecast, setWeeklyForecast] = useState<DailyForecast[]>([]);
  const isFetchingWeatherRef = useRef(false);
  const hasLoadedWeatherRef = useRef(false);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [aiTypewriterText, setAiTypewriterText] = useState("");
  const aiSummaryScrollRef = useRef<ScrollView>(null);
  const scrollHintAnim = useRef(new Animated.Value(0)).current;
  const [showHourlyHint, setShowHourlyHint] = useState(true);
  const qcBoundaryCoordinates = useMemo(() => getQCBoundaryCoordinates(), []);
  const [infoPanelHeight, setInfoPanelHeight] = useState(0);
  const quickActionsBottom = useMemo(
    () => (showInfoPanel ? infoPanelHeight + 12 : 32),
    [showInfoPanel, infoPanelHeight]
  );
  const quickActionsDynamicStyle = useMemo(
    () => ({ bottom: quickActionsBottom }),
    [quickActionsBottom]
  );

  const toggleLayer = useCallback((layer: "alert" | "weather" | "evac") => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  const activeEvacuationLocations = useMemo(
    () => (layerVisibility.evac ? evacuationLocations : []),
    [layerVisibility.evac]
  );

  const activeWeatherMarkers = useMemo(
    () => (layerVisibility.weather ? weatherMarkers : []),
    [layerVisibility.weather, weatherMarkers]
  );

  const nearestEvacuation = useMemo(() => {
    if (!userLocation) return null;

    let nearest: EvacuationLocation | null = null;
    let minDistance = Infinity;

    for (const site of evacuationLocations) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        site.latitude,
        site.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = site;
      }
    }

  if (!nearest || minDistance === Infinity) return null;
  return { site: nearest, distanceKm: minDistance };
}, [userLocation]);

  const navigationInfo = useMemo(() => {
    if (!routePath || routePath.length < 2 || !nearestEvacuation) return null;
    const start = routePath[0];
    const end = routePath[routePath.length - 1];
    const distanceKm = calculateDistance(
      start.latitude,
      start.longitude,
      end.latitude,
      end.longitude
    );
    const etaMinutes = Math.max(1, Math.round((distanceKm / 4) * 60)); // ~4 km/h walking
    return {
      distanceKm,
      etaMinutes,
      destination: nearestEvacuation.site.name,
    };
  }, [routePath, nearestEvacuation]);

  const computeRoute = useCallback(
    async (
      origin: { latitude: number; longitude: number },
      destination: { latitude: number; longitude: number }
    ) => {
      // optimistic straight line while fetching a better path
      setRoutePath([origin, destination]);
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const coords =
          data?.routes?.[0]?.geometry?.coordinates?.map(
            ([lng, lat]: [number, number]) => ({
              latitude: lat,
              longitude: lng,
            })
          ) ?? [];
        if (coords.length > 1) {
          setRoutePath(coords);
        }
      } catch {
        // ignore network errors; fallback straight line remains
      }
    },
    []
  );

  const selectedMarkerMessage = useMemo(() => {
    if (selectedMarkerData?.type === "evacuation") {
      return `Selected evacuation center: ${selectedMarkerData.data.name}`;
    }

    if (selectedMarkerData?.type === "crime") {
      return "Reported alert near this point. Stay cautious.";
    }

    if (selectedMarkerData?.type === "weather") {
      return `${selectedMarkerData.data.barangay} weather snapshot`;
    }

    if (selectedMarkerData?.type === "user") {
      return "Your current location is shown on the map.";
    }

    return "Tap a marker to surface localized area information.";
  }, [selectedMarkerData]);

  useEffect(() => {
    if (selectedMarkerData?.type === "weather") {
      const weekly =
        selectedMarkerData.data?.weeklyForecast ??
        selectedMarkerData?.weeklyForecast ??
        [];
      if (weekly.length > 0) {
        setWeeklyForecast(weekly);
        return;
      }
    }

    const fallback =
      activeWeatherMarkers.find((marker) => marker.weeklyForecast.length > 0)
        ?.weeklyForecast ?? [];
    setWeeklyForecast(fallback);
  }, [selectedMarkerData, activeWeatherMarkers]);

  const selectedEvacuationDistanceLabel = useMemo(() => {
    if (selectedMarkerData?.type !== "evacuation") return null;
    if (!userLocation) return null;
    const { latitude, longitude } = selectedMarkerData.data;
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      latitude,
      longitude
    );
    return formatDistance(distance);
  }, [selectedMarkerData, userLocation]);

  const selectedCrimeDistanceLabel = useMemo(() => {
    if (selectedMarkerData?.type !== "crime") return null;
    if (!userLocation) return null;
    const { lat, lng } = selectedMarkerData.data;
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      lat,
      lng
    );
    return formatDistance(distance);
  }, [selectedMarkerData, userLocation]);

  const selectedCrimeDateLabel = useMemo(() => {
    if (selectedMarkerData?.type !== "crime") return null;
    const dateValue = selectedMarkerData.data?.date;
    if (!dateValue) return null;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [selectedMarkerData]);

  const showWeatherSummary =
    !selectedMarkerData || selectedMarkerData?.type === "weather";

  const areaWeatherSummary = useMemo(() => {
    if (selectedMarkerData?.type === "weather") {
      return selectedMarkerData.data;
    }

    return activeWeatherMarkers[0] ?? null;
  }, [selectedMarkerData, activeWeatherMarkers]);

  const weatherTemperatureLabel =
    typeof areaWeatherSummary?.temperatureC === "number"
      ? `${areaWeatherSummary.temperatureC}\u00B0C`
      : "--\u00B0C";
  const feelsLikeLabel =
    typeof areaWeatherSummary?.feelsLike === "number"
      ? `${areaWeatherSummary.feelsLike}\u00B0`
      : "--\u00B0";
  const precipitationLabel =
    typeof areaWeatherSummary?.precipitationChance === "number"
      ? `${areaWeatherSummary.precipitationChance}%`
      : "--%";
  const humidityLabel =
    typeof areaWeatherSummary?.humidity === "number"
      ? `${areaWeatherSummary.humidity}%`
      : "--%";
  const statValueColor = isDarkMode ? "#e2e8f0" : "#0f172a";
  const statLabelColor = isDarkMode ? "#94a3b8" : "#94a3b8";
  const scrollToAIDescription = useCallback(() => {
    aiSummaryScrollRef.current?.scrollToEnd({ animated: true });
  }, []);
  const weatherAIMessage = useMemo(() => {
    if (!areaWeatherSummary) return "AI Weather Bot is analyzing your area right now.";
    const upcomingCondition =
      areaWeatherSummary.weeklyForecast?.[0]?.weatherLabel ?? "variable skies";
    return `AI Weather Bot predicts ${upcomingCondition.toLowerCase()} with ${feelsLikeLabel} feels like, ${precipitationLabel} chance of rain, and ${humidityLabel} humidity.`;
  }, [areaWeatherSummary, feelsLikeLabel, precipitationLabel, humidityLabel]);
  useEffect(() => {
    if (showAiSummary) {
      scrollToAIDescription();
    }
  }, [showAiSummary, scrollToAIDescription]);
  const typewriterSpeedMs = 28;
  useEffect(() => {
    if (!showAiSummary) {
      setAiTypewriterText("");
      return;
    }
    let currentIndex = 0;
    setAiTypewriterText("");
    const intervalId = setInterval(() => {
      setAiTypewriterText((prev) => {
        const nextChar = weatherAIMessage[currentIndex] ?? "";
        return prev + nextChar;
      });
      currentIndex += 1;
      if (currentIndex >= weatherAIMessage.length) {
        clearInterval(intervalId);
      }
    }, typewriterSpeedMs);
    return () => {
      clearInterval(intervalId);
    };
  }, [showAiSummary, weatherAIMessage]);
  const aiTypewriterPlaceholder = "AI Weather Bot is preparing your briefing…";
  const aiTextToRender = aiTypewriterText || aiTypewriterPlaceholder;
  const hourlyTimeLabels = useMemo(
    () => ["11:00 AM", "02:00 PM", "05:00 PM", "08:00 PM"],
    []
  );
  const degreeSymbol = "\u00B0";
  const horizontalForecast = useMemo(() => {
    if (!Array.isArray(weeklyForecast)) return [];
    return weeklyForecast.slice(0, 4).map((day, index) => ({
      ...day,
      label: hourlyTimeLabels[index] ?? day.label,
    }));
  }, [weeklyForecast, hourlyTimeLabels]);
  const hasHourlyForecast = horizontalForecast.length > 0;

  useEffect(() => {
    setShowHourlyHint(hasHourlyForecast && horizontalForecast.length > 1);
  }, [horizontalForecast.length, hasHourlyForecast]);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollHintAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scrollHintAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scrollHintAnim]);

  const weatherDescription =
    areaWeatherSummary?.weatherLabel ?? "Weather unavailable";

  const weatherDetailLine =
    areaWeatherSummary?.forecastTimeLabel
      ? `Forecast slot: ${areaWeatherSummary.forecastTimeLabel}`
      : "Weather updates every 10 minutes.";

  // Fetch user location on mount
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const location = await LocationService.getCurrentLocation();
        if (location) {
          setUserLocation(location);
          console.log("User location:", location);
        }
      } catch (error) {
        console.error("Failed to get location:", error);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    fetchLocation();
  }, []);

  useEffect(() => {
    let mounted = true;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    const fetchWeather = async ({ showLoadingState }: { showLoadingState: boolean }) => {
      if (!layerVisibility.weather || isFetchingWeatherRef.current) return;

      if (!OWM_API_KEY) {
        console.warn(
          "OpenWeatherMap API Key (EXPO_PUBLIC_OPENWEATHER_API_KEY) is missing in .env. Falling back to mock weather data."
        );
        if (mounted) {
          const fallbackWeather = buildFallbackWeather();
          setWeatherMarkers(fallbackWeather);
          setWeeklyForecast(fallbackWeather[0]?.weeklyForecast ?? []);
          hasLoadedWeatherRef.current = true;
        }
        return;
      }

      isFetchingWeatherRef.current = true;

        if (mounted && showLoadingState) {
            setWeatherMarkers(
              barangayWeatherPoints.map((point) => ({
                id: point.id,
                barangay: point.barangay,
                latitude: point.latitude,
                longitude: point.longitude,
                temperatureC: null,
                weatherLabel: "Loading...",
                weatherIcon: WeatherIcons.default,
                weatherIconUrl: null,
                forecastTimeLabel: null,
                weeklyForecast: [],
                feelsLike: null,
                humidity: null,
                precipitationChance: null,
              }))
            );
        }

      try {
        const nextWeatherResults = await Promise.allSettled(
          barangayWeatherPoints.map(async (point) => {
            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${point.latitude}&lon=${point.longitude}&units=metric&appid=${OWM_API_KEY}`;
        const data = await fetchForecastWithRetry(url, point.barangay);
        const nearestSlot = pickNearestForecastSlot(data?.list);
        const weeklyData = compileWeeklyForecast(data?.list);
            const temp = nearestSlot?.main?.temp;
            const weatherCode = nearestSlot?.weather?.[0]?.id;
            const forecastTimeLabel = formatForecastTimeLabel(nearestSlot?.dt);

            const iconCode = nearestSlot?.weather?.[0]?.icon;
            const iconUrl = iconCode
              ? `https://openweathermap.org/img/wn/${iconCode}@4x.png`
              : null;

            return {
              id: point.id,
              barangay: point.barangay,
              latitude: point.latitude,
              longitude: point.longitude,
              temperatureC: typeof temp === "number" ? Math.round(temp) : null,
              weatherLabel: owmCodeToLabel(weatherCode),
              weatherIcon: owmCodeToIcon(weatherCode),
              weatherIconUrl: iconUrl,
              forecastTimeLabel,
              weeklyForecast: weeklyData,
              feelsLike: typeof nearestSlot?.main?.feels_like === "number"
                ? Math.round(nearestSlot.main.feels_like)
                : null,
              humidity: typeof nearestSlot?.main?.humidity === "number"
                ? Math.round(nearestSlot.main.humidity)
                : null,
              precipitationChance: typeof nearestSlot?.pop === "number"
                ? Math.round(nearestSlot.pop * 100)
                : null,
            };
          })
        );

        if (mounted) {
            const markers = nextWeatherResults.map((result, index) => {
              if (result.status === "fulfilled") {
                return result.value;
              }

              const point = barangayWeatherPoints[index];
              console.error(`Failed to fetch forecast for ${point.barangay}:`, result.reason);
              return toUnavailableWeather(point);
            });
            setWeatherMarkers(markers);
            const fallbackWeekly =
              markers.find((marker) => marker.weeklyForecast.length > 0)?.weeklyForecast ?? [];
            setWeeklyForecast(fallbackWeekly);
            hasLoadedWeatherRef.current = true;
        }
      } catch (error) {
        console.error("Failed to fetch barangay forecasts:", error);
        if (mounted) {
          const fallbackWeather = buildFallbackWeather();
          setWeatherMarkers(fallbackWeather);
          setWeeklyForecast(fallbackWeather[0]?.weeklyForecast ?? []);
          hasLoadedWeatherRef.current = true;
        }
      } finally {
        isFetchingWeatherRef.current = false;
      }
    };

    fetchWeather({ showLoadingState: !hasLoadedWeatherRef.current });

    if (layerVisibility.weather) {
      refreshTimer = setInterval(() => {
        fetchWeather({ showLoadingState: false });
      }, WEATHER_REFRESH_MS);
    }

    return () => {
      mounted = false;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [layerVisibility.weather]);

  const handleMapPress = useCallback(() => {
    setShowInfoPanel(true);
    // Return to normal clustering after user interacts with map
    setForceShowAllEvacs(false);
    // Clear manual route when user taps away
    setRoutePath(null);
  }, []);

  const handleMarkerPress = useCallback((marker: any) => {
    setSelectedMarkerData(marker);
    setShowInfoPanel(true);
    // keep forceShowAllEvacs state; clicking a marker shouldn't re-enable clustering
  }, []);

  const [forceShowAllEvacs, setForceShowAllEvacs] = useState(false);

  const handleFindMe = useCallback(async () => {
    let currentLocation = userLocation;
    // If we don't have a location yet, try to fetch it now
    if (!currentLocation) {
      setIsLoadingLocation(true);
      currentLocation = await LocationService.getCurrentLocation();
      setUserLocation(currentLocation);
      setIsLoadingLocation(false);
    }

    if (!currentLocation) return;

    // Optimistically show a "your location" weather entry in the info panel
    const loadingWeather: WeatherMarkerData = {
      id: `user-loading-${Date.now()}`,
      barangay: "Your location",
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      temperatureC: null,
      weatherLabel: "Fetching forecast...",
      weatherIcon: WeatherIcons.default,
      weatherIconUrl: null,
      forecastTimeLabel: null,
      weeklyForecast: [],
      feelsLike: null,
      humidity: null,
      precipitationChance: null,
    };
    setSelectedMarkerData({ type: "weather", data: loadingWeather });

    // Fetch a fresh forecast for the exact location when possible; otherwise fall back to nearest marker
    const userWeather = await fetchWeatherForCoords(
      currentLocation.latitude,
      currentLocation.longitude,
      "Your location"
    );
    if (userWeather) {
      setSelectedMarkerData({ type: "weather", data: userWeather });
    } else if (activeWeatherMarkers.length > 0) {
      let nearest = activeWeatherMarkers[0];
      let nearestDistance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        nearest.latitude,
        nearest.longitude
      );
      for (const marker of activeWeatherMarkers) {
        const d = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          marker.latitude,
          marker.longitude
        );
        if (d < nearestDistance) {
          nearestDistance = d;
          nearest = marker;
        }
      }
      setSelectedMarkerData({ type: "weather", data: nearest });
    }

    setForceShowAllEvacs(false);
    setRoutePath(null);
    setFocusTarget({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      zoomDelta: 0.02,
      key: `find-me-${Date.now()}`,
    });
    setShowInfoPanel(true);
  }, [userLocation, activeWeatherMarkers]);

  const handleNearestEvac = useCallback(() => {
    if (!nearestEvacuation) return;

    setForceShowAllEvacs(true);
    if (userLocation) {
      void computeRoute(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        {
          latitude: nearestEvacuation.site.latitude,
          longitude: nearestEvacuation.site.longitude,
        }
      );
    } else {
      setRoutePath(null);
    }
    setFocusTarget({
      latitude: nearestEvacuation.site.latitude,
      longitude: nearestEvacuation.site.longitude,
      zoomDelta: 0.012,
      key: `nearest-evac-${Date.now()}`,
    });
    setSelectedMarkerData({
      type: "evacuation",
      data: nearestEvacuation.site,
    });
    setShowInfoPanel(true);
  }, [nearestEvacuation, userLocation, computeRoute]);

  return (
    <ThemedView style={styles.container}>
      {/* Map Area */}
      <View style={styles.mapContainer}>
        {isLoadingLocation ? (
          <ActivityIndicator size="large" color={TealColors.primary} />
        ) : (
          <LeafletMap
            coordinates={qcBoundaryCoordinates}
            borderColor="#60A5FA"
            userLocation={userLocation}
            crimeData={layerVisibility.alert ? EMPTY_CRIME_DATA : EMPTY_CRIME_DATA}
            evacuationLocations={activeEvacuationLocations}
            weatherMarkers={activeWeatherMarkers}
            nearestEvacuationId={nearestEvacuation?.site.id ?? null}
            isLoadingCrimeData={false}
            clusteringEnabled={!forceShowAllEvacs}
            routePath={routePath}
            onMapPress={handleMapPress}
            onMarkerPress={handleMarkerPress}
            focusTarget={focusTarget}
          />
        )}

      </View>

      {/* Quick Actions */}
      <View style={[styles.quickActions, quickActionsDynamicStyle]}>
        <Pressable
          style={[
            styles.quickActionButton,
            { backgroundColor: isDarkMode ? "#2d3748" : "#ffffff" },
          ]}
          onPress={handleFindMe}
        >
          <IconSymbol name="person.fill" size={16} color="#0E74FF" />
          <ThemedText style={styles.quickActionText}>{t("map.findMe")}</ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.quickActionButton,
            { backgroundColor: isDarkMode ? "#2d3748" : "#ffffff" },
          ]}
          onPress={handleNearestEvac}
        >
          <IconSymbol name="building" size={16} color="#B45309" />
          <ThemedText style={styles.quickActionText}>{t("map.nearestEvac")}</ThemedText>
        </Pressable>
      </View>

      {/* Legend Toggle Button */}
      <Pressable
        style={[
          styles.legendToggle,
          { backgroundColor: isDarkMode ? "#2d3748" : "#ffffff" },
        ]}
        onPress={() => setShowLegend(!showLegend)}
      >
        <IconSymbol
          name={showLegend ? "chevron.down" : "list.bullet"}
          size={20}
          color={TealColors.primary}
        />
        <ThemedText style={styles.legendToggleText}>
          {showLegend ? t("map.hideLayers") : t("map.showLayers")} {t("map.layersLegend")}
        </ThemedText>
      </Pressable>

      {/* Legend Panel */}
      {showLegend && (
        <View
          style={[
            styles.legendPanel,
            { backgroundColor: isDarkMode ? "#1a202c" : "#f7fafc" },
          ]}
        >
          <ThemedText style={styles.legendTitle}>{t("map.crimeDensity")}</ThemedText>

          {/* Color Scale */}
          <View style={styles.colorScale}>
            <View style={[styles.colorBox, { backgroundColor: "#0000ff" }]} />
            <View style={[styles.colorBox, { backgroundColor: "#00ff00" }]} />
            <View style={[styles.colorBox, { backgroundColor: "#ffff00" }]} />
            <View style={[styles.colorBox, { backgroundColor: "#ff8800" }]} />
            <View style={[styles.colorBox, { backgroundColor: "#ff0000" }]} />
          </View>

          {/* Labels */}
          <View style={styles.legendLabels}>
            <ThemedText style={styles.legendLabel}>{t("map.low")}</ThemedText>
            <ThemedText style={styles.legendLabel}>{t("map.high")}</ThemedText>
          </View>

          {/* Guide */}
          <ThemedText style={styles.legendGuide}>
            {t("map.densityGuide")}
          </ThemedText>

          <View style={styles.legendDivider} />

          <ThemedText style={styles.legendSectionTitle}>{t("map.mapLayers")}</ThemedText>

          <Pressable
            style={styles.checkboxRow}
            onPress={() => toggleLayer("alert")}
          >
            <View
              style={[
                styles.checkbox,
                layerVisibility.alert && styles.checkboxChecked,
              ]}
            >
              {layerVisibility.alert && (
                <IconSymbol name="checkmark" size={12} color="#ffffff" />
              )}
            </View>
            <ThemedText style={styles.checkboxLabel}>{t("map.alertLayer")}</ThemedText>
          </Pressable>

          <Pressable
            style={styles.checkboxRow}
            onPress={() => toggleLayer("weather")}
          >
            <View
              style={[
                styles.checkbox,
                layerVisibility.weather && styles.checkboxChecked,
              ]}
            >
              {layerVisibility.weather && (
                <IconSymbol name="checkmark" size={12} color="#ffffff" />
              )}
            </View>
            <ThemedText style={styles.checkboxLabel}>{t("map.weatherLayer")}</ThemedText>
          </Pressable>

          <Pressable
            style={styles.checkboxRow}
            onPress={() => toggleLayer("evac")}
          >
            <View
              style={[
                styles.checkbox,
                layerVisibility.evac && styles.checkboxChecked,
              ]}
            >
              {layerVisibility.evac && (
                <IconSymbol name="checkmark" size={12} color="#ffffff" />
              )}
            </View>
            <ThemedText style={styles.checkboxLabel}>{t("map.evacLayer")}</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Bottom Info Panel */}
      {showInfoPanel && (
        <View
          style={[
            styles.infoPanel,
            { backgroundColor: isDarkMode ? "#2d3748" : "#ffffff" },
          ]}
          onLayout={(event) => setInfoPanelHeight(event.nativeEvent.layout.height)}
        >
          <View
            style={[
              styles.infoPanelHeader,
              showWeatherSummary && styles.weatherHeaderBackground,
              showWeatherSummary && {
                backgroundColor: isDarkMode ? "#111827" : "#eef2ff",
              },
            ]}
          >
            {showWeatherSummary ? (
              <View style={styles.infoPanelTitleRow}>
                <IconSymbol name="location" size={16} color={TealColors.primary} />
                <ThemedText style={styles.infoPanelTitle}>
                  {t("map.areaWeather")}
                </ThemedText>
              </View>
            ) : (
              selectedMarkerData?.type !== "weather" && (
                <View style={styles.infoPanelTitleRow}>
                  <IconSymbol name="location" size={16} color={TealColors.primary} />
                  <ThemedText style={styles.infoPanelTitle}>
                    {t("map.areaInfo")}
                  </ThemedText>
                </View>
              )
            )}
            <View style={styles.headerSpacer} />
            <Pressable style={styles.closeButton} onPress={() => setShowInfoPanel(false)}>
              <IconSymbol
                name="xmark"
                size={18}
                color={isDarkMode ? "#e2e8f0" : "#4a5568"}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.infoContentScroll}
            contentContainerStyle={styles.infoContentContainer}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {selectedMarkerData?.type !== "weather" && !showWeatherSummary && (
              <ThemedText style={styles.infoPanelSubtitle}>
                {selectedMarkerMessage}
              </ThemedText>
            )}

            {navigationInfo && (
              <View
                style={[
                  styles.navigationInfoCard,
                  {
                    backgroundColor: isDarkMode ? "#111827" : "#f8fafc",
                    borderColor: isDarkMode ? "#1f2937" : "#e5e7eb",
                  },
                ]}
              >
                <View style={styles.navigationInfoRow}>
                  <IconSymbol name="arrow.right" size={18} color={TealColors.primary} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.navigationTitle} numberOfLines={1}>
                      {t("map.routingTo")} {navigationInfo.destination}
                    </ThemedText>
                    <ThemedText style={styles.navigationSubtitle}>
                      {navigationInfo.distanceKm.toFixed(2)} km · ~{navigationInfo.etaMinutes} min
                    </ThemedText>
                  </View>
                  <Pressable style={styles.navigationClearBtn} onPress={() => setRoutePath(null)}>
                    <ThemedText style={styles.navigationClearText}>{t("map.clear")}</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

            {selectedMarkerData?.type === "evacuation" && (
              <View
                style={[
                  styles.markerDetailCard,
                  {
                    backgroundColor: isDarkMode ? "#0f172a" : "#e0f2fe",
                  },
                ]}
              >
                <ThemedText style={styles.markerDetailLabel}>
                  {t("map.evacuationCenter")}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.markerDetailValue,
                    { color: isDarkMode ? "#e0f2fe" : "#0f172a" },
                  ]}
                >
                  {selectedMarkerData.data.name}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.markerDetailMeta,
                    { color: isDarkMode ? "#cbd5f5" : "#0f172a" },
                  ]}
                >
                  {selectedMarkerData.data.district}
                  {selectedEvacuationDistanceLabel
                    ? ` • ${selectedEvacuationDistanceLabel} away`
                    : ""}
                </ThemedText>
              </View>
            )}

            {selectedMarkerData?.type === "crime" && (
              <View
                style={[
                  styles.markerDetailCard,
                  {
                    backgroundColor: isDarkMode ? "#3b0d0d" : "#fee2e2",
                  },
                ]}
              >
                <ThemedText style={styles.markerDetailLabel}>
                  {t("map.incidentAlert")}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.markerDetailValue,
                    { color: isDarkMode ? "#fee2e2" : "#0f172a" },
                  ]}
                >
                  {selectedCrimeDateLabel ?? t("map.recentReport")}
                </ThemedText>
                <ThemedText style={styles.markerDetailMeta}>
                  {selectedCrimeDistanceLabel
                    ? `${selectedCrimeDistanceLabel} from you`
                    : t("map.tapMarker")}
                </ThemedText>
              </View>
            )}

            {showWeatherSummary && (
              <>
                <View style={styles.weatherCardHeader}>
                  <View style={styles.weatherInfoGroup}>
                    <View
                      style={[
                        styles.weatherHeaderText,
                        { paddingRight: 4 },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.locationLabel,
                          { color: isDarkMode ? "#e2e8f0" : "#0f172a" },
                        ]}
                        numberOfLines={1}
                      >
                        {areaWeatherSummary?.barangay ?? "Talayan"}
                      </ThemedText>
                      <ThemedText
                        style={styles.temperatureLabel}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {weatherTemperatureLabel}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.conditionLabel,
                          { color: isDarkMode ? "#cbd5f5" : "#64748b" },
                        ]}
                        numberOfLines={1}
                      >
                        {weatherDescription}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.weatherDetailLine,
                          { color: isDarkMode ? "#d1d5db" : "#94a3b8" },
                        ]}
                      >
                        {weatherDetailLine.replace("Forecast slot: ", t("map.updated") + " ")}
                      </ThemedText>
                      <Pressable
                        style={[
                          styles.aiTriggerButton,
                          {
                            borderColor: isDarkMode ? "#94a3b8" : TealColors.primary,
                            backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
                          },
                        ]}
                        onPress={() => {
                          if (!showAiSummary) {
                            setShowAiSummary(true);
                          } else {
                            scrollToAIDescription();
                          }
                        }}
                        accessibilityLabel="Scroll to AI weather summary"
                      >
                        <MaterialCommunityIcons
                          name="robot"
                          size={24}
                          color={isDarkMode ? "#e0f2fe" : TealColors.primary}
                        />
                      </Pressable>
                    </View>
                    <View style={styles.weatherStatsColumnRight}>
                      <View style={styles.statRow}>
                        <IconSymbol
                          name="thermometer"
                          size={16}
                          color={TealColors.primary}
                        />
                        <View>
                          <ThemedText
                            style={[styles.statLabel, { color: statLabelColor }]}
                          >
                            {t("weather.feelsLike", "Feels like")}
                          </ThemedText>
                          <ThemedText
                            style={[styles.statValue, { color: statValueColor }]}
                          >
                            {feelsLikeLabel}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.statRow}>
                        <IconSymbol
                          name="cloud.rain"
                          size={16}
                          color={TealColors.primary}
                        />
                        <View>
                          <ThemedText
                            style={[styles.statLabel, { color: statLabelColor }]}
                          >
                            {t("weather.precipitation", "Precip")}
                          </ThemedText>
                          <ThemedText
                            style={[styles.statValue, { color: statValueColor }]}
                          >
                            {precipitationLabel}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.statRow}>
                        <IconSymbol
                          name="drop"
                          size={16}
                          color={TealColors.primary}
                        />
                        <View>
                          <ThemedText
                            style={[styles.statLabel, { color: statLabelColor }]}
                          >
                            Humidity
                          </ThemedText>
                          <ThemedText
                            style={[styles.statValue, { color: statValueColor }]}
                          >
                            {humidityLabel}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.weatherIconBackground,
                      {
                        backgroundColor: isDarkMode ? "#1f2937" : "#f3f4f6",
                      },
                    ]}
                  >
                    <Image
                      source={areaWeatherSummary?.weatherIcon ?? WeatherIcons.default}
                      style={styles.weatherIconLarge}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <ScrollView
                  ref={aiSummaryScrollRef}
                  style={styles.aiScrollContainer}
                  contentContainerStyle={styles.aiScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                <View style={styles.hourlyScrollWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hourlyForecastListContent}
                    onScroll={({ nativeEvent }) => {
                      const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
                      const visibleEnd = contentOffset.x + layoutMeasurement.width;
                      const atEnd = visibleEnd >= contentSize.width - 4; // small buffer
                      setShowHourlyHint(!atEnd && horizontalForecast.length > 1);
                    }}
                    onMomentumScrollEnd={({ nativeEvent }) => {
                      const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
                      const visibleEnd = contentOffset.x + layoutMeasurement.width;
                      const atEnd = visibleEnd >= contentSize.width - 4;
                      setShowHourlyHint(!atEnd && horizontalForecast.length > 1);
                    }}
                    onScrollBeginDrag={() => {
                      if (horizontalForecast.length > 1) setShowHourlyHint(true);
                    }}
                    scrollEventThrottle={16}
                  >
                    {hasHourlyForecast ? (
                      horizontalForecast.map((slot) => (
                      <View
                        key={slot.date}
                        style={[
                          styles.hourlyForecastItem,
                          {
                            backgroundColor: isDarkMode
                              ? "rgba(56, 189, 248, 0.15)"
                              : "#f1f5f9",
                            borderColor: isDarkMode
                              ? "rgba(14, 165, 233, 0.3)"
                              : "rgba(15, 23, 42, 0.08)",
                            marginRight: 10,
                          },
                        ]}
                      >
                        <ThemedText style={styles.hourlyTime}>
                          {slot.label}
                        </ThemedText>
                        <Image
                          source={slot.weatherIcon}
                          style={styles.hourlyIcon}
                          resizeMode="contain"
                        />
                        <ThemedText
                          style={[
                            styles.hourlyTemp,
                            { color: isDarkMode ? "#e0f2fe" : "#0f172a" },
                          ]}
                        >
                          {slot.high}
                          {degreeSymbol}
                        </ThemedText>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.hourlyPlaceholder}>
                      Forecast soon
                    </ThemedText>
                  )}
                </ScrollView>
                  {showHourlyHint && hasHourlyForecast && (
                    <Animated.Text
                      pointerEvents="none"
                      style={[
                        styles.hourlyScrollHintText,
                        {
                          color: isDarkMode ? "#cbd5f5" : "#475569",
                          opacity: scrollHintAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.35, 1],
                          }),
                          transform: [
                            {
                              translateX: scrollHintAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 6],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      {">>>"}
                    </Animated.Text>
                  )}
                </View>
                  {showAiSummary && (
                    <View
                      style={[
                        styles.aiBotCard,
                        {
                          backgroundColor: isDarkMode ? "#111827" : "#eef2ff",
                          borderColor: isDarkMode
                            ? "rgba(79, 70, 229, 0.35)"
                            : "rgba(14, 165, 233, 0.35)",
                        },
                      ]}
                    >
                    <View
                      style={[
                        styles.aiBotIconWrapper,
                        {
                          borderColor: isDarkMode
                              ? "rgba(226, 232, 240, 0.25)"
                              : "rgba(15, 23, 42, 0.2)",
                            backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="robot"
                          size={26}
                          color={TealColors.primary}
                        />
                      </View>
                      <View style={styles.aiBotContent}>
                        <ThemedText
                          style={[
                            styles.aiBotTitle,
                            { color: isDarkMode ? "#e0f2fe" : "#0f172a" },
                          ]}
                        >
                          AI Weather Bot
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.aiBotText,
                            { color: isDarkMode ? "#cbd5f5" : "#0f172a" },
                          ]}
                        >
                          {aiTextToRender}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.aiBotCaption,
                            { color: isDarkMode ? "#94a3b8" : "#475569" },
                          ]}
                        >
                          Tap the robot above to jump here.
                        </ThemedText>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </ScrollView>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#e0e0e0",
  },
  legendToggle: {
    position: "absolute",
    top: 44,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  legendToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  legendPanel: {
    position: "absolute",
    top: 80,
    right: 16,
    width: 180,
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  colorScale: {
    flexDirection: "row",
    height: 24,
    marginBottom: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  colorBox: {
    flex: 1,
  },
  legendLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  legendGuide: {
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.8,
  },
  legendDivider: {
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
    marginVertical: 10,
  },
  legendSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  mapTypeToggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  mapTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  mapTypeChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: TealColors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: TealColors.primary,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  quickActions: {
    position: "absolute",
    right: 16,
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 10,
    zIndex: 20,
    elevation: 8,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  navigationBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 15,
  },
  navigationBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navigationTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  navigationSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  navigationInfoCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  navigationInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navigationClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navigationClearText: {
    color: TealColors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  infoPanel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    maxHeight: INFO_PANEL_MAX_HEIGHT,
  },
  infoContentScroll: {
    marginTop: 10,
  },
  infoContentContainer: {
    paddingBottom: 12,
    gap: 10,
  },
  infoPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: {
    flex: 1,
  },
  infoPanelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoPanelTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  weatherHeaderBackground: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  infoPanelSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 6,
  },
  closeButton: {
    padding: 4,
    marginRight: -4,
  },
  weatherCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  weatherInfoGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  weatherHeaderText: {
    minWidth: 0,
    marginRight: 6,
    marginTop: 4,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  temperatureLabel: {
    fontSize: 38,
    fontWeight: "700",
    color: TealColors.primary,
    letterSpacing: -1,
    flexShrink: 1,
    minWidth: 0,
    lineHeight: 42,
    includeFontPadding: false,
  },
  conditionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  weatherDetailLine: {
    fontSize: 11,
    color: "#94a3b8",
  },
  weatherIconLarge: {
    width: 86,
    height: 86,
  },
  weatherIconBackground: {
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  weatherStatsColumnRight: {
    flexShrink: 0,
    alignItems: "flex-start",
    gap: 4,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  aiTriggerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  aiScrollContainer: {
    marginTop: 6,
  },
  aiScrollContent: {
    paddingBottom: 8,
  },
  hourlyScrollWrapper: {
    position: "relative",
  },
  hourlyScrollHintText: {
    position: "absolute",
    top: "40%",
    transform: [{ translateY: -9 }],
    right: 6,
    fontSize: 20,
    fontWeight: "700",
  },
  aiBotCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    gap: 12,
    alignItems: "center",
  },
  aiBotIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBotContent: {
    flex: 1,
  },
  aiBotTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  aiBotText: {
    fontSize: 13,
    lineHeight: 18,
  },
  aiBotCaption: {
    fontSize: 11,
    marginTop: 6,
  },
  hourlyForecastListContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  hourlyForecastItem: {
    width: 92,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  hourlyTime: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 6,
  },
  hourlyIcon: {
    width: 32,
    height: 32,
    marginBottom: 6,
  },
  hourlyTemp: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  hourlyPlaceholder: {
    fontSize: 12,
    color: "#94a3b8",
  },
  markerDetailCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  markerDetailLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    textTransform: "uppercase",
    color: TealColors.primary,
    marginBottom: 4,
  },
  markerDetailValue: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  markerDetailMeta: {
    fontSize: 11,
    opacity: 0.8,
  },
});
