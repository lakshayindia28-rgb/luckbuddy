import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import DashboardLayout from "../../components/DashboardLayout";
import NotificationBanner from "../../components/NotificationBanner";

export default function SuperDashboard() {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /* ---------------- LOAD VENDORS ---------------- */
  const loadVendors = async () => {
    try {
      const res = await api.get("/super/vendors");
      setVendors(res.data || []);
    } catch (err) {
      setError("Failed to load vendors");
    }
  };

  /* ---------------- CREATE VENDOR ---------------- */
  const createVendor = async () => {
    if (!username || !password) {
      setError("Username & password required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await api.post("/super/create-vendor", null, {
        params: { username, password }
      });

      setUsername("");
      setPassword("");
      loadVendors(); // 🔄 refresh list

    } catch (err) {
      setError("Failed to create vendor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
    api.get("/notification/latest")
      .then((r) => setNotice(r.data?.message || ""))
      .catch(() => setNotice(""));
  }, []);

  return (
    <DashboardLayout>

      <NotificationBanner text={notice} />

      <div className="row">

        {/* ================= CREATE VENDOR ================= */}
        <div className="col-md-4">
          <div className="card-box mb-4">
            <h5 className="mb-3">Create Vendor</h5>

            {error && (
              <div className="alert alert-danger py-1 text-center">
                {error}
              </div>
            )}

            <input
              className="form-control mb-2"
              placeholder="Vendor Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />

            <input
              type="password"
              className="form-control mb-3"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <button
              className="btn btn-primary w-100"
              onClick={createVendor}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Vendor"}
            </button>
          </div>
        </div>

        {/* ================= MANAGE VENDORS ================= */}
        <div className="col-md-8">
          <div className="card-box">
            <h5 className="mb-3">Manage Vendors</h5>

            {vendors.length === 0 ? (
              <p className="text-muted">No vendors found</p>
            ) : (
              <table className="table table-dark table-striped align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vendor Username</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {vendors.map((v, index) => (
                    <tr key={v.id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{v.username}</strong>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() =>
                            navigate(`/super/add-ticket/${v.username}`)
                          }
                        >
                          Add Ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>
        </div>

      </div>

    </DashboardLayout>
  );
}
