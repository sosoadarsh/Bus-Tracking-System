import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bus } from "lucide-react";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", student_id: "", department: "BCA", year: "3rd", phone: "" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Welcome to CampusRoute");
      nav("/student");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setLoading(false); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-lg">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground"><Bus className="w-5 h-5" /></div>
          <span className="heading text-lg font-black">CampusRoute</span>
        </Link>
        <h1 className="heading text-3xl font-black">Create student account</h1>
        <p className="text-sm text-muted-foreground mt-2">Student self-registration only. Drivers and admins are created by admin.</p>
        <form onSubmit={submit} className="mt-8 grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Full name</Label><Input required value={form.name} onChange={set("name")} data-testid="reg-name" /></div>
          <div className="col-span-2"><Label>Email</Label><Input type="email" required value={form.email} onChange={set("email")} data-testid="reg-email" /></div>
          <div className="col-span-2"><Label>Password (min 6)</Label><Input type="password" required minLength={6} value={form.password} onChange={set("password")} data-testid="reg-password" /></div>
          <div><Label>Student ID</Label><Input value={form.student_id} onChange={set("student_id")} data-testid="reg-student-id" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} data-testid="reg-phone" /></div>
          <div><Label>Department</Label><Input value={form.department} onChange={set("department")} data-testid="reg-department" /></div>
          <div><Label>Year</Label><Input value={form.year} onChange={set("year")} data-testid="reg-year" /></div>
          <Button type="submit" className="col-span-2" disabled={loading} data-testid="reg-submit">{loading ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="text-sm text-muted-foreground mt-6">Already have an account? <Link className="text-primary font-medium" to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
