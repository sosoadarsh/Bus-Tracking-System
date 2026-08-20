import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AssignmentsPage() {
  const [items, setItems] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bus_id: "", driver_id: "", route_id: "" });

  const load = async () => {
    const [a, b, d, r] = await Promise.all([api.get("/assignments"), api.get("/buses"), api.get("/drivers"), api.get("/routes")]);
    setItems(a.data); setBuses(b.data); setDrivers(d.data); setRoutes(r.data);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.bus_id || !form.driver_id || !form.route_id) { toast.error("Select bus, driver and route"); return; }
    try { await api.post("/assignments", form); toast.success("Assigned"); setOpen(false); setForm({ bus_id: "", driver_id: "", route_id: "" }); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };
  const del = async (id) => {
    if (!window.confirm("Delete assignment?")) return;
    try { await api.delete(`/assignments/${id}`); toast.success("Deleted"); load(); } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div><div className="overline">Operations</div><h1 className="heading text-4xl font-black mt-2">Assignments</h1></div>
          <Button onClick={() => setOpen(true)} data-testid="add-assignment-btn"><Plus className="w-4 h-4 mr-2" />New Assignment</Button>
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>{["Bus","Driver","Route","Since","Actions"].map((h) => <th key={h} className="px-4 py-3 overline">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No assignments yet.</td></tr>}
              {items.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold mono">{a.bus?.bus_number || "—"}</td>
                  <td className="px-4 py-3">{a.driver?.name || "—"}</td>
                  <td className="px-4 py-3">{a.route?.route_name || "—"}</td>
                  <td className="px-4 py-3 text-xs mono text-muted-foreground">{a.assigned_date?.slice(0,10)}</td>
                  <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => del(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Assignment</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Bus</Label>
                <Select value={form.bus_id} onValueChange={(v) => setForm({ ...form, bus_id: v })}>
                  <SelectTrigger data-testid="asg-bus-select"><SelectValue placeholder="Choose bus" /></SelectTrigger>
                  <SelectContent>{buses.map((b) => <SelectItem key={b.id} value={b.id}>{b.bus_number} · {b.registration_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Driver</Label>
                <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger data-testid="asg-driver-select"><SelectValue placeholder="Choose driver" /></SelectTrigger>
                  <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Route</Label>
                <Select value={form.route_id} onValueChange={(v) => setForm({ ...form, route_id: v })}>
                  <SelectTrigger data-testid="asg-route-select"><SelectValue placeholder="Choose route" /></SelectTrigger>
                  <SelectContent>{routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.route_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" data-testid="save-assignment-btn">Assign</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
