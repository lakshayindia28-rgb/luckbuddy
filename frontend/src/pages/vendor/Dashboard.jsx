import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../services/api";
import DashboardLayout from "../../components/DashboardLayout";
import NotificationBanner from "../../components/NotificationBanner";

export default function VendorDashboard() {
  const [timeslot, setTimeslot] = useState("");
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      try {
        const n = await api.get("/notification/latest");
        setNotice(n.data?.message || "");
      } catch {
        setNotice("");
      }

      const tsRes = await api.get("/result/current-timeslot");
      const ts = tsRes.data.timeslot || "";
      setTimeslot(ts);

      const res = await api.get("/vendor/tickets", {
        params: { timeslot: ts || undefined }
      });
      setRows(res.data.tickets || []);
      setTotals(res.data.totals || null);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <DashboardLayout>
      <NotificationBanner text={notice} />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Vendor Dashboard</h4>
        <button className="btn btn-outline-info btn-sm" onClick={load}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="d-flex gap-2 mb-3">
        <Link to="/vendor/add-ticket" className="btn btn-primary">
          Add Ticket
        </Link>
        <Link to="/vendor/result" className="btn btn-secondary">
          View Result
        </Link>
      </div>

      <div className="card-box mb-3">
        <div className="text-secondary">Current Time Slot</div>
        <div className="fw-bold">{timeslot || "—"}</div>
        {totals && (
          <div className="mt-2">
            Total Tickets: <b>{totals.total_points}</b> • Total Amount: ₹<b>{totals.total_amount}</b>
          </div>
        )}
      </div>

      <div className="card-box">
        <h5 className="mb-3">Your Submitted Tickets (this slot)</h5>
        <div className="table-responsive">
          <table className="table table-dark table-striped align-middle">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Number</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-secondary">
                    No tickets submitted
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={idx}>
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
    </DashboardLayout>
  );
}
