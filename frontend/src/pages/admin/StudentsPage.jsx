import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function StudentsPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const load = () => api.get("/students").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((u) => (u.name + " " + u.email + " " + (u.student_id || "") + " " + (u.department || "")).toLowerCase().includes(s)) : rows;
  }, [rows, q]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const del = async (id) => {
    if (!window.confirm("Delete student?")) return;
    try { await api.delete(`/students/${id}`); toast.success("Deleted"); load(); } catch (err) { toast.error(formatApiError(err)); }
  };
  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div><div className="overline">Roster</div><h1 className="heading text-4xl font-black mt-2">Students</h1></div>
          <Input placeholder="Search students…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" data-testid="students-search" />
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>{["Name","Email","Student ID","Dept","Year","Actions"].map((h) => <th key={h} className="px-4 py-3 overline">{h}</th>)}</tr>
            </thead>
            <tbody>
              {pageItems.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No students match.</td></tr>}
              {pageItems.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3 mono">{s.student_id || "—"}</td>
                  <td className="px-4 py-3">{s.department || "—"}</td>
                  <td className="px-4 py-3">{s.year || "—"}</td>
                  <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => del(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
              <div className="text-muted-foreground mono">Page {currentPage} / {totalPages} · {filtered.length} results</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} data-testid="students-prev">Prev</Button>
                <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} data-testid="students-next">Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
