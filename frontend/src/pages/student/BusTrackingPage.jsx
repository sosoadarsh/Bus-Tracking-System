import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { MapView } from "@/components/MapView";
import { connectWS } from "@/lib/ws";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Locate, Hand, QrCode, Check, Bell } from "lucide-react";
import { toast } from "sonner";

const KM_PER_MIN = 0.5;

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
  const [boardOpen, setBoardOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [myBoarded, setMyBoarded] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "denied");
  const myRequestsRef = useRef([]);
  useEffect(() => { myRequestsRef.current = myRequests; }, [myRequests]);

  const askNotifPerm = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
    } else {
      setNotifPerm(Notification.permission);
    }
  };

  const reloadRequests = async () => {
    try {
      const { data } = await api.get(`/trips/${tripId}/boarding-requests`);
      setMyRequests(data.items || []);
    } catch (_) {}
  };
  useEffect(() => {
    api.get(`/trips/${tripId}`).then((r) => {
      setTrip(r.data);
      if (r.data.latest_location) setPos({ latitude: r.data.latest_location.latitude, longitude: r.data.latest_location.longitude, ts: r.data.latest_location.timestamp });
    });
    reloadRequests();
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
        if (msg.type === "boarding:ack" && msg.trip_id === tripId) {
          reloadRequests();
        }
        if (msg.type === "alert:approaching" && msg.trip_id === tripId) {
          const subscribed = myRequestsRef.current.some((r) => r.stop_id === msg.target_stop_id && r.status === "pending");
          if (subscribed) {
            toast.warning(`Bus is 2 stops away — get ready at ${msg.target_stop_name}`, {
              description: `Currently approaching ${msg.next_stop_name}`,
              duration: 8000,
            });
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try { new Notification("Your bus is 2 stops away", { body: `Get ready at ${msg.target_stop_name}` }); } catch (_) {}
            }
          }
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

  const requestBoard = async (stop) => {
    try {
      await api.post(`/trips/${tripId}/boarding-requests`, { stop_id: stop.id });
      toast.success(`Notified driver: ${stop.stop_name}`);
      setBoardOpen(false);
      reloadRequests();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const submitScan = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/attendance/scan", { bus_number: scanCode });
      if (data.already) toast.info("Already checked in on this bus"); else toast.success(`Checked in on ${data.bus_number}`);
      setMyBoarded(true);
      setScanOpen(false);
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="min-h-screen relative bg-background">
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between gap-2 flex-wrap">
        <Link to="/student"><Button variant="secondary" size="sm" data-testid="back-btn"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <div data-testid="ws-status" className="glass rounded-full px-3 py-1.5 text-xs mono flex items-center gap-2">
          <span className={wsStatus === "connected" ? "live-dot" : ""} />
          {trip?.bus?.bus_number} · {wsStatus}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setFollowBus((v) => !v)} data-testid="center-btn"><Locate className="w-4 h-4 mr-2" />{followBus ? "Unfollow" : "Center"}</Button>
          <Button
            variant={notifPerm === "granted" ? "secondary" : "outline"}
            size="sm"
            onClick={askNotifPerm}
            data-testid="notif-btn"
            title={notifPerm === "granted" ? "Alerts on" : "Enable browser alerts"}
          >
            <Bell className="w-4 h-4 mr-2" />{notifPerm === "granted" ? "Alerts on" : "Alerts"}
          </Button>
          <Button size="sm" onClick={() => setBoardOpen(true)} data-testid="request-board-btn"><Hand className="w-4 h-4 mr-2" />Request board</Button>
          <Button variant={myBoarded ? "secondary" : "default"} size="sm" disabled={!trip} onClick={() => { setScanCode(trip?.bus?.bus_number || ""); setScanOpen(true); }} data-testid="scan-qr-btn">
            {myBoarded ? <><Check className="w-4 h-4 mr-2" />Boarded</> : <><QrCode className="w-4 h-4 mr-2" />Scan QR</>}
          </Button>
        </div>
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
          {myRequests.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              Your requests: {myRequests.map((r) => <span key={r.id} className="mr-2 mono">{r.stop_name} · {r.status}</span>)}
            </div>
          )}
          <div className="mt-3 text-xs text-muted-foreground">ETA is approximate — based on distance & average city speed.</div>
        </div>
      </div>

      <Dialog open={boardOpen} onOpenChange={setBoardOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request boarding — pick your stop</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(trip?.stops || []).map((s) => (
              <button
                key={s.id}
                onClick={() => requestBoard(s)}
                className="w-full flex items-center justify-between border border-border rounded-md px-3 py-2 hover:border-primary/50 hover:bg-muted"
                style={{ transition: "border-color 0.2s ease, background-color 0.2s ease" }}
                data-testid={`request-stop-${s.stop_name}`}
              >
                <div className="flex items-center gap-3">
                  <span className="mono text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground">#{s.stop_order}</span>
                  <span className="font-medium">{s.stop_name}</span>
                </div>
                <Hand className="w-4 h-4" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Scan boarding QR</DialogTitle></DialogHeader>
          <form onSubmit={submitScan} className="space-y-4">
            <div className="text-sm text-muted-foreground">Type the code shown on the bus QR (e.g., <span className="mono">BUS-01</span>). This checks you in on the current trip.</div>
            <Input placeholder="BUS-01" required value={scanCode} onChange={(e) => setScanCode(e.target.value)} data-testid="scan-input" />
            <DialogFooter><Button type="submit" data-testid="submit-scan-btn"><QrCode className="w-4 h-4 mr-2" />Check in</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
