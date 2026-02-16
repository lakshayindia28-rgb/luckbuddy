import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/result.css";
import { formatDDMMYY } from "../utils/date";

const SERIALS = ["XA","XB","XC","XD","XE","XF","XG","XH","XI","XJ"];

const todayISO = () => new Date().toLocaleDateString("en-CA");

const slotStartToMinutes = (timeslot = "") => {
  const start = String(timeslot).split("-")[0]?.trim() || "";
  const match = start.match(/^(\d{1,2})[.:](\d{2})$/);
  if (!match) return Number.NEGATIVE_INFINITY;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.NEGATIVE_INFINITY;
  return hours * 60 + minutes;
};

export default function Result() {
  const [fromDate, setFromDate] = useState(() => todayISO());
  const [toDate, setToDate] = useState(() => todayISO());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- LOAD RESULTS ---------------- */
  const loadResults = async () => {
    setLoading(true);
    try {
      const res = await api.get("/result/public", {
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined
        }
      });

      // group by date + timeslot
      const grouped = {};
      res.data.forEach(r => {
        const date = (r.slot_date || r.created_at.split("T")[0]);
        const key = `${date}_${r.timeslot}`;

        if (!grouped[key]) {
          grouped[key] = {
            date,
            timeslot: r.timeslot,
            values: {},
            _latest: {}
          };
        }

        // Keep latest value if duplicates exist.
        const serial = r.serial;
        const createdAt = r.created_at ? new Date(r.created_at).getTime() : 0;
        const prevAt = grouped[key]._latest[serial] ?? -1;
        if (grouped[key].values[serial] == null || createdAt >= prevAt) {
          grouped[key].values[serial] = r.winning_number;
          grouped[key]._latest[serial] = createdAt;
        }
      });

      const next = Object.values(grouped)
        .map(({ _latest, ...row }) => row)
        .sort((a, b) => {
          const d = String(b.date || "").localeCompare(String(a.date || ""));
          if (d !== 0) return d;
          const aMinutes = slotStartToMinutes(a.timeslot);
          const bMinutes = slotStartToMinutes(b.timeslot);
          if (aMinutes !== bMinutes) return bMinutes - aMinutes;
          return String(b.timeslot || "").localeCompare(String(a.timeslot || ""));
        });

      setRows(next);
    } catch {
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadResults();
    const timer = setInterval(loadResults, 15000); // 🔁 auto refresh
    return () => clearInterval(timer);
  }, [fromDate, toDate]);

  return (
    <div className="result-wrapper">

      {/* HEADER */}
      <div className="result-header">
        <h2>BhagyaLaxmi Result</h2>
        <p>Live & Published Results</p>
      </div>

      {/* FILTER */}
      <div className="filter-bar">
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
        />
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
        />
        <button onClick={loadResults}>View Result</button>
      </div>

      {/* TABLE */}
      <div className="table-container">
        {loading && <p className="loading">Loading...</p>}

        {!loading && rows.length === 0 && (
          <p className="no-result">No results available</p>
        )}

        {rows.length > 0 && (
          <table className="result-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                {SERIALS.map(s => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{formatDDMMYY(row.date)}</td>
                  <td>{row.timeslot}</td>
                  {SERIALS.map(s => (
                    <td key={s} className="result-cell">
                      {row.values[s] == null
                        ? "--"
                        : `${s}${String(row.values[s]).padStart(2, "0")}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
