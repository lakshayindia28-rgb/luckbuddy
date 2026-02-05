import { useEffect, useState } from "react";
import api from "../../services/api";

export default function Result() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    api.get("/result/public").then(res => {
      const rows = Array.isArray(res.data) ? res.data : [];
      rows.sort((a, b) => {
        const d = String(b.slot_date || "").localeCompare(String(a.slot_date || ""));
        if (d !== 0) return d;
        const t = String(a.timeslot || "").localeCompare(String(b.timeslot || ""));
        if (t !== 0) return t;
        return String(a.serial || "").localeCompare(String(b.serial || ""));
      });
      setResults(rows);
    });
  }, []);

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Results</h3>

      {results.map((r, i) => (
        <div key={i} className="card p-3 mb-2">
          <strong>{r.serial}</strong> |
          Slot: {r.timeslot} |
          Result: <b>{r.winning_number}</b> |
          Collection: ₹{r.total_amount}
        </div>
      ))}
    </div>
  );
}

