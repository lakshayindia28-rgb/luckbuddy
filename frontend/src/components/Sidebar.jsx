import { Link, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div
      className="bg-dark text-light d-flex flex-column p-3"
      style={{ width: 240, minHeight: "100vh" }}
    >
      {/* LOGO / TITLE */}
      <h4 className="text-center mb-4 border-bottom pb-2">
        BhagyaLaxmi
      </h4>

      {/* COMMON */}
      <Link className="sidebar-link" to="/">
        🏠 Home
      </Link>

      {/* ========== VENDOR ========== */}
      {role === "vendor" && (
        <>
          <Link className="sidebar-link" to="/vendor">
            📊 Dashboard
          </Link>
          <Link className="sidebar-link" to="/vendor/add-ticket">
            🎟 Add Ticket
          </Link>
          <Link className="sidebar-link" to="/vendor/result">
            📈 Results
          </Link>
        </>
      )}

      {/* ========== SUPER ========== */}
      {role === "super" && (
        <>
          <Link className="sidebar-link" to="/super">
            📊 Dashboard
          </Link>
          <Link className="sidebar-link" to="/super/play-inputs">
            🎯 Play Inputs
          </Link>
          <Link className="sidebar-link" to="/super/manual-result">
            ✍ Manual Result
          </Link>
          <Link className="sidebar-link" to="/result">
            📈 View Results
          </Link>
        </>
      )}

      {/* ========== ADMIN ========== */}
      {role === "admin" && (
        <>
          <Link className="sidebar-link" to="/admin?section=create-super">
            📊 Dashboard
          </Link>
          <Link className="sidebar-link" to="/admin?section=manage-users">
            👥 Manage Users
          </Link>
          <Link className="sidebar-link" to="/admin?section=serial-price">
            💰 Serial Price
          </Link>
          <Link className="sidebar-link" to="/admin?section=digit-price">
            🔢 Digit Price
          </Link>
          <Link className="sidebar-link" to="/admin?section=vendor-inputs">
            🎯 Play Inputs
          </Link>
          <Link className="sidebar-link" to="/admin?section=assign-vendor">
            🔗 Assign Vendor
          </Link>
          <Link className="sidebar-link" to="/admin?section=notifications">
            📢 Notifications
          </Link>
          <Link className="sidebar-link" to="/result">
            📈 View Results
          </Link>
        </>
      )}

      {/* PUSH LOGOUT TO BOTTOM */}
      <div className="mt-auto">
        <button
          className="btn btn-outline-danger w-100 mt-3"
          onClick={logout}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
