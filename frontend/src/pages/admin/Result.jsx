import { useEffect, useState } from "react";
import api from "../../services/api";

export default function Result() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    api.get("/result/public").then(res => setResults(res.data));
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

