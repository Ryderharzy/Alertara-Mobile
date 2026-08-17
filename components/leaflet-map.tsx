import { TealColors } from '@/constants/theme';
import type { EvacuationLocation } from '@/data/evacuation-locations';
import type { CrimeDataPoint, UserLocation } from '@/types/crime';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type LatLng = { latitude: number; longitude: number };

type WeatherMarker = {
  id: string;
  barangay: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  weatherLabel: string;
  forecastTimeLabel?: string | null;
};

type LeafletMapProps = {
  coordinates?: LatLng[];
  borderColor?: string;
  userLocation?: UserLocation | null;
  selectedLocation?: LatLng | null;
  editable?: boolean;
  fitBoundary?: boolean;
  crimeData?: CrimeDataPoint[];
  evacuationLocations?: EvacuationLocation[];
  weatherMarkers?: WeatherMarker[];
  nearestEvacuationId?: string | null;
  isLoadingCrimeData?: boolean;
  clusteringEnabled?: boolean;
  routePath?: LatLng[] | null;
  onMapReady?: () => void;
  onMapPress?: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onLocationChange?: (coordinate: LatLng) => void;
  onMarkerPress?: (marker: any) => void;
  focusTarget?: (LatLng & { zoomDelta?: number; key: string }) | null;
};

const QC_CENTER: LatLng = { latitude: 14.6507, longitude: 121.0494 };
const EMPTY_COORDINATES: LatLng[] = [];
const EMPTY_CRIME_DATA: CrimeDataPoint[] = [];
const EMPTY_EVACUATION_LOCATIONS: EvacuationLocation[] = [];
const EMPTY_WEATHER_MARKERS: WeatherMarker[] = [];

function weatherColor(label: string) {
  const text = label.toLowerCase();
  if (text.includes('thunder')) return '#7C3AED';
  if (text.includes('rain') || text.includes('drizzle')) return '#2563EB';
  if (text.includes('mist') || text.includes('fog')) return '#64748B';
  if (text.includes('clear')) return '#F59E0B';
  if (text.includes('cloud') || text.includes('overcast')) return '#94A3B8';
  return '#F59E0B';
}

function zoomForDelta(delta?: number) {
  if (!delta) return 15;
  if (delta <= 0.008) return 17;
  if (delta <= 0.02) return 15;
  if (delta <= 0.05) return 13;
  return 11;
}

