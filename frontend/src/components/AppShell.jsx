import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Bus, Users, GraduationCap, Route as RouteIcon, MapPin, ClipboardList, Radio, History, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_LINKS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/buses", icon: Bus, label: "Buses" },
  { to: "/admin/drivers", icon: Users, label: "Drivers" },
  { to: "/admin/students", icon: GraduationCap, label: "Students" },
  { to: "/admin/routes", icon: RouteIcon, label: "Routes & Stops" },
  { to: "/admin/assignments", icon: ClipboardList, label: "Assignments" },
  { to: "/admin/live", icon: Radio, label: "Live Tracking" },
  { to: "/admin/history", icon: History, label: "Trip History" },
];

const DRIVER_LINKS = [
  { to: "/driver", icon: LayoutDashboard, label: "My Trip", end: true },
  { to: "/driver/history", icon: History, label: "Previous Trips" },
];

const STUDENT_LINKS = [
  { to: "/student", icon: LayoutDashboard, label: "Available Buses", end: true },
];

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const links = user?.role === "ADMIN" ? ADMIN_LINKS : user?.role === "DRIVER" ? DRIVER_LINKS : STUDENT_LINKS;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-card">
        <div className="px-6 py-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="heading text-base font-black leading-none">CampusRoute</div>
              <div className="overline mt-1">College Transit</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`
              }
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-sm mb-3">
            <div className="font-semibold truncate">{user?.name}</div>
            <div className="overline mt-1">{user?.role}</div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            data-testid="logout-button"
            onClick={async () => { await logout(); nav("/login"); }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
