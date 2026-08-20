import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Bus, Users, GraduationCap, Route as RouteIcon, Radio, ShieldAlert } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/stats/overview").then((r) => setStats(r.data));
    const t = setInterval(() => api.get("/stats/overview").then((r) => setStats(r.data)).catch(() => {}), 8000);
    return () => clearInterval(t);
  }, []);

  const cards = [
    { label: "Total Buses", value: stats?.total_buses ?? "—", icon: Bus, accent: "text-primary" },
    { label: "Active Trips", value: stats?.active_trips ?? "—", icon: Radio, accent: "text-emerald-500" },
    { label: "Available Buses", value: stats?.available_buses ?? "—", icon: Bus },
    { label: "Under Maintenance", value: stats?.maintenance_buses ?? "—", icon: ShieldAlert, accent: "text-amber-500" },
    { label: "Total Routes", value: stats?.total_routes ?? "—", icon: RouteIcon },
    { label: "Drivers", value: stats?.total_drivers ?? "—", icon: Users },
    { label: "Students", value: stats?.total_students ?? "—", icon: GraduationCap },
    { label: "Completed Trips", value: stats?.completed_trips ?? "—", icon: Radio },
  ];

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <div className="overline">Operations Overview</div>
          <h1 className="heading text-4xl font-black mt-2">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Real-time view of your college fleet.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-stats-grid">
          {cards.map((c) => (
            <div key={c.label} className="border border-border rounded-lg p-6 bg-card hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg" style={{ transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease" }}>
              <div className="flex items-center justify-between">
                <div className="overline">{c.label}</div>
                <c.icon className={`w-5 h-5 ${c.accent || "text-muted-foreground"}`} />
              </div>
              <div className="heading text-4xl font-black mt-4">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