export function LeafletMap({
  coordinates = EMPTY_COORDINATES,
  borderColor = '#60A5FA',
  userLocation = null,
  selectedLocation = null,
  editable = false,
  fitBoundary = true,
  crimeData = EMPTY_CRIME_DATA,
  evacuationLocations = EMPTY_EVACUATION_LOCATIONS,
  weatherMarkers = EMPTY_WEATHER_MARKERS,
  nearestEvacuationId = null,
  isLoadingCrimeData = false,
  clusteringEnabled = true,
  routePath = null,
  onMapReady,
  onMapPress,
  onInteractionStart,
  onInteractionEnd,
  onLocationChange,
  onMarkerPress,
  focusTarget,
}: LeafletMapProps) {
  const webViewRef = useRef<WebView>(null);
  const initialSelectedLocationRef = useRef(selectedLocation);
  const initialFocusRef = useRef(focusTarget);
  const readyNotifiedRef = useRef(false);
  const loadErrorRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const focusLatitude = focusTarget?.latitude;
  const focusLongitude = focusTarget?.longitude;
  const focusZoomDelta = focusTarget?.zoomDelta;
  const focusKey = focusTarget?.key;

  const mapData = useMemo(() => ({
    boundary: coordinates,
    borderColor,
    userLocation,
    crimeData,
    evacuationLocations,
    weatherMarkers: weatherMarkers.map((weather) => ({
      ...weather,
      color: weatherColor(weather.weatherLabel),
    })),
    nearestEvacuationId,
    clusteringEnabled,
    useClustering:
      clusteringEnabled && (crimeData.length > 0 || evacuationLocations.length > 0),
    routePath: routePath || [],
    fitBoundary,
    initialCenter: initialSelectedLocationRef.current || userLocation || QC_CENTER,
    initialSelectedLocation: initialSelectedLocationRef.current,
    initialEditable: editable,
    initialFocus: initialFocusRef.current
      ? {
          ...initialFocusRef.current,
          zoom: zoomForDelta(initialFocusRef.current.zoomDelta),
        }
      : null,
  }), [
    borderColor,
    clusteringEnabled,
    coordinates,
    crimeData,
    editable,
    evacuationLocations,
    fitBoundary,
    nearestEvacuationId,
    routePath,
    userLocation,
    weatherMarkers,
  ]);

  const html = useMemo(() => {
    const serialized = JSON.stringify(mapData).replace(/</g, '\\u003c');
    const clusterStyles = mapData.useClustering
      ? `<link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css'>
<link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css'>`
      : '';
    const clusterScript = mapData.useClustering
      ? `<script src='https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'><\/script>`
      : '';
    return `<!doctype html>
<html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no'>
<link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'>
${clusterStyles}
<style>
html,body,#map{height:100%;width:100%;margin:0;background:#e8eff1}*{box-sizing:border-box}
.leaflet-control-attribution{font:10px system-ui,sans-serif}.pin{width:24px;height:24px;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.35)}
.pin>span{display:block;width:8px;height:8px;margin:5px;border-radius:50%;background:#fff}.dot{width:18px;height:18px;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 7px rgba(0,0,0,.35)}
</style></head><body><div id=map></div>
<script src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'></script>
${clusterScript}
<script>
const post=(payload)=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(payload));
window.onerror=(message)=>{post({type:'error',message:String(message||'Map script failed')});return true;};
window.addEventListener('unhandledrejection',event=>post({type:'error',message:String(event.reason||'Map setup failed')}));
const data=${serialized};
const boundary=(data.boundary||[]).map(point=>[point.latitude,point.longitude]);
const center=data.initialCenter||{latitude:14.6507,longitude:121.0494};
const map=L.map('map',{minZoom:10,preferCanvas:true,zoomAnimation:true,fadeAnimation:false,markerZoomAnimation:false,inertia:true,inertiaDeceleration:3000,inertiaMaxSpeed:1500,easeLinearity:.25,tapTolerance:20}).setView([center.latitude,center.longitude],15);
const vectorRenderer=L.canvas({padding:.5});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,maxNativeZoom:19,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:3,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'}).addTo(map);
const safe=(value)=>String(value||'').replace(/[&<>]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char])).replace(/\u0022/g,'&quot;').replace(/\u0027/g,'&#39;');
const icon=(color,pin=false)=>L.divIcon({className:'',html:pin?'<div class=pin style=background:'+color+'><span></span></div>':'<div class=dot style=background:'+color+'></div>',iconSize:pin?[24,24]:[18,18],iconAnchor:pin?[12,24]:[9,9]});
if(boundary.length>2){L.polygon(boundary,{renderer:vectorRenderer,interactive:false,smoothFactor:2,color:data.borderColor||'#60A5FA',weight:3,fillColor:'#60A5FA',fillOpacity:.10}).addTo(map);if(data.fitBoundary)map.fitBounds(boundary,{padding:[24,24]});}
const route=(data.routePath||[]).map(point=>[point.latitude,point.longitude]);
if(route.length>1)L.polyline(route,{color:'${TealColors.primary}',weight:5,dashArray:'14 8'}).addTo(map);
if(data.userLocation){L.marker([data.userLocation.latitude,data.userLocation.longitude],{icon:icon('#0E74FF',true)}).addTo(map).bindTooltip('You are here').on('click',()=>post({type:'marker',markerType:'user'}));}
const markerLayer=data.useClustering&&L.markerClusterGroup?L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:48}):L.layerGroup();
(data.evacuationLocations||[]).forEach((site,index)=>{const color=site.id===data.nearestEvacuationId?'#D97706':'#EA580C';L.marker([site.latitude,site.longitude],{icon:icon(color)}).bindTooltip(safe(site.name)).on('click',()=>post({type:'marker',markerType:'evacuation',index})).addTo(markerLayer);});
markerLayer.addTo(map);
(data.weatherMarkers||[]).forEach((weather,index)=>L.marker([weather.latitude,weather.longitude],{icon:icon(weather.color)}).addTo(map).bindTooltip(safe(weather.barangay+' - '+weather.weatherLabel)).on('click',()=>post({type:'marker',markerType:'weather',index})));
(data.crimeData||[]).forEach((crime,index)=>L.marker([crime.lat,crime.lng],{icon:icon('#DC2626')}).addTo(map).bindTooltip('Crime report').on('click',()=>post({type:'marker',markerType:'crime',index})));
let selectedMarker=null;let editable=!!data.initialEditable;
window.setSelectedLocation=(lat,lng)=>{if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const point=L.latLng(lat,lng);if(selectedMarker)selectedMarker.setLatLng(point);else selectedMarker=L.marker(point,{icon:icon('${TealColors.primary}',true),draggable:editable}).addTo(map);selectedMarker.dragging&&(editable?selectedMarker.dragging.enable():selectedMarker.dragging.disable());selectedMarker.off('dragend');selectedMarker.on('dragend',event=>{const next=event.target.getLatLng();post({type:'location',latitude:next.lat,longitude:next.lng});});if(!map.getBounds().pad(-.15).contains(point))map.panTo(point,{animate:true,duration:.35});};
window.setEditable=(value)=>{editable=!!value;if(selectedMarker&&selectedMarker.dragging){editable?selectedMarker.dragging.enable():selectedMarker.dragging.disable();}};
window.focusLocation=(lat,lng,zoom)=>map.flyTo([lat,lng],zoom||15,{duration:.7});
if(data.initialSelectedLocation)window.setSelectedLocation(data.initialSelectedLocation.latitude,data.initialSelectedLocation.longitude);
if(data.initialFocus)window.focusLocation(data.initialFocus.latitude,data.initialFocus.longitude,data.initialFocus.zoom);
map.on('click',event=>{post({type:'mapPress'});if(!editable)return;window.setSelectedLocation(event.latlng.lat,event.latlng.lng);post({type:'location',latitude:event.latlng.lat,longitude:event.latlng.lng});});
setTimeout(()=>{map.invalidateSize();post({type:'ready'});},80);
</script></body></html>`;
  }, [mapData]);

  useEffect(() => {
    if (!ready || !selectedLocation) return;
    webViewRef.current?.injectJavaScript(
      `window.setSelectedLocation(${selectedLocation.latitude},${selectedLocation.longitude});true;`,
    );
  }, [ready, selectedLocation]);

  useEffect(() => {
    if (!ready) return;
    webViewRef.current?.injectJavaScript(`window.setEditable(${editable ? 'true' : 'false'});true;`);
  }, [editable, ready]);

  useEffect(() => {
    if (!ready || focusLatitude == null || focusLongitude == null) return;
    webViewRef.current?.injectJavaScript(
      `window.focusLocation(${focusLatitude},${focusLongitude},${zoomForDelta(focusZoomDelta)});true;`,
    );
  }, [focusKey, focusLatitude, focusLongitude, focusZoomDelta, ready]);

  useEffect(() => {
    if (ready || loadError) return;
    const timer = setTimeout(() => {
      const message = 'The map service took too long to respond.';
      loadErrorRef.current = message;
      setLoadError(message);
    }, 8000);
    return () => clearTimeout(timer);
  }, [loadError, ready]);

  const notifyMapReady = () => {
    if (readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    onMapReady?.();
  };

  const markMapReady = () => {
    loadErrorRef.current = null;
    setLoadError(null);
    setReady(true);
    notifyMapReady();
  };

  const handleDocumentLoad = () => {
    if (loadErrorRef.current) return;
    setReady(true);
    notifyMapReady();
  };

  const handleLoadStart = () => {
    readyNotifiedRef.current = false;
    loadErrorRef.current = null;
    setLoadError(null);
    setReady(false);
  };

  const handleMapError = (message: string) => {
    const readableMessage = message || 'The map could not be loaded.';
    loadErrorRef.current = readableMessage;
    setLoadError(readableMessage);
    setReady(false);
  };

  const retryMap = () => {
    handleLoadStart();
    webViewRef.current?.reload();
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'ready') {
        markMapReady();
      } else if (message.type === 'error') {
        handleMapError(String(message.message || 'The map script could not start.'));
      } else if (message.type === 'mapPress') {
        onMapPress?.();
      } else if (message.type === 'location') {
        onLocationChange?.({ latitude: Number(message.latitude), longitude: Number(message.longitude) });
      } else if (message.type === 'marker') {
        const collections: Record<string, any[]> = {
          user: userLocation ? [userLocation] : [],
          evacuation: evacuationLocations,
          weather: weatherMarkers,
          crime: crimeData,
        };
        const item = collections[message.markerType]?.[Number(message.index || 0)];
        if (item) onMarkerPress?.({ type: message.markerType, data: item });
      }
    } catch {
      // Ignore malformed WebView messages.
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://www.openstreetmap.org/' }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        mixedContentMode={'never'}
        nestedScrollEnabled
        overScrollMode="never"
        androidLayerType="hardware"
        onTouchStart={onInteractionStart}
        onTouchEnd={onInteractionEnd}
        onTouchCancel={onInteractionEnd}
        onMessage={handleMessage}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleDocumentLoad}
        onError={(event) => handleMapError(event.nativeEvent.description)}
      />
      {loadError ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Map unavailable</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable style={styles.retryButton} onPress={retryMap}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (!ready || isLoadingCrimeData) ? (
        <View pointerEvents={'none'} style={styles.loadingOverlay}>
          <ActivityIndicator size={'large'} color={TealColors.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  map: { flex: 1, backgroundColor: '#e8eff1' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 249, 250, 0.9)',
  },
  loadingText: { marginTop: 10, color: '#36545b', fontSize: 14, fontWeight: '600' },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(245, 249, 250, 0.96)',
  },
  errorTitle: { color: '#20383e', fontSize: 16, fontWeight: '700' },
  errorText: {
    marginTop: 6,
    color: '#526970',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 88,
    minHeight: 40,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: TealColors.primary,
  },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
