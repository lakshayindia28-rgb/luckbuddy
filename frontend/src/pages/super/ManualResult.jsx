import { useEffect, useState } from "react";
import api from "../../services/api";
import DashboardLayout from "../../components/DashboardLayout";
import { formatDDMMYY, parseDateToISO } from "../../utils/date";

const SERIALS = ["XA", "XB", "XC", "XD", "XE", "XF", "XG", "XH", "XI", "XJ"];

function normalizeNumber(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n)) return NaN;
  return n;
}

export default function ManualResult() {
  const [slotDate, setSlotDate] = useState(() => new Date().toLocaleDateString("en-CA")); // ISO YYYY-MM-DD
  const [slotDateText, setSlotDateText] = useState(() => formatDDMMYY(new Date().toLocaleDateString("en-CA")));
  const [timeslot, setTimeslot] = useState("");
  const [numbers, setNumbers] = useState(() => {
    const map = {};
    SERIALS.forEach((s) => (map[s] = ""));
    return map;
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/result/current-timeslot")
      .then((res) => {
        setTimeslot(res.data.timeslot || "");
        if (res.data.slot_date) {
          setSlotDate(res.data.slot_date);
          setSlotDateText(formatDDMMYY(res.data.slot_date));
        }
      })
      .catch(() => setTimeslot(""));
  }, []);

  const publishAll = async () => {
    setMsg("");
    setError("");

    if (!slotDate || !/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
      setError("Invalid Slot Date. Use DD/MM/YY");
      return;
    }

    const payload = SERIALS
      .map((serial) => ({ serial, n: normalizeNumber(numbers[serial]) }))
      .filter((x) => x.n !== null);

    if (payload.length === 0) {
      setError("Fill at least one winning number (0–99)");
      return;
    }

    for (const x of payload) {
      if (Number.isNaN(x.n) || x.n < 0 || x.n > 99) {
        setError(`Invalid number for ${x.serial}. Must be 0–99`);
        return;
      }
    }

    try {
      setBusy(true);

      try {
        const res = await api.post("/result/manual-bulk", {
          timeslot,
          slot_date: slotDate,
          results: payload.map((x) => ({ serial: x.serial, winning_number: x.n })),
        });

        const published = res.data?.published || [];
        const failed = res.data?.failed || null;
        const okText = published.length ? `Published: ${published.join(", ")}` : "";
        const failText = failed ? `Failed: ${Object.keys(failed).join(", ")}` : "";
        const dateText = slotDateText ? `Date: ${slotDateText}` : "";
        setMsg([res.data?.message, dateText, okText, failText].filter(Boolean).join(" • ") || "Bulk publish completed");
      } catch (e) {
        if (e.response?.status === 404 || e.response?.status === 400) {
          throw e;
        }

        const published = [];
        const failed = {};
        for (const x of payload) {
          try {
            await api.post("/result/manual", {
              serial: x.serial,
              timeslot,
              slot_date: slotDate,
              winning_number: x.n,
            });
            published.push(x.serial);
          } catch (err) {
            failed[x.serial] = err.response?.data?.detail || "Failed";
          }
        }

        const okText = published.length ? `Published: ${published.join(", ")}` : "";
        const failText = Object.keys(failed).length ? `Failed: ${Object.keys(failed).join(", ")}` : "";
        const dateText = slotDateText ? `Date: ${slotDateText}` : "";
        setMsg([dateText, okText, failText].filter(Boolean).join(" • ") || "Publish completed");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to publish result");
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    const map = {};
    SERIALS.forEach((s) => (map[s] = ""));
    setNumbers(map);
  };

  return (
    <DashboardLayout>
      <div className="card p-4" style={{ maxWidth: 720 }}>
        <h4 className="mb-3">Manual Result Upload</h4>

        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <label className="mb-1">Time Slot</label>
        <input className="form-control mb-3" value={timeslot} onChange={(e) => setTimeslot(e.target.value)} />

        <label className="mb-1">Slot Date (DD/MM/YY)</label>
        <input
          type="text"
          className="form-control mb-3"
          value={slotDateText}
          placeholder="DD/MM/YY"
          disabled={busy}
          onChange={(e) => {
            const txt = e.target.value;
            setSlotDateText(txt);
            const iso = parseDateToISO(txt);
            if (iso) setSlotDate(iso);
          }}
          onBlur={() => {
            const iso = parseDateToISO(slotDateText);
            if (iso) setSlotDateText(formatDDMMYY(iso));
          }}
        />

        <div className="row g-2">
          {SERIALS.map((s) => (
            <div key={s} className="col-6 col-md-4 col-lg-3">
              <label className="form-label mb-1">{s}</label>
              <input
                type="number"
                min="0"
                max="99"
                className="form-control"
                placeholder="0–99"
                value={numbers[s]}
                disabled={busy}
                onChange={(e) =>
                  setNumbers((prev) => ({
                    ...prev,
                    [s]: e.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>

        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-success flex-grow-1" onClick={publishAll} disabled={busy}>
            {busy ? "Publishing..." : "Publish All"}
          </button>
          <button className="btn btn-outline-light" onClick={clearAll} disabled={busy}>
            Clear
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
