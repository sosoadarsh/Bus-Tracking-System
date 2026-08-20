import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function StudentsPage() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/students").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);
  const del = async (id) => {
    if (!window.confirm("Delete student?")) return;
    try { await api.delete(`/students/${id}`); toast.success("Deleted"); load(); } catch (err) { toast.error(formatApiError(err)); }
  };
  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6"><div className="overline">Roster</div><h1 className="heading text-4xl font-black mt-2">Students</h1></div>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>{["Name","Email","Student ID","Dept","Year","Actions"].map((h) => <th key={h} className="px-4 py-3 overline">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No students.</td></tr>}
              {rows.map((s) => (
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
        </div>
      </div>
    </AppShell>
  );
}
