import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

export default function BusesPage() {
  const [buses, setBuses] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ bus_number: "", registration_number: "", capacity: 40, status: "INACTIVE" });

  const load = () => api.get("/buses").then((r) => setBuses(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ bus_number: "", registration_number: "", capacity: 40, status: "INACTIVE" }); setOpen(true); };
  const openEdit = (b) => { setEditing(b); setForm({ bus_number: b.bus_number, registration_number: b.registration_number, capacity: b.capacity, status: b.status }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/buses/${editing.id}`, form); toast.success("Bus updated"); }
      else { await api.post("/buses", form); toast.success("Bus created"); }
      setOpen(false); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this bus?")) return;
    try { await api.delete(`/buses/${id}`); toast.success("Bus deleted"); load(); } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="overline">Fleet</div>
            <h1 className="heading text-4xl font-black mt-2">Buses</h1>
          </div>
          <Button onClick={openNew} data-testid="add-bus-btn"><Plus className="w-4 h-4 mr-2" />Add Bus</Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                {["Bus #","Registration","Capacity","Status","Actions"].map((h) => <th key={h} className="px-4 py-3 overline">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {buses.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No buses yet.</td></tr>}
              {buses.map((b) => (
                <tr key={b.id} className="border-t border-border" data-testid={`bus-row-${b.bus_number}`}>
                  <td className="px-4 py-3 font-semibold mono">{b.bus_number}</td>
                  <td className="px-4 py-3 mono text-muted-foreground">{b.registration_number}</td>
                  <td className="px-4 py-3">{b.capacity}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.status === "ACTIVE" ? "default" : b.status === "MAINTENANCE" ? "destructive" : "secondary"}>{b.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(b)} data-testid={`edit-bus-${b.bus_number}`}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => del(b.id)} data-testid={`delete-bus-${b.bus_number}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Bus" : "Add Bus"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div><Label>Bus number</Label><Input required value={form.bus_number} onChange={(e) => setForm({ ...form, bus_number: e.target.value })} data-testid="bus-number-input" /></div>
              <div><Label>Registration number</Label><Input required value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} data-testid="bus-reg-input" /></div>
              <div><Label>Capacity</Label><Input type="number" required min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value || "0", 10) })} data-testid="bus-capacity-input" /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="bus-status-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INACTIVE">Inactive / Available</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" data-testid="save-bus-btn">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
