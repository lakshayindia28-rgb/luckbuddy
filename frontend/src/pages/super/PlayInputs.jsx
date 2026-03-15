import { useEffect, useState } from "react";
import api from "../../services/api";
import DashboardLayout from "../../components/DashboardLayout";

const SLOT_SCHEDULE = [
  { start: 8 * 60 + 45, end: 11 * 60, interval: 15 },
  { start: 11 * 60, end: 20 * 60, interval: 20 },
];

function toTimeslotFromHHMM(hhmm = "") {
  const match = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return "";

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";

  const totalMins = hours * 60 + minutes;

  for (const { start, end, interval } of SLOT_SCHEDULE) {
    if (totalMins >= start && totalMins < end) {
      const slotIndex = Math.floor((totalMins - start) / interval);
      const slotStart = start + slotIndex * interval;
      const slotEnd = slotStart + interval;
      if (slotEnd > end) return "";
      const sHH = String(Math.floor(slotStart / 60)).padStart(2, "0");
      const sMM = String(slotStart % 60).padStart(2, "0");
      const eHH = String(Math.floor(slotEnd / 60)).padStart(2, "0");
      const eMM = String(slotEnd % 60).padStart(2, "0");
      return `${sHH}:${sMM}-${eHH}:${eMM}`;
    }
  }

  return "";
}

export default function SuperPlayInputs() {
  const [slotDate, setSlotDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [slotTime, setSlotTime] = useState("");
  const [timeslot, setTimeslot] = useState("");
  const [vendorUsername, setVendorUsername] = useState("");
  const [assignedVendors, setAssignedVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/result/current-timeslot")
      .then((res) => {
        const currentTs = res.data?.timeslot || "";
        setTimeslot(currentTs);
        setSlotDate(res.data?.slot_date || new Date().toLocaleDateString("en-CA"));
        setSlotTime(currentTs ? String(currentTs).slice(0, 5) : "00:00");
      })
      .catch(() => {
        setTimeslot("");
        setSlotTime("00:00");
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAssignedVendors = async () => {
      try {
        setVendorsLoading(true);
        const res = await api.get("/super/vendors");
        if (cancelled) return;
        setAssignedVendors(res.data || []);
      } catch {
        if (cancelled) return;
        setAssignedVendors([]);
      } finally {
        if (!cancelled) setVendorsLoading(false);
      }
    };

    loadAssignedVendors();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadInputs = async () => {
    setLoading(true);
    setError("");
    const selectedTimeslot = toTimeslotFromHHMM(slotTime || "00:00");
    if (!slotDate || !selectedTimeslot) {
      setLoading(false);
      setError("Please select valid date and time");
      return;
    }

    setTimeslot(selectedTimeslot);

    try {
      const res = await api.get("/admin/tickets", {
        params: {
          slot_date: slotDate || undefined,
          timeslot: selectedTimeslot || undefined,
          vendor_username: vendorUsername || undefined,
        },
      });
      setRows(res.data?.tickets || []);
      setTotals(res.data?.totals || null);
    } catch (e) {
      setRows([]);
      setTotals(null);
      setError(e.response?.data?.detail || "Failed to load play inputs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="card-box">
        <h5 className="mb-3">Play Inputs</h5>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row g-2 align-items-end mb-2">
          <div className="col-md-4">
            <label className="form-label">Slot Date</label>
            <input
              type="date"
              className="form-control super-play-picker"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Time Slot</label>
            <input
              type="time"
              step="300"
              className="form-control super-play-picker"
              value={slotTime}
              onChange={(e) => setSlotTime(e.target.value)}
            />
            <div className="text-muted mt-1" style={{ fontSize: 12 }}>
              Slot: {timeslot || toTimeslotFromHHMM(slotTime || "00:00") || "--"}
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label">Assigned Vendor (optional)</label>
            <select
              className="form-select"
              value={vendorUsername}
              onChange={(e) => setVendorUsername(e.target.value)}
              disabled={vendorsLoading}
            >
              <option value="">All assigned vendors</option>
              {assignedVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.username}>
                  {vendor.username}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-12">
            <button className="btn btn-info w-100" onClick={loadInputs}>
              {loading ? "Loading..." : "Load Inputs"}
            </button>
          </div>
        </div>

        {totals && (
          <div className="text-secondary mb-2">
            Total Tickets: <b>{totals.total_points}</b> • Total Amount: ₹<b>{totals.total_amount}</b>
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-secondary">
                    No data
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index}>
                    <td>{row.vendor_username}</td>
                    <td>{row.timeslot}</td>
                    <td>{row.serial}</td>
                    <td>{String(row.number).padStart(2, "0")}</td>
                    <td>{row.points}</td>
                    <td>₹{row.price}</td>
                    <td>₹{row.amount}</td>
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
