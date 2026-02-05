import { useEffect, useState } from "react";
import api from "../../services/api";
import DashboardLayout from "../../components/DashboardLayout";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const me = localStorage.getItem("username") || "";

  const loadUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (e) {
      setMsg(e.response?.data?.detail || "Failed to load users");
    }
  };

  const openUser = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowPassword(false);
    setMsg("");
  };

  const close = () => {
    setSelectedUser(null);
    setNewPassword("");
    setShowPassword(false);
    setMsg("");
  };

  const resetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    setBusy(true);
    setMsg("");
    try {
      await api.post("/admin/reset-password", null, {
        params: {
          user_id: selectedUser.id,
          new_password: newPassword
        }
      });
      setMsg("Password reset successfully");
      setNewPassword("");
    } catch (e) {
      setMsg(e.response?.data?.detail || "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <DashboardLayout>
      <div className="card-box">
        <h5 className="mb-3">Manage Users</h5>

        <table className="table table-dark table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>
                  <span className="badge bg-info text-dark">{u.role}</span>
                  {me && u.username === me && (
                    <span className="badge bg-secondary ms-2">You</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-warning"
                    disabled={busy}
                    onClick={() => openUser(u)}
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedUser && (
          <div className="mt-4 card p-3 bg-dark">
            <h6>
              Reset Password for:
              <span className="text-info"> {selectedUser.username}</span>
            </h6>

            <div className="text-secondary" style={{ fontSize: 13 }}>
              Note: Existing passwords cannot be viewed (passwords are stored as secure hashes).
            </div>

            {msg && (
              <div className="alert alert-info py-1 mt-2 mb-2">{msg}</div>
            )}

            <input
              type={showPassword ? "text" : "password"}
              className="form-control mb-2"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <div className="d-flex gap-2">
              <button
                className="btn btn-primary"
                onClick={resetPassword}
                disabled={busy || !newPassword}
              >
                {busy ? "Working..." : "Confirm Reset"}
              </button>

              <button
                className="btn btn-outline-light"
                onClick={() => setShowPassword((s) => !s)}
                disabled={busy}
              >
                {showPassword ? "Hide" : "Show"}
              </button>

              <button
                className="btn btn-outline-secondary"
                onClick={close}
                disabled={busy}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
