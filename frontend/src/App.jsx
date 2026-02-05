import { HashRouter, Routes, Route } from "react-router-dom";

/* ========== PUBLIC ========== */
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Result from "./pages/Result";

/* ========== ADMIN ========== */
import AdminDashboard from "./pages/admin/Dashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import ManualResult from "./pages/super/ManualResult";

/* ========== SUPER ========== */
import SuperDashboard from "./pages/super/Dashboard";
import SuperAddTicket from "./pages/super/AddTicket";

/* ========== VENDOR ========== */
import VendorDashboard from "./pages/vendor/Dashboard";
import AddTicket from "./pages/vendor/AddTicket";
import ViewResult from "./pages/vendor/ViewResult";

/* ========== SECURITY ========== */
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <HashRouter>
      <Routes>

        {/* ================= PUBLIC ================= */}
        <Route path="*" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/result" element={<Result />} />

        {/* ================= ADMIN ================= */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute role="admin">
              <ManageUsers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/manual-result"
          element={
            <ProtectedRoute role="admin">
              <ManualResult />
            </ProtectedRoute>
          }
        />

        {/* ================= SUPER ================= */}
        <Route
          path="/super"
          element={
            <ProtectedRoute role="super">
              <SuperDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super/manual-result"
          element={
            <ProtectedRoute role="super">
              <ManualResult />
            </ProtectedRoute>
          }
        />

        {/* ✅ SUPER → PLAY ON BEHALF OF VENDOR */}
        <Route
          path="/super/add-ticket/:username"
          element={
            <ProtectedRoute role="super">
              <SuperAddTicket />
            </ProtectedRoute>
          }
        />

        {/* ================= VENDOR ================= */}
        <Route
          path="/vendor"
          element={
            <ProtectedRoute role="vendor">
              <VendorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor/add-ticket"
          element={
            <ProtectedRoute role="vendor">
              <AddTicket />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor/result"
          element={
            <ProtectedRoute role="vendor">
              <ViewResult />
            </ProtectedRoute>
          }
        />

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Login />} />

      </Routes>
    </HashRouter>
  );
}
