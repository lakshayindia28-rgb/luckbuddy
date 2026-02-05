import { useEffect, useState } from "react";
import api from "../../services/api";
import DashboardLayout from "../../components/DashboardLayout";

const SERIALS = ["XA","XB","XC","XD","XE","XF","XG","XH","XI","XJ"];
const TENS = [0,1,2,3,4,5,6,7,8,9];
const ONES = [0,1,2,3,4,5,6,7,8,9];

export default function AddTicket({ forcedVendor }) {
  const [timeslot, setTimeslot] = useState("");
  const [selectedSerial, setSelectedSerial] = useState("XA");
  const [betsBySerial, setBetsBySerial] = useState({});
  const [digitPrices, setDigitPrices] = useState({});
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  const vendorUsername =
    forcedVendor || localStorage.getItem("username");

  useEffect(() => {
    api.get("/result/current-timeslot")
      .then(r => setTimeslot(r.data.timeslot));

    api.get("/admin/ticket-digit-prices")
      .then(r => {
        const map = {};
        (r.data || []).forEach(row => {
          if (!map[row.serial]) map[row.serial] = {};
          map[row.serial][row.digit] = row.price;
        });
        setDigitPrices(map);
      });
  }, []);

  const setQty = (serial, number, qty) => {
    setBetsBySerial(prev => {
      const existing = prev[serial] || {};
      return {
        ...prev,
        [serial]: {
          ...existing,
          [number]: qty
        }
      };
    });
  };

  const getQty = (serial, number) => {
    return Number(betsBySerial?.[serial]?.[number] || 0);
  };

  const getPrice = (serial, number) => {
    const digit = Number(number) % 10;
    const price = digitPrices?.[serial]?.[digit];
    return Number(price ?? 10);
  };

  const totals = (() => {
    let totalPoints = 0;
    let totalAmount = 0;

    for (const serial of Object.keys(betsBySerial)) {
      const map = betsBySerial[serial] || {};
      for (const [numStr, qtyRaw] of Object.entries(map)) {
        const qty = Number(qtyRaw || 0);
        if (qty <= 0) continue;
        const num = Number(numStr);
        const price = getPrice(serial, num);
        totalPoints += qty;
        totalAmount += qty * price;
      }
    }
    return { totalPoints, totalAmount };
  })();

  const playGame = async () => {
    if (!vendorUsername) {
      setError("Vendor not identified");
      return;
    }

    try {
      const bets = [];
      for (const serial of Object.keys(betsBySerial)) {
        const map = betsBySerial[serial] || {};
        for (const [numStr, qtyRaw] of Object.entries(map)) {
          const qty = Number(qtyRaw || 0);
          if (qty <= 0) continue;
          const number = Number(numStr);
          if (Number.isNaN(number) || number < 0 || number > 99) continue;
          bets.push({ serial, number, points: qty });
        }
      }

      if (bets.length === 0) {
        setError("No tickets selected");
        return;
      }

      await api.post("/vendor/play-game", {
        bets,
        forced_vendor: forcedVendor || null
      });

      setLocked(true);
      alert("Game locked successfully");
    } catch (e) {
      setError(e.response?.data?.detail || "Failed");
    }
  };

  return (
    <DashboardLayout>
      <h5>Timeslot: {timeslot}</h5>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card-box mb-3">
        <label className="mb-1">Select Serial</label>
        <select
          className="form-control"
          value={selectedSerial}
          disabled={locked}
          onChange={(e) => setSelectedSerial(e.target.value)}
        >
          {SERIALS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="text-secondary mt-2" style={{ fontSize: 13 }}>
          Fill quantities for numbers 00–99. Price is decided by admin for the last digit (0–9).
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-dark table-bordered align-middle">
          <thead>
            <tr>
              <th style={{ width: 70 }}>#</th>
              {ONES.map((o) => (
                <th key={o} className="text-center">{o}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TENS.map((t) => (
              <tr key={t}>
                <td className="text-center fw-bold">{t}</td>
                {ONES.map((o) => {
                  const number = t * 10 + o;
                  const qty = getQty(selectedSerial, number);
                  return (
                    <td key={o}>
                      <div style={{ fontSize: 12 }} className="text-secondary mb-1">
                        {String(number).padStart(2, "0")} • ₹{getPrice(selectedSerial, number)}
                      </div>
                      <input
                        type="number"
                        min="0"
                        className="form-control form-control-sm"
                        disabled={locked}
                        value={qty === 0 ? "" : qty}
                        onChange={(e) => setQty(selectedSerial, number, Number(e.target.value || 0))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <h6 className="mb-0">
          Total Tickets: {totals.totalPoints} • Total Amount: ₹ {totals.totalAmount}
        </h6>
        <button className="btn btn-primary" onClick={playGame} disabled={locked}>
          {locked ? "Locked" : "Play Game"}
        </button>
      </div>
    </DashboardLayout>
  );
}
