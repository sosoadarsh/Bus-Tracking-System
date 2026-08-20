import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons under bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const busIcon = L.divIcon({
  className: "bus-marker",
  html: `<div style="background:#E63946;color:#fff;border:2px solid #fff;border-radius:8px;padding:4px 8px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;box-shadow:0 4px 16px rgba(230,57,70,0.5);white-space:nowrap;">● BUS</div>`,
  iconSize: [50, 24],
  iconAnchor: [25, 12],
});

const stopIcon = L.divIcon({
  className: "stop-marker",
  html: `<div style="width:14px;height:14px;background:#007AFF;border:3px solid #fff;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function MapView({ center = [21.1458, 79.0882], zoom = 13, stops = [], busPosition = null, followBus = true, height = "100%" }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const busMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const stopMarkersRef = useRef([]);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // stops + polyline
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }

    if (stops && stops.length) {
      stops.forEach((s) => {
        const marker = L.marker([s.latitude, s.longitude], { icon: stopIcon })
          .addTo(map)
          .bindPopup(`<b>${s.stop_name}</b><br/>Stop #${s.stop_order}`);
        stopMarkersRef.current.push(marker);
      });
      const pts = stops.map((s) => [s.latitude, s.longitude]);
      routeLineRef.current = L.polyline(pts, { color: "#007AFF", weight: 4, opacity: 0.75, dashArray: "6 6" }).addTo(map);
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [stops]);

  // bus position (smooth-ish)
  useEffect(() => {
    const map = mapRef.current; if (!map || !busPosition) return;
    const pos = [busPosition.latitude, busPosition.longitude];
    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker(pos, { icon: busIcon }).addTo(map);
    } else {
      busMarkerRef.current.setLatLng(pos);
    }
    if (followBus) map.panTo(pos, { animate: true, duration: 0.8 });
  }, [busPosition, followBus]);

  return <div ref={containerRef} style={{ height, width: "100%" }} data-testid="map-view" />;
}
