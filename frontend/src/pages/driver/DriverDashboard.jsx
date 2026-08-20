import { useEffect, useRef, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Play, Square, MapPin, UserCheck, Hand } from "lucide-react";
import { connectWS } from "@/lib/ws";

export default function DriverDashboard() {
  const [assignment, setAssignment] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [route, setRoute] = useState(null);
  const [demoMode, setDemoMode] = useState(true);
  const [coords, setCoords] = useState(null);
  const [nextStop, setNextStop] = useState(null);
  const [boarding, setBoarding] = useState({ items: [], by_stop: [] });
  const [attendanceCount, setAttendanceCount] = useState(0);
  const watchIdRef = useRef(null);

  const load = async () => {
    const [asg, trips] = await Promise.all([api.get("/assignments"), api.get("/trips?status=ACTIVE")]);
    setAssignment(asg.data[0] || null);
    const myTrip = trips.data[0] || null;
    setActiveTrip(myTrip);
    if (myTrip?.route_id) {
      const r = await api.get(`/trips/${myTrip.id}`);
      setRoute(r.data);
    } else if (asg.data[0]?.route?.id) {
      const r = await api.get(`/routes/${asg.data[0].route.id}`);
      setRoute(r.data);
    }
  };
  useEffect(() => { load(); }, []);

  const loadTripExtras = useCallback(async (tripId) => {
    const [br, att] = await Promise.all([
      api.get(`/trips/${tripId}/boarding-requests`).catch(() => ({ data: { items: [], by_stop: [] } })),
      api.get(`/trips/${tripId}/attendance`).catch(() => ({ data: { count: 0, items: [] } })),
    ]);
    setBoarding(br.data);
    setAttendanceCount(att.data.count || 0);
  }, []);

  useEffect(() => {
    if (!activeTrip) { setBoarding({ items: [], by_stop: [] }); setAttendanceCount(0); return; }
    loadTripExtras(activeTrip.id);
    const t = setInterval(async () => {
      const r = await api.get(`/trips/${activeTrip.id}/location`);
      if (r.data) setCoords({ lat: r.data.latitude, lng: r.data.longitude, ts: r.data.timestamp });
    }, 2000);
    return () => clearInterval(t);
  }, [activeTrip?.id, loadTripExtras]);

  // WebSocket: react to boarding + attendance events for this trip
  useEffect(() => {
    if (!activeTrip) return;
    const conn = connectWS((msg) => {
      if (msg.trip_id !== activeTrip.id) return;
      if (msg.type === "boarding:new") { loadTripExtras(activeTrip.id); toast.info(`${msg.student_name} waiting at ${msg.stop_name}`); }
      if (msg.type === "boarding:ack") { loadTripExtras(activeTrip.id); }
      if (msg.type === "attendance:new") { loadTripExtras(activeTrip.id); toast.success(`${msg.student_name} boarded`); }
    });
    return () => conn.close();
  }, [activeTrip?.id, loadTripExtras]);

  useEffect(() => {
    if (!coords || !route?.stops?.length) return;
    let best = null; let bestDist = Infinity;
    for (const s of route.stops) {
      const d = Math.hypot((s.latitude - coords.lat) * 111, (s.longitude - coords.lng) * 111 * Math.cos(coords.lat * Math.PI/180));
      if (d < bestDist) { bestDist = d; best = s; }
    }
    if (best) {
      const next = route.stops.find((s) => s.stop_order > best.stop_order) || best;
      setNextStop({ ...next, distance_km: bestDist });
    }
  }, [coords, route?.stops]);

  const startTrip = async () => {
    if (!assignment) { toast.error("No assignment yet. Ask admin to assign a bus."); return; }
    try {
      const { data } = await api.post("/trips/start", { assignment_id: assignment.id, demo_mode: demoMode });
      toast.success(demoMode ? "Trip started in DEMO mode" : "Trip started — sharing GPS");
      setActiveTrip(data);
      if (!demoMode) startGPS(data.id);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const endTrip = async () => {
    if (!activeTrip) return;
    try {
      stopGPS();
      await api.post(`/trips/${activeTrip.id}/end`);
      toast.success("Trip ended");
      setActiveTrip(null); setCoords(null); setNextStop(null);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const ackRequest = async (reqId) => {
    try { await api.post(`/trips/${activeTrip.id}/boarding-requests/${reqId}/acknowledge`); loadTripExtras(activeTrip.id); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const startGPS = (tripId) => {
    if (!navigator.geolocation) { toast.error("GPS not available"); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude, ts: new Date().toISOString() });
        try { await api.post(`/trips/${tripId}/location`, { latitude, longitude }); } catch (_) {}
      },
      (err) => toast.error("GPS: " + err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  };
  const stopGPS = () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; };

  const elapsedMin = activeTrip?.start_time ? Math.max(0, Math.round((Date.now() - new Date(activeTrip.start_time)) / 60000)) : 0;
  const pendingCount = boarding.items?.filter((b) => b.status === "pending").length || 0;

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="overline">Driver Console</div>
        <h1 className="heading text-4xl font-black mt-2">Trip Control</h1>

        {!assignment && (
          <div className="mt-8 border border-border rounded-lg p-8 bg-card text-center">
            <div className="text-muted-foreground">No bus assigned yet. Please contact your admin.</div>
          </div>
        )}

        {assignment && (
          <>
            <div className="mt-8 grid md:grid-cols-3 gap-4">
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="overline">Bus</div>
                <div className="heading text-3xl font-black mt-2 mono">{assignment.bus?.bus_number}</div>
                <div className="text-xs mono text-muted-foreground mt-1">{assignment.bus?.registration_number}</div>
              </div>
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="overline">Route</div>
                <div className="heading text-2xl font-black mt-2">{assignment.route?.route_name}</div>
                <div className="text-xs text-muted-foreground mt-1">{assignment.route?.start_location} → {assignment.route?.end_location}</div>
              </div>
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="overline">Status</div>
                <div className="mt-3">
                  {activeTrip ? <Badge className="text-base py-1 px-3"><span className="live-dot mr-2" />ON TRIP · {elapsedMin} min</Badge> : <Badge variant="secondary" className="text-base py-1 px-3">IDLE</Badge>}
                </div>
              </div>
            </div>

            <div className="mt-6 border border-border rounded-lg p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="overline">Trip Controls</div>
                  <div className="text-sm text-muted-foreground mt-1">Start a trip to share your bus location with students in real time.</div>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="demo" className="text-sm">Demo simulation</Label>
                  <Switch id="demo" checked={demoMode} onCheckedChange={setDemoMode} disabled={!!activeTrip} data-testid="demo-mode-switch" />
                </div>
              </div>
              {!activeTrip ? (
                <Button size="lg" className="w-full h-16 text-lg rounded-lg" onClick={startTrip} data-testid="start-trip-btn">
                  <Play className="w-5 h-5 mr-2" /> START TRIP
                </Button>
              ) : (
                <Button size="lg" variant="destructive" className="w-full h-16 text-lg rounded-lg" onClick={endTrip} data-testid="end-trip-btn">
                  <Square className="w-5 h-5 mr-2" /> END TRIP
                </Button>
              )}
            </div>

            {activeTrip && (
              <>
                <div className="mt-6 grid md:grid-cols-4 gap-4">
                  <div className="border border-border rounded-lg p-6 bg-card md:col-span-2">
                    <div className="overline">Current Coordinates</div>
                    <div className="heading text-2xl font-black mt-2 mono">
                      {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Waiting…"}
                    </div>
                    {coords && <div className="text-xs mono text-muted-foreground mt-1">Last update: {new Date(coords.ts).toLocaleTimeString()}</div>}
                  </div>
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <div className="overline">Next Stop</div>
                    <div className="heading text-xl font-black mt-2 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      {nextStop?.stop_name || "—"}
                    </div>
                    {nextStop && <div className="text-xs mono text-muted-foreground mt-1">~{nextStop.distance_km?.toFixed(1)} km</div>}
                  </div>
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <div className="overline flex items-center justify-between">Boarded <UserCheck className="w-4 h-4" /></div>
                    <div className="heading text-4xl font-black mt-2">{attendanceCount}</div>
                    <div className="text-xs text-muted-foreground mt-1">via QR scan</div>
                  </div>
                </div>

                <div className="mt-6 border border-border rounded-lg p-6 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="overline">Boarding Requests</div>
                      <div className="text-sm text-muted-foreground mt-1">Students waiting at upcoming stops</div>
                    </div>
                    <Badge variant={pendingCount ? "default" : "secondary"} className="text-base py-1 px-3"><Hand className="w-4 h-4 mr-2" />{pendingCount} pending</Badge>
                  </div>
                  {(!boarding.by_stop || boarding.by_stop.length === 0) && (
                    <div className="text-sm text-muted-foreground text-center py-6">No boarding requests yet.</div>
                  )}
                  <div className="grid md:grid-cols-2 gap-3">
                    {(boarding.by_stop || []).map((s) => (
                      <div key={s.stop_id} className="border border-border rounded-md p-4 bg-muted/30" data-testid={`boarding-stop-${s.stop_name}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-semibold">{s.stop_name}</div>
                            <div className="text-xs mono text-muted-foreground">{s.pending || 0} waiting · {s.acknowledged || 0} acknowledged</div>
                          </div>
                          <Badge>{s.pending || 0}</Badge>
                        </div>
                        <div className="space-y-1">
                          {s.students.filter((st) => st.status === "pending").map((st) => (
                            <div key={st.id} className="flex items-center justify-between text-sm">
                              <span>{st.name}</span>
                              <Button size="sm" variant="ghost" onClick={() => ackRequest(st.id)} data-testid={`ack-${st.id}`}>Acknowledge</Button>
                            </div>
                          ))}
                          {s.students.filter((st) => st.status === "pending").length === 0 && <div className="text-xs text-muted-foreground italic">All acknowledged.</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
