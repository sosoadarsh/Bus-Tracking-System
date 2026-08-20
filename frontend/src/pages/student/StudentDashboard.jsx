import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bus, ArrowRight } from "lucide-react";

export default function StudentDashboard() {
  const [buses, setBuses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([api.get("/buses"), api.get("/trips?status=ACTIVE"), api.get("/routes")])
      .then(([b, t, r]) => { setBuses(b.data); setTrips(t.data); setRoutes(r.data); });
    const int = setInterval(() => api.get("/trips?status=ACTIVE").then((t) => setTrips(t.data)).catch(() => {}), 6000);
    return () => clearInterval(int);
  }, []);

  const activeByBus = new Map(trips.map((t) => [t.bus_id, t]));
  const filtered = buses.filter((b) => (b.bus_number + " " + b.registration_number).toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="overline">Passenger</div>
            <h1 className="heading text-4xl font-black mt-2">Available Buses</h1>
            <p className="text-muted-foreground mt-2">Tap a live bus to track it on the map.</p>
          </div>
          <Input placeholder="Search bus…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" data-testid="student-search" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="student-buses-grid">
          {filtered.length === 0 && <div className="col-span-full border border-border rounded-lg p-10 text-center text-muted-foreground bg-card">No buses match your search.</div>}
          {filtered.map((b) => {
            const trip = activeByBus.get(b.id);
            const isLive = !!trip;
            return (
              <div key={b.id} className="border border-border rounded-lg p-6 bg-card hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg" style={{ transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease" }} data-testid={`student-bus-${b.bus_number}`}>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-md bg-primary flex items-center justify-center text-primary-foreground"><Bus className="w-5 h-5" /></div>
                  {isLive ? <Badge><span className="live-dot mr-2" />LIVE</Badge> : <Badge variant="secondary">{b.status === "MAINTENANCE" ? "MAINTENANCE" : "OFFLINE"}</Badge>}
                </div>
                <div className="heading text-3xl font-black mt-4 mono">{b.bus_number}</div>
                <div className="text-xs mono text-muted-foreground mt-1">{b.registration_number}</div>
                <div className="text-sm mt-3 text-muted-foreground">
                  {isLive ? <>Route: <span className="text-foreground font-medium">{trip.route?.route_name}</span></> : "Not currently running"}
                </div>
                <div className="mt-4">
                  {isLive ? (
                    <Link to={`/student/track/${trip.id}`} data-testid={`track-btn-${b.bus_number}`} className="inline-flex items-center text-primary font-semibold text-sm">Track live <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Waiting for driver to start</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
