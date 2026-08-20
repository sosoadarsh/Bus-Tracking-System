import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { MapView } from "@/components/MapView";
import { connectWS } from "@/lib/ws";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Locate } from "lucide-react";

const KM_PER_MIN = 0.5; // ~30 km/h city speed => 0.5 km per minute

function distanceKm(a, b) {
  if (!a || !b) return null;
  const dLat = (b.latitude - a.latitude) * 111;
  const dLng = (b.longitude - a.longitude) * 111 * Math.cos(a.latitude * Math.PI/180);
  return Math.hypot(dLat, dLng);
}

export default function BusTrackingPage() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [pos, setPos] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [followBus, setFollowBus] = useState(true);

  useEffect(() => {
    api.get(`/trips/${tripId}`).then((r) => {
      setTrip(r.data);
      if (r.data.latest_location) setPos({ latitude: r.data.latest_location.latitude, longitude: r.data.latest_location.longitude, ts: r.data.latest_location.timestamp });
    });
  }, [tripId]);

  useEffect(() => {
    const conn = connectWS(
      (msg) => {
        if (msg.type === "location:update" && msg.trip_id === tripId) {
          setPos({ latitude: msg.latitude, longitude: msg.longitude, ts: msg.timestamp });
        }
        if (msg.type === "trip:ended" && msg.trip_id === tripId) {
          api.get(`/trips/${tripId}`).then((r) => setTrip(r.data));
        }
      },
      setWsStatus
    );
    return () => conn.close();
  }, [tripId]);

  const { nextStop, etaMin, distKm } = useMemo(() => {
    if (!pos || !trip?.stops?.length) return { nextStop: null, etaMin: null, distKm: null };
    let best = null; let bestD = Infinity;
    for (const s of trip.stops) {
      const d = distanceKm({ latitude: s.latitude, longitude: s.longitude }, pos);
      if (d < bestD) { bestD = d; best = s; }
    }
    const next = trip.stops.find((s) => s.stop_order > best.stop_order) || best;
    const d = distanceKm({ latitude: next.latitude, longitude: next.longitude }, pos);
    return { nextStop: next, distKm: d, etaMin: d != null ? Math.max(1, Math.round(d / KM_PER_MIN)) : null };
  }, [pos, trip?.stops]);

  return (
    <div className="min-h-screen relative bg-background">
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between gap-2">
        <Link to="/student"><Button variant="secondary" size="sm" data-testid="back-btn"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <div data-testid="ws-status" className="glass rounded-full px-3 py-1.5 text-xs mono flex items-center gap-2">
          <span className={wsStatus === "connected" ? "live-dot" : ""} />
          {trip?.bus?.bus_number} · {wsStatus}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setFollowBus((v) => !v)} data-testid="center-btn"><Locate className="w-4 h-4 mr-2" />{followBus ? "Unfollow" : "Center on Bus"}</Button>
      </div>

      <div className="absolute inset-0">
        {trip ? <MapView stops={trip.stops || []} busPosition={pos} followBus={followBus} height="100vh" /> : null}
      </div>

      <div className="absolute left-0 right-0 bottom-0 p-4 z-[1000]">
        <div className="max-w-2xl mx-auto glass rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="overline">Bus</div>
              <div className="heading text-2xl font-black mt-1 mono">{trip?.bus?.bus_number}</div>
            </div>
            <Badge className="text-sm py-1 px-3">
              {trip?.status === "ACTIVE" ? <><span className="live-dot mr-2" />LIVE</> : trip?.status}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <div className="overline">Next Stop</div>
              <div className="font-semibold mt-1">{nextStop?.stop_name || "—"}</div>
            </div>
            <div>
              <div className="overline">ETA</div>
              <div className="font-semibold mt-1">{etaMin != null ? `~${etaMin} min` : "—"}</div>
              {distKm != null && <div className="text-xs mono text-muted-foreground">{distKm.toFixed(2)} km</div>}
            </div>
            <div>
              <div className="overline">Driver</div>
              <div className="font-semibold mt-1">{trip?.driver?.name || "—"}</div>
              {trip?.start_time && <div className="text-xs mono text-muted-foreground">Started {new Date(trip.start_time).toLocaleTimeString()}</div>}
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">ETA is approximate — based on distance & average city speed.</div>
        </div>
      </div>
    </div>
  );
}
