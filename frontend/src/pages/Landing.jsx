import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bus, MapPin, Radio, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const HERO_IMG = "https://images.unsplash.com/photo-1564694202883-46e7448c1b26?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjaXR5JTIwYnVzJTIweWVsbG93fGVufDB8fHx8MTc4NzIzNTE1NHww&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  const { user, ready } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (ready && user) {
      if (user.role === "ADMIN") nav("/admin");
      else if (user.role === "DRIVER") nav("/driver");
      else if (user.role === "STUDENT") nav("/student");
    }
  }, [ready, user, nav]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground"><Bus className="w-5 h-5" /></div>
            <div>
              <div className="heading text-lg font-black leading-none">CampusRoute</div>
              <div className="overline mt-1">Live College Transit</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" data-testid="header-login">Login</Button></Link>
            <Link to="/register"><Button data-testid="header-signup">Sign up</Button></Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="overline mb-6">Nagpur · Real-time · Zero delays</div>
            <h1 className="heading text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight">
              Track your college bus.
              <span className="block text-primary">Live. On the map.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              CampusRoute is the operations backbone for college transportation — admins run the fleet, drivers stream GPS, and students see their bus move in real time on OpenStreetMap.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register"><Button size="lg" className="rounded-full px-8" data-testid="hero-cta-register">Get started <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
              <Link to="/login"><Button variant="outline" size="lg" className="rounded-full px-8" data-testid="hero-cta-login">I already have an account</Button></Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              <Stat n="3" label="Routes" />
              <Stat n="4" label="Buses" />
              <Stat n="24/7" label="Tracking" />
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl">
              <img src={HERO_IMG} alt="City bus" className="w-full h-[420px] object-cover" />
              <div className="absolute top-4 left-4 glass rounded-full px-3 py-1.5 text-xs mono flex items-center gap-2">
                <span className="live-dot" /> LIVE · BUS-01
              </div>
              <div className="absolute bottom-4 left-4 right-4 glass rounded-xl p-4">
                <div className="overline">Next stop</div>
                <div className="text-xl heading font-black">Medical Square</div>
                <div className="text-sm text-muted-foreground mt-1">~6 min · 2.1 km</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
          <Feature icon={ShieldCheck} title="Role-based access" body="Admins manage. Drivers drive. Students track. No overlap, no leaks." />
          <Feature icon={Radio} title="Live over WebSockets" body="Zero-refresh location streaming with animated marker updates." />
          <Feature icon={MapPin} title="Route intelligence" body="Ordered stops, next-stop detection and simple ETA — built for real routes." />
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>© 2026 CampusRoute · BCA Final Year Project</span>
          <span className="mono">Nagpur, MH · India</span>
        </div>
      </footer>
    </div>
  );
}

const Stat = ({ n, label }) => (
  <div className="border border-border rounded-lg p-4 bg-card">
    <div className="heading text-2xl font-black">{n}</div>
    <div className="overline mt-1">{label}</div>
  </div>
);

const Feature = ({ icon: Icon, title, body }) => (
  <div className="border border-border rounded-xl p-6 bg-card hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg" style={{ transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease" }}>
    <Icon className="w-6 h-6 text-primary mb-3" />
    <div className="heading text-lg font-black">{title}</div>
    <p className="text-sm text-muted-foreground mt-2">{body}</p>
  </div>
);
