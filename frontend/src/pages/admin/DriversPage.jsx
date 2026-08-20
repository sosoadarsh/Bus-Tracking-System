import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function DriversPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "driver123", phone: "", license_number: "" });

  const load = () => api.get("/drivers").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try { await api.post("/drivers", form); toast.success("Driver created"); setOpen(false); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };
  const del = async (id) => {
    if (!window.confirm("Delete driver?")) return;
    try { await api.delete(`/drivers/${id}`); toast.success("Driver deleted"); load(); } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div><div className="overline">People</div><h1 className="heading text-4xl font-black mt-2">Drivers</h1></div>
          <Button onClick={() => setOpen(true)} data-testid="add-driver-btn"><Plus className="w-4 h-4 mr-2" />Add Driver</Button>
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>{["Name","Email","Phone","License","Actions"].map((h) => <th key={h} className="px-4 py-3 overline">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No drivers.</td></tr>}
              {rows.map((d) => (
                <tr key={d.id} className="border-t border-border" data-testid={`driver-row-${d.email}`}>
                  <td className="px-4 py-3 font-semibold">{d.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.email}</td>
                  <td className="px-4 py-3 mono">{d.phone || "—"}</td>
                  <td className="px-4 py-3 mono">{d.license_number || "—"}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => del(d.id)} data-testid={`delete-driver-${d.email}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="drv-name" /></div>
              <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="drv-email" /></div>
              <div><Label>Password (initial)</Label><Input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="drv-password" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="drv-phone" /></div>
              <div><Label>License number</Label><Input required value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} data-testid="drv-license" /></div>
              <DialogFooter><Button type="submit" data-testid="save-driver-btn">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
