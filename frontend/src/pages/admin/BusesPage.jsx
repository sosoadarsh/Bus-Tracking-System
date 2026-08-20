import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Plus, QrCode } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 8;

export default function BusesPage() {
  const [buses, setBuses] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [qrBus, setQrBus] = useState(null);
  const [form, setForm] = useState({ bus_number: "", registration_number: "", capacity: 40, status: "INACTIVE" });

  const load = () => api.get("/buses").then((r) => setBuses(r.data));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? buses.filter((b) => (b.bus_number + " " + b.registration_number).toLowerCase().includes(s)) : buses;
  }, [buses, q]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="overline">Fleet</div>
            <h1 className="heading text-4xl font-black mt-2">Buses</h1>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Search bus…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" data-testid="buses-search" />
            <Button onClick={openNew} data-testid="add-bus-btn"><Plus className="w-4 h-4 mr-2" />Add Bus</Button>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                {["Bus #","Registration","Capacity","Status","QR","Actions"].map((h) => <th key={h} className="px-4 py-3 overline">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No buses match.</td></tr>}
              {pageItems.map((b) => (
                <tr key={b.id} className="border-t border-border" data-testid={`bus-row-${b.bus_number}`}>
                  <td className="px-4 py-3 font-semibold mono">{b.bus_number}</td>
                  <td className="px-4 py-3 mono text-muted-foreground">{b.registration_number}</td>
                  <td className="px-4 py-3">{b.capacity}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.status === "ACTIVE" ? "default" : b.status === "MAINTENANCE" ? "destructive" : "secondary"}>{b.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setQrBus(b)} data-testid={`qr-bus-${b.bus_number}`}><QrCode className="w-4 h-4 mr-1" />Show</Button>
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
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} total={filtered.length} testid="buses" />
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

        <Dialog open={!!qrBus} onOpenChange={(o) => !o && setQrBus(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Boarding QR · {qrBus?.bus_number}</DialogTitle></DialogHeader>
            {qrBus && (
              <div className="text-center space-y-4">
                <div className="border border-border rounded-lg p-4 bg-white inline-block">
                  <img
                    alt={`QR for ${qrBus.bus_number}`}
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrBus.bus_number)}&size=300x300&margin=4`}
                    width={280}
                    height={280}
                  />
                </div>
                <div>
                  <div className="overline">Bus code</div>
                  <div className="heading text-3xl font-black mono mt-1">{qrBus.bus_number}</div>
                  <div className="text-xs text-muted-foreground mt-2">Print & paste at the bus door. Students scan or type this code to mark attendance.</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function Pagination({ page, totalPages, onChange, total, testid }) {
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
      <div className="text-muted-foreground mono">Page {page} / {totalPages} · {total} results</div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)} data-testid={`${testid}-prev`}>Prev</Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)} data-testid={`${testid}-next`}>Next</Button>
      </div>
    </div>
  );
}
