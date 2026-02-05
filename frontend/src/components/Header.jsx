import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-dark bg-dark px-4">
      <span className="navbar-brand fw-bold">
        BhagyaLaxmi Game
      </span>

      <div className="d-flex align-items-center gap-3">
        {role && (
          <span className="badge bg-info text-dark">
            {role.toUpperCase()}
          </span>
        )}

        <button
          className="btn btn-sm btn-outline-danger"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
