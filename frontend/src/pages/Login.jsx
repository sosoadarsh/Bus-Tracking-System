import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bus } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name}`);
      if (user.role === "ADMIN") nav("/admin");
      else if (user.role === "DRIVER") nav("/driver");
      else nav("/student");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (e, p) => { setEmail(e); setPassword(p); };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative">
        <img src="https://images.unsplash.com/photo-1663162551013-8bb8ab151e11?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwyfHxjb2xsZWdlJTIwc3R1ZGVudHMlMjB3YWxraW5nJTIwY2FtcHVzfGVufDB8fHx8MTc4NzIzNTE1NHww&ixlib=rb-4.1.0&q=85" alt="Campus" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <div className="overline text-white/70">CampusRoute</div>
          <h2 className="heading text-4xl font-black mt-2">Every bus, every stop, live.</h2>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground"><Bus className="w-5 h-5" /></div>
            <span className="heading text-lg font-black">CampusRoute</span>
          </Link>
          <h1 className="heading text-3xl font-black">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-2">Admin, driver or student — one entry point.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 border border-border rounded-lg p-4 bg-muted/30">
            <div className="overline mb-3">Demo accounts — click to fill</div>
            <div className="grid grid-cols-1 gap-2">
              <button type="button" onClick={() => quickFill("awaleadarsh45@gmail.com", "admin123")} className="text-left text-xs mono px-2 py-1.5 rounded border border-border hover:border-primary/50 hover:bg-card" data-testid="demo-admin">admin · awaleadarsh45@gmail.com / admin123</button>
              <button type="button" onClick={() => quickFill("rahul@college.edu", "driver123")} className="text-left text-xs mono px-2 py-1.5 rounded border border-border hover:border-primary/50 hover:bg-card" data-testid="demo-driver">driver · rahul@college.edu / driver123</button>
              <button type="button" onClick={() => quickFill("priya@college.edu", "student123")} className="text-left text-xs mono px-2 py-1.5 rounded border border-border hover:border-primary/50 hover:bg-card" data-testid="demo-student">student · priya@college.edu / student123</button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-6">New student? <Link className="text-primary font-medium" to="/register">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}
