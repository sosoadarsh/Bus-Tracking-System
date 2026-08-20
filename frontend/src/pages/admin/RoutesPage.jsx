import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [stopOpen, setStopOpen] = useState(false);
  const [routeForm, setRouteForm] = useState({ route_name: "", description: "", start_location: "", end_location: "" });
  const [stopForm, setStopForm] = useState({ stop_name: "", latitude: 21.1458, longitude: 79.0882, stop_order: 1 });

  const load = () => api.get("/routes").then((r) => setRoutes(r.data));
  useEffect(() => { load(); }, []);

  const saveRoute = async (e) => {
    e.preventDefault();
    try { await api.post("/routes", routeForm); toast.success("Route created"); setOpen(false); setRouteForm({ route_name: "", description: "", start_location: "", end_location: "" }); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };
  const delRoute = async (id) => {
    if (!window.confirm("Delete route and all its stops?")) return;
    try { await api.delete(`/routes/${id}`); toast.success("Deleted"); load(); } catch (err) { toast.error(formatApiError(err)); }
  };
  const addStop = async (e) => {
    e.preventDefault();
    try { await api.post(`/routes/${selected.id}/stops`, stopForm); toast.success("Stop added"); setStopOpen(false); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };
  const delStop = async (id) => {
    try { await api.delete(`/stops/${id}`); toast.success("Stop deleted"); load(); } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div><div className="overline">Network</div><h1 className="heading text-4xl font-black mt-2">Routes & Stops</h1></div>
          <Button onClick={() => setOpen(true)} data-testid="add-route-btn"><Plus className="w-4 h-4 mr-2" />Add Route</Button>
        </div>
        <div className="grid gap-4">
          {routes.length === 0 && <div className="text-muted-foreground border border-border rounded-lg p-10 text-center bg-card">No routes yet. Create one to get started.</div>}
          {routes.map((r) => (
            <div key={r.id} className="border border-border rounded-lg p-6 bg-card" data-testid={`route-card-${r.route_name}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="heading text-2xl font-black">{r.route_name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{r.start_location} → {r.end_location}</div>
                  {r.description && <p className="text-sm mt-2">{r.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setSelected(r); setStopForm({ stop_name: "", latitude: 21.1458, longitude: 79.0882, stop_order: (r.stops?.length || 0) + 1 }); setStopOpen(true); }} data-testid={`add-stop-${r.route_name}`}><Plus className="w-4 h-4 mr-1" />Stop</Button>
                  <Button variant="ghost" size="sm" onClick={() => delRoute(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="mt-4 grid md:grid-cols-2 gap-2">
                {(r.stops || []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="mono text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground">#{s.stop_order}</span>
                      <div>
                        <div className="text-sm font-medium">{s.stop_name}</div>
                        <div className="text-xs mono text-muted-foreground">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => delStop(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                {(!r.stops || r.stops.length === 0) && <div className="text-sm text-muted-foreground">No stops on this route.</div>}
              </div>
            </div>
          ))}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Route</DialogTitle></DialogHeader>
            <form onSubmit={saveRoute} className="space-y-4">
              <div><Label>Route name</Label><Input required value={routeForm.route_name} onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })} data-testid="route-name-input" /></div>
              <div><Label>Start location</Label><Input required value={routeForm.start_location} onChange={(e) => setRouteForm({ ...routeForm, start_location: e.target.value })} data-testid="route-start-input" /></div>
              <div><Label>End location</Label><Input required value={routeForm.end_location} onChange={(e) => setRouteForm({ ...routeForm, end_location: e.target.value })} data-testid="route-end-input" /></div>
              <div><Label>Description</Label><Input value={routeForm.description} onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })} /></div>
              <DialogFooter><Button type="submit" data-testid="save-route-btn">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={stopOpen} onOpenChange={setStopOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Stop · {selected?.route_name}</DialogTitle></DialogHeader>
            <form onSubmit={addStop} className="space-y-4">
              <div><Label>Stop name</Label><Input required value={stopForm.stop_name} onChange={(e) => setStopForm({ ...stopForm, stop_name: e.target.value })} data-testid="stop-name-input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Latitude</Label><Input type="number" step="0.0001" required value={stopForm.latitude} onChange={(e) => setStopForm({ ...stopForm, latitude: parseFloat(e.target.value) })} data-testid="stop-lat-input" /></div>
                <div><Label>Longitude</Label><Input type="number" step="0.0001" required value={stopForm.longitude} onChange={(e) => setStopForm({ ...stopForm, longitude: parseFloat(e.target.value) })} data-testid="stop-lng-input" /></div>
              </div>
              <div><Label>Order</Label><Input type="number" min={1} required value={stopForm.stop_order} onChange={(e) => setStopForm({ ...stopForm, stop_order: parseInt(e.target.value || "1", 10) })} /></div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Tip: use Google Maps to pick coordinates.</div>
              <DialogFooter><Button type="submit" data-testid="save-stop-btn">Add Stop</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
