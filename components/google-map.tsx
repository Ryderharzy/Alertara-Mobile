import { TealColors } from "@/constants/theme";
import type { EvacuationLocation } from "@/data/evacuation-locations";
import type { CrimeDataPoint, UserLocation } from "@/types/crime";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
// Use clustering to reduce marker clutter (especially for evacuation sites).
import MapView from "react-native-map-clustering";
import { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { ThemedText } from "./themed-text";
import { IconSymbol } from "./ui/icon-symbol";

const INITIAL_REGION = {
  latitude: 14.628,
  longitude: 121.044,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

type WeatherMarker = {
  id: string;
  barangay: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  weatherLabel: string;
  weatherIcon?: any;
  weatherIconUrl?: string | null;
  forecastTimeLabel?: string | null;
};

interface GoogleMapProps {
  coordinates: { latitude: number; longitude: number }[];
  borderColor?: string;
  userLocation?: UserLocation | null;
  crimeData?: CrimeDataPoint[];
  evacuationLocations?: EvacuationLocation[];
  weatherMarkers?: WeatherMarker[];
  nearestEvacuationId?: string | null;
  isLoadingCrimeData?: boolean;
  clusteringEnabled?: boolean;
  routePath?: { latitude: number; longitude: number }[] | null;
  mapType?:
    | "standard"
    | "satellite"
    | "hybrid"
    | "terrain"
    | "none"
    | "mutedStandard";
  onMapReady?: () => void;
  onMapPress?: () => void;
  onMarkerPress?: (marker: any) => void;
  focusTarget?: {
    latitude: number;
    longitude: number;
    zoomDelta?: number;
    key: string;
  } | null;
}

function GoogleMapComponent({
  coordinates,
  borderColor = "#60A5FA",
  userLocation,
  crimeData = [],
  evacuationLocations = [],
  weatherMarkers = [],
  nearestEvacuationId = null,
  isLoadingCrimeData = false,
  clusteringEnabled = true,
  routePath = null,
  mapType = "hybrid",
  onMapReady,
  onMapPress,
  onMarkerPress,
  focusTarget,
}: GoogleMapProps) {
  // Use loose typing because the clustering wrapper doesn't expose the full MapView instance type
  const mapRef = useRef<any>(null);

  const weatherPinColor = useCallback((label: string) => {
    const text = label.toLowerCase();
    if (text.includes("thunder")) return "#7C3AED";
    if (text.includes("rain") || text.includes("drizzle")) return "#2563EB";
    if (text.includes("snow")) return "#06B6D4";
    if (text.includes("mist") || text.includes("fog")) return "#64748B";
    if (text.includes("clear")) return "#F59E0B";
    if (text.includes("cloud") || text.includes("overcast")) return "#94A3B8";
    return "#F59E0B";
  }, []);

  const boundaryPath = useMemo(() => {
    if (coordinates.length === 0) return [];
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    const isClosed =
      first.latitude === last.latitude && first.longitude === last.longitude;

    return isClosed ? coordinates : [...coordinates, first];
  }, [coordinates]);

  const userCoordinate = useMemo(
    () =>
      userLocation
        ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }
        : null,
    [userLocation],
  );

  const handleMapReady = useCallback(() => {
    if (coordinates.length > 0) {
      mapRef.current?.fitToCoordinates?.(coordinates, {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: false,
      });
    }

    onMapReady?.();
  }, [coordinates, onMapReady]);

  useEffect(() => {
    if (!focusTarget || !mapRef.current) return;

    mapRef.current?.animateToRegion?.(
      {
        latitude: focusTarget.latitude,
        longitude: focusTarget.longitude,
        latitudeDelta: focusTarget.zoomDelta ?? 0.03,
        longitudeDelta: focusTarget.zoomDelta ?? 0.03,
      },
      700,
    );
  }, [focusTarget]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        mapType={mapType}
        clusteringEnabled={clusteringEnabled}
        onMapReady={handleMapReady}
        onPress={onMapPress}
        zoomEnabled
        scrollEnabled
        pitchEnabled
        rotateEnabled
        showsMyLocationButton={false}
        toolbarEnabled={false}
        showsCompass={false}
        zoomControlEnabled={false}
        showsUserLocation
        // clustering props
        clusterColor="#EA580C"
        clusterTextColor="#ffffff"
        radius={48}
        spiralEnabled
        animationEnabled
      >
        {coordinates.length > 0 && (
          <Polygon
            coordinates={coordinates}
            strokeColor="rgba(0,0,0,0)"
            strokeWidth={0}
            fillColor="rgba(96, 165, 250, 0.12)"
            lineDashPattern={[]}
          />
        )}

        {boundaryPath.length > 1 && (
          <Polyline
            coordinates={boundaryPath}
            strokeColor={borderColor}
            strokeWidth={4}
            geodesic
          />
        )}

        {routePath && routePath.length > 1 && (
          <Polyline
            coordinates={routePath}
            strokeColor={TealColors.primary}
            strokeWidth={5}
            lineDashPattern={[14, 8]}
            geodesic
          />
        )}

        {userCoordinate && (
          <Marker
            coordinate={userCoordinate}
            title="You are here"
            description="Current position"
            // Exclude user pin from clustering; keep it always visible.
            // @ts-expect-error cluster prop comes from react-native-map-clustering
            cluster={false}
            tracksViewChanges={false}
            onPress={() =>
              onMarkerPress?.({ type: "user", data: userLocation })
            }
          >
            <View style={styles.userMarkerWrap}>
              <View style={styles.userMarkerInner}>
                <IconSymbol name="person.fill" size={16} color="#ffffff" />
              </View>
            </View>
          </Marker>
        )}

        {evacuationLocations.map((site) => {
          const isNearest = nearestEvacuationId === site.id;
          return (
            <Marker
              key={site.id}
              coordinate={{
                latitude: site.latitude,
                longitude: site.longitude,
              }}
              title={site.name}
              description={`${site.district} evacuation site`}
              // Keep view-based markers from disappearing when clustering/zooming.
              tracksViewChanges={true}
              onPress={() =>
                onMarkerPress?.({ type: "evacuation", data: site })
              }
            >
              <IconSymbol
                name="building"
                size={22}
                color={isNearest ? "#d97706" : "#ea580c"}
              />
            </Marker>
          );
        })}

        {weatherMarkers.map((weather) => {
          const markerIconSource =
            weather.weatherIconUrl && weather.weatherIconUrl.trim().length > 0
              ? { uri: weather.weatherIconUrl }
              : null;
          return (
            <Marker
              key={weather.id}
              coordinate={{
                latitude: weather.latitude,
                longitude: weather.longitude,
              }}
              title={`${weather.barangay} Weather`}
              description={`${weather.weatherLabel}${weather.forecastTimeLabel ? ` at ${weather.forecastTimeLabel}` : ""}${weather.temperatureC !== null ? `, ${weather.temperatureC}\u00B0C` : ""}`}
              // Keep weather markers out of evac clustering.
              // @ts-expect-error cluster prop comes from react-native-map-clustering
              cluster={false}
              onPress={() =>
                onMarkerPress?.({ type: "weather", data: weather })
              }
              tracksViewChanges={true}
            >
              {markerIconSource ? (
                <Image
                  source={markerIconSource}
                  style={styles.weatherMarkerIcon}
                  resizeMode="contain"
                />
              ) : (
                <IconSymbol
                  name="cloud-outline"
                  size={28}
                  color={weatherPinColor(weather.weatherLabel)}
                />
              )}
            </Marker>
          );
        })}

        {crimeData.map((crime, index) => (
          <Marker
            key={`crime-${index}`}
            coordinate={{ latitude: crime.lat, longitude: crime.lng }}
            title={`Crime Report ${index + 1}`}
            description={crime.date || "Recent incident"}
            tracksViewChanges={false}
            // Keep crime markers out of evac clustering.
            // @ts-expect-error cluster prop comes from react-native-map-clustering
            cluster={false}
            pinColor="red"
            onPress={() => onMarkerPress?.({ type: "crime", data: crime })}
          />
        ))}
      </MapView>

      {isLoadingCrimeData && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={TealColors.primary} />
          <ThemedText style={styles.loadingText}>
            Loading crime data...
          </ThemedText>
        </View>
      )}
    </View>
  );
}

export const GoogleMap = React.memo(GoogleMapComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "visible",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    zIndex: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  userMarkerWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(14, 116, 255, 0.24)",
    justifyContent: "center",
    alignItems: "center",
  },
  userMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0E74FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  weatherMarkerIcon: {
    width: 36,
    height: 36,
  },
});
