import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "sonner";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import BusesPage from "@/pages/admin/BusesPage";
import DriversPage from "@/pages/admin/DriversPage";
import StudentsPage from "@/pages/admin/StudentsPage";
import RoutesPage from "@/pages/admin/RoutesPage";
import AssignmentsPage from "@/pages/admin/AssignmentsPage";
import LiveTrackingPage from "@/pages/admin/LiveTrackingPage";
import TripHistoryPage from "@/pages/admin/TripHistoryPage";

import DriverDashboard from "@/pages/driver/DriverDashboard";
import StudentDashboard from "@/pages/student/StudentDashboard";
import BusTrackingPage from "@/pages/student/BusTrackingPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/admin" element={<ProtectedRoute roles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/buses" element={<ProtectedRoute roles={["ADMIN"]}><BusesPage /></ProtectedRoute>} />
          <Route path="/admin/drivers" element={<ProtectedRoute roles={["ADMIN"]}><DriversPage /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute roles={["ADMIN"]}><StudentsPage /></ProtectedRoute>} />
          <Route path="/admin/routes" element={<ProtectedRoute roles={["ADMIN"]}><RoutesPage /></ProtectedRoute>} />
          <Route path="/admin/assignments" element={<ProtectedRoute roles={["ADMIN"]}><AssignmentsPage /></ProtectedRoute>} />
          <Route path="/admin/live" element={<ProtectedRoute roles={["ADMIN"]}><LiveTrackingPage /></ProtectedRoute>} />
          <Route path="/admin/history" element={<ProtectedRoute roles={["ADMIN"]}><TripHistoryPage /></ProtectedRoute>} />

          <Route path="/driver" element={<ProtectedRoute roles={["DRIVER"]}><DriverDashboard /></ProtectedRoute>} />

          <Route path="/student" element={<ProtectedRoute roles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/track/:tripId" element={<ProtectedRoute roles={["STUDENT","ADMIN"]}><BusTrackingPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
