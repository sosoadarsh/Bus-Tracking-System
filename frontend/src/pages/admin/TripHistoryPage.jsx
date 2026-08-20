import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";

function duration(s, e) {
  if (!s) return "—";
  const start = new Date(s); const end = e ? new Date(e) : new Date();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  return `${mins} min`;
}

export default function TripHistoryPage() {
  const [trips, setTrips] = useState([]);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const q = status ? `?status=${status}` : "";
    api.get(`/trips${q}`).then((r) => setTrips(r.data));
  }, [status]);

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div><div className="overline">Records</div><h1 className="heading text-4xl font-black mt-2">Trip History</h1></div>
          <div className="flex gap-2 text-sm">
            {["","ACTIVE","COMPLETED","CANCELLED"].map((s) => (
              <button key={s || "all"} onClick={() => setStatus(s)} data-testid={`filter-${s || "all"}`} className={`px-3 py-1.5 rounded-full border ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`} style={{ transition: "background-color 0.2s ease, border-color 0.2s ease" }}>
                {s || "All"}
              </button>
            ))}
          </div>
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>{["Bus","Driver","Route","Started","Ended","Duration","Status"].map((h) => <th key={h} className="px-4 py-3 overline">{h}</th>)}</tr>
            </thead>
            <tbody>
              {trips.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No trips.</td></tr>}
              {trips.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 mono font-semibold">{t.bus?.bus_number}</td>
                  <td className="px-4 py-3">{t.driver?.name}</td>
                  <td className="px-4 py-3">{t.route?.route_name}</td>
                  <td className="px-4 py-3 mono text-xs text-muted-foreground">{t.start_time ? new Date(t.start_time).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 mono text-xs text-muted-foreground">{t.end_time ? new Date(t.end_time).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 mono">{duration(t.start_time, t.end_time)}</td>
                  <td className="px-4 py-3"><Badge variant={t.status === "ACTIVE" ? "default" : t.status === "COMPLETED" ? "secondary" : "destructive"}>{t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
