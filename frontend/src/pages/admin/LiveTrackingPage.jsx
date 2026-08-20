import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { MapView } from "@/components/MapView";
import { connectWS } from "@/lib/ws";
import { Badge } from "@/components/ui/badge";

export default function LiveTrackingPage() {
  const [trips, setTrips] = useState([]);
  const [selected, setSelected] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [positions, setPositions] = useState({}); // trip_id -> {lat,lng,ts}

  const load = async () => {
    const { data } = await api.get("/trips/active");
    setTrips(data);
    if (!selected && data.length) setSelected(data[0]);
  };
  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const conn = connectWS(
      (msg) => {
        if (msg.type === "location:update") {
          setPositions((p) => ({ ...p, [msg.trip_id]: { latitude: msg.latitude, longitude: msg.longitude, ts: msg.timestamp } }));
        }
        if (msg.type === "trip:started" || msg.type === "trip:ended") load();
      },
      setWsStatus
    );
    return () => conn.close();
  }, []);

  const selectedStops = selected?.route ? undefined : undefined;
  const [selectedFull, setSelectedFull] = useState(null);
  useEffect(() => {
    if (!selected) { setSelectedFull(null); return; }
    api.get(`/trips/${selected.id}`).then((r) => setSelectedFull(r.data));
  }, [selected?.id]);

  const busPos = positions[selected?.id] || selectedFull?.latest_location;

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="overline">Real-Time</div>
            <h1 className="heading text-4xl font-black mt-2">Live Tracking</h1>
          </div>
          <Badge variant={wsStatus === "connected" ? "default" : "secondary"} data-testid="ws-status">
            <span className={wsStatus === "connected" ? "live-dot mr-2" : "mr-2"} />
            WS {wsStatus}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-2">
            {trips.length === 0 && <div className="border border-border rounded-lg p-6 text-sm text-muted-foreground bg-card">No active trips right now.</div>}
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                data-testid={`live-trip-${t.bus?.bus_number}`}
                className={`w-full text-left border rounded-lg p-4 bg-card ${selected?.id === t.id ? "border-primary" : "border-border hover:border-primary/50"}`}
                style={{ transition: "border-color 0.2s ease" }}
              >
                <div className="flex items-center justify-between">
                  <div className="mono text-sm font-semibold">{t.bus?.bus_number}</div>
                  <span className="live-dot" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t.route?.route_name}</div>
                <div className="text-xs mono mt-1">{t.driver?.name}</div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-3 border border-border rounded-lg overflow-hidden bg-card" style={{ height: "70vh" }}>
            {selectedFull ? (
              <MapView stops={selectedFull.stops || []} busPosition={busPos} height="100%" />
            ) : (
              <div className="h-full grid place-items-center text-muted-foreground">Select an active trip</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
