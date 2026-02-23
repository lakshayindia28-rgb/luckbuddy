import api from "../services/api";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const loginInProgress = useRef(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatApiError = (err) => {
    const detail = err?.response?.data?.detail;
    if (!detail) return err?.message || "Server error. Please try again";

    if (typeof detail === "string") return detail;

    if (Array.isArray(detail)) {
      const parts = detail
        .map((d) => {
          const loc = Array.isArray(d?.loc) ? d.loc.join(".") : "";
          const msg = d?.msg || "Invalid request";
          return loc ? `${loc}: ${msg}` : msg;
        })
        .filter(Boolean);
      return parts.length ? parts.join(" | ") : "Invalid request";
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return "Server error. Please try again";
    }
  };

  const login = async () => {
    if (loginInProgress.current) return;
    loginInProgress.current = true;

    if (!username || !password) {
      setError("Username and password required");
      loginInProgress.current = false;
      return;
    }

    setError("");
    setLoading(true);

    // ✅ BACKEND EXPECTS QUERY PARAMS
    const payload = {
      username: username.trim(),
      password,
      role
    };

    try {
      const res = await api.post("/login", null, { params: payload });

      // 🔐 SAVE SESSION
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", res.data.username);

      // 🔁 REDIRECT BASED ON ROLE
      if (res.data.role === "admin") navigate("/admin");
      else if (res.data.role === "super") navigate("/super");
      else navigate("/vendor");

    } catch (err) {
      if (err.response?.status === 401) {
        setError("Invalid username / password / role");
      } else {
        setError(formatApiError(err));
      }
    } finally {
      setLoading(false);
      loginInProgress.current = false;
    }
  };

  return (
    <div className="login-yellow-page d-flex justify-content-center align-items-center">
      <div className="login-orbit-wrap">
        <span className="login-orbit-dot login-orbit-dot-1" aria-hidden="true"></span>
        <span className="login-orbit-dot login-orbit-dot-2" aria-hidden="true"></span>
        <span className="login-orbit-dot login-orbit-dot-3" aria-hidden="true"></span>
        <span className="login-orbit-dot login-orbit-dot-4" aria-hidden="true"></span>

        <div className="card-box login-yellow-card" style={{ width: 380 }}>

          {/* LOGO / TITLE */}
          <div className="text-center mb-4 login-title-wrap">
            <h3 className="login-brand-title">BhagyaLaxmi</h3>
            <p className="text-dark login-subtitle">Secure Login Portal</p>
          </div>

        {/* ERROR */}
          {error && (
            <div className="alert alert-danger py-1 text-center login-strong-text">
              {error}
            </div>
          )}

        {/* USERNAME */}
          <input
            className="form-control mb-2 login-input-text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />

        {/* PASSWORD */}
          <div className="input-group mb-3">
            <input
              type={showPassword ? "text" : "password"}
              className="form-control login-input-text"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              className="btn btn-outline-secondary login-input-text"
              type="button"
              onClick={() => setShowPassword(s => !s)}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "View"}
            </button>
          </div>

        {/* ROLE SELECT */}
          <div className="d-flex justify-content-between mb-3 login-role-row">
            {["admin", "super", "vendor"].map(r => (
              <label
                key={r}
                className="login-role-label"
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={e => setRole(e.target.value)}
                  className="me-1"
                />
                {r.toUpperCase()}
              </label>
            ))}
          </div>

        {/* LOGIN BUTTON */}
          <button
            className="btn btn-primary w-100 login-btn-text"
            onClick={login}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        {/* FOOTER */}
          <p className="text-center mt-4 text-muted login-footer-text">
            © 2026 BhagyaLaxmi
          </p>

        </div>
      </div>
    </div>
  );
}