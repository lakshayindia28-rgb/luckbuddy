import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import DashboardLayout from "../../components/DashboardLayout";
import NotificationBanner from "../../components/NotificationBanner";

/* ================= CONSTANTS ================= */
const SERIALS = ["XA","XB","XC","XD","XE","XF","XG","XH","XI","XJ"];
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const ADMIN_SECTIONS = [
  {
    id: "create-super",
    title: "Create Super",
    tagline: "Create new super users"
  },
  {
    id: "manage-users",
    title: "Manage Users",
    tagline: "View/delete users"
  },
  {
    id: "serial-price",
    title: "Serial Price",
    tagline: "Fallback default per serial"
  },
  {
    id: "digit-price",
    title: "Digit Price (0–9)",
    tagline: "Main pricing control (last digit)"
  },
  {
    id: "vendor-inputs",
    title: "Vendor Inputs",
    tagline: "See who submitted what"
  },
  {
    id: "assign-vendor",
    title: "Assign Vendor",
    tagline: "Link vendor to super"
  },
  {
    id: "notifications",
    title: "Notifications",
    tagline: "Send to super/vendor panels"
  }
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  /* ================= AUTH ================= */
  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* ================= STATE ================= */
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [users, setUsers] = useState([]);
  const [supers, setSupers] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [prices, setPrices] = useState({});

  const [digitPrices, setDigitPrices] = useState({});

  const [ticketTimeslot, setTicketTimeslot] = useState("");
  const [ticketVendor, setTicketVendor] = useState("");
  const [ticketRows, setTicketRows] = useState([]);
  const [ticketTotals, setTicketTotals] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState("");

  const [selectedSuper, setSelectedSuper] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");

  const [activeSection, setActiveSection] = useState("digit-price");

  const [notice, setNotice] = useState("");
  const [noticeInput, setNoticeInput] = useState("");
  const [notifySuper, setNotifySuper] = useState(true);
  const [notifyVendor, setNotifyVendor] = useState(true);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    loadUsers();
    loadPrices();
    loadDigitPrices();
    loadDefaultTimeslot();
  }, []);

  const loadUsers = async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data);
    setSupers(res.data.filter(u => u.role === "super"));
    setVendors(res.data.filter(u => u.role === "vendor"));
  };

  const loadPrices = async () => {
    const res = await api.get("/admin/ticket-prices");
    const map = {};
    res.data.forEach(p => {
      map[p.serial] = p.price;
    });
    setPrices(map);
  };

  const loadDigitPrices = async () => {
    const res = await api.get("/admin/ticket-digit-prices");
    const map = {};
    res.data.forEach((row) => {
      if (!map[row.serial]) map[row.serial] = {};
      map[row.serial][row.digit] = row.price;
    });
    setDigitPrices(map);
  };

  const loadDefaultTimeslot = async () => {
    try {
      const res = await api.get("/result/current-timeslot");
      setTicketTimeslot(res.data.timeslot || "");
    } catch {
      setTicketTimeslot("");
    }
  };

  /* ================= ACTIONS ================= */

  const createSuper = async () => {
    if (!username || !password) return alert("Username & password required");

    await api.post("/admin/create-user", null, {
      params: { username, password, role: "super" }
    });

    setUsername("");
    setPassword("");
    loadUsers();
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    await api.delete(`/admin/user/${id}`);
    loadUsers();
  };

  const saveAllPrices = async () => {
    for (let serial of SERIALS) {
      await api.post("/admin/ticket-price", {
        serial,
        price: Number(prices[serial] || 0)
      });
    }
    alert("Ticket prices updated successfully");
  };

  const saveAllDigitPrices = async () => {
    for (let serial of SERIALS) {
      for (let digit of DIGITS) {
        const price = Number(digitPrices?.[serial]?.[digit] ?? 0);
        await api.post("/admin/ticket-digit-price", {
          serial,
          digit,
          price
        });
      }
    }
    alert("Digit prices updated successfully");
    loadDigitPrices();
  };

  const loadTicketInputs = async () => {
    setTicketError("");
    setTicketLoading(true);
    try {
      const res = await api.get("/admin/tickets", {
        params: {
          timeslot: ticketTimeslot || undefined,
          vendor_username: ticketVendor || undefined
        }
      });
      setTicketRows(res.data.tickets || []);
      setTicketTotals(res.data.totals || null);
    } catch (e) {
      setTicketError(e.response?.data?.detail || "Failed to load ticket inputs");
    } finally {
      setTicketLoading(false);
    }
  };

  const assignVendor = async () => {
    if (!selectedSuper || !selectedVendor)
      return alert("Select Super & Vendor");

    await api.post("/admin/assign-vendor", null, {
      params: {
        super_username: selectedSuper,
        vendor_username: selectedVendor
      }
    });

    alert("Vendor assigned successfully");
    setSelectedVendor("");
  };

  const publishNotification = async () => {
    const msg = (noticeInput || "").trim();
    if (!msg) return;

    const audiences = [];
    if (notifySuper) audiences.push("super");
    if (notifyVendor) audiences.push("vendor");
    if (audiences.length === 0) return alert("Select Super or Vendor");

    try {
      await api.post("/notification/publish", {
        message: msg,
        audiences
      });
      setNotice(msg);
      setNoticeInput("");
      alert("Notification published");
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to publish notification");
    }
  };

  /* ================= UI ================= */
  return (
    <DashboardLayout>

      <NotificationBanner text={notice} />

      {/* TOP BAR */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Admin Dashboard</h4>
        <button className="btn btn-outline-danger btn-sm" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="row g-3">
        {/* MENU */}
        <div className="col-md-4 col-lg-3">
          <div className="card-box">
            <h5 className="mb-3">Menu</h5>
            <div className="list-group">
              {ADMIN_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`list-group-item list-group-item-action ${
                    activeSection === s.id ? "active" : ""
                  }`}
                  onClick={() => setActiveSection(s.id)}
                >
                  <div className="fw-bold">{s.title}</div>
                  <div style={{ fontSize: 12 }} className="text-secondary">
                    {s.tagline}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="col-md-8 col-lg-9">
          {activeSection === "create-super" && (
            <div className="card-box mb-4">
              <h5>Create Super User</h5>
              <input
                className="form-control mb-2"
                placeholder="Super Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <input
                className="form-control mb-2"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button className="btn btn-primary" onClick={createSuper}>
                Create Super
              </button>
            </div>
          )}

          {activeSection === "manage-users" && (
            <div className="card-box mb-4">
              <h5>Manage Users</h5>
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
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.username}</td>
                      <td>{u.role}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteUser(u.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSection === "serial-price" && (
            <div className="card-box mb-4">
              <h5>Ticket Price Control (Fallback Default)</h5>
              <div className="text-secondary mb-2" style={{ fontSize: 13 }}>
                Used only if digit price (0–9) is not set.
              </div>
              <table className="table table-dark">
                <tbody>
                  {SERIALS.map(s => (
                    <tr key={s}>
                      <td>{s}</td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={prices[s] ?? ""}
                          onChange={e =>
                            setPrices({ ...prices, [s]: e.target.value })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-success" onClick={saveAllPrices}>
                Save Prices
              </button>
            </div>
          )}

          {activeSection === "digit-price" && (
            <div className="card-box mb-4">
              <h5>Digit Price Control (0–9 per Serial)</h5>
              <div className="table-responsive">
                <table className="table table-dark table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Serial</th>
                      {DIGITS.map((d) => (
                        <th key={d}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SERIALS.map((s) => (
                      <tr key={s}>
                        <td>{s}</td>
                        {DIGITS.map((d) => (
                          <td key={d} style={{ minWidth: 90 }}>
                            <input
                              type="number"
                              className="form-control"
                              value={digitPrices?.[s]?.[d] ?? ""}
                              onChange={(e) =>
                                setDigitPrices({
                                  ...digitPrices,
                                  [s]: {
                                    ...(digitPrices[s] || {}),
                                    [d]: e.target.value
                                  }
                                })
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="btn btn-success" onClick={saveAllDigitPrices}>
                Save Digit Prices
              </button>
            </div>
          )}

          {activeSection === "vendor-inputs" && (
            <div className="card-box mb-4">
              <h5>Vendor Inputs (By Time Slot)</h5>

              {ticketError && <div className="alert alert-danger">{ticketError}</div>}

              <div className="row g-2 align-items-end mb-2">
                <div className="col-md-4">
                  <label className="form-label">Time Slot</label>
                  <input
                    className="form-control"
                    placeholder="14:30-14:45"
                    value={ticketTimeslot}
                    onChange={(e) => setTicketTimeslot(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Vendor Username (optional)</label>
                  <input
                    className="form-control"
                    placeholder="vendor1"
                    value={ticketVendor}
                    onChange={(e) => setTicketVendor(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <button className="btn btn-info w-100" onClick={loadTicketInputs}>
                    {ticketLoading ? "Loading..." : "Load Inputs"}
                  </button>
                </div>
              </div>

              {ticketTotals && (
                <div className="text-secondary mb-2">
                  Total Tickets: <b>{ticketTotals.total_points}</b> • Total Amount: ₹<b>{ticketTotals.total_amount}</b>
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-dark table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Slot</th>
                      <th>Serial</th>
                      <th>Number</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-secondary">
                          No data
                        </td>
                      </tr>
                    ) : (
                      ticketRows.map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.vendor_username}</td>
                          <td>{r.timeslot}</td>
                          <td>{r.serial}</td>
                          <td>{String(r.number).padStart(2, "0")}</td>
                          <td>{r.points}</td>
                          <td>₹{r.price}</td>
                          <td>₹{r.amount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === "assign-vendor" && (
            <div className="card-box mb-4">
              <h5>Assign Vendor to Super</h5>

              <select
                className="form-control mb-2"
                value={selectedSuper}
                onChange={e => setSelectedSuper(e.target.value)}
              >
                <option value="">Select Super</option>
                {supers.map(s => (
                  <option key={s.id} value={s.username}>
                    {s.username}
                  </option>
                ))}
              </select>

              <select
                className="form-control mb-2"
                value={selectedVendor}
                onChange={e => setSelectedVendor(e.target.value)}
              >
                <option value="">Select Vendor</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.username}>
                    {v.username}
                  </option>
                ))}
              </select>

              <button className="btn btn-warning" onClick={assignVendor}>
                Assign Vendor
              </button>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="card-box">
              <h5>Global Notification</h5>
              <div className="d-flex gap-3 mb-2">
                <label className="text-light" style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    className="me-1"
                    checked={notifySuper}
                    onChange={(e) => setNotifySuper(e.target.checked)}
                  />
                  Super
                </label>
                <label className="text-light" style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    className="me-1"
                    checked={notifyVendor}
                    onChange={(e) => setNotifyVendor(e.target.checked)}
                  />
                  Vendor
                </label>
              </div>
              <textarea
                className="form-control mb-2"
                rows="2"
                value={noticeInput}
                onChange={e => setNoticeInput(e.target.value)}
              />
              <button className="btn btn-info" onClick={publishNotification}>
                Publish Notification
              </button>
            </div>
          )}
        </div>
      </div>

    </DashboardLayout>
  );
}
