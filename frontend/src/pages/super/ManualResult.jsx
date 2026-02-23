import { useEffect, useState } from "react";
import api from "../../services/api";
import DashboardLayout from "../../components/DashboardLayout";
import { formatDDMMYY } from "../../utils/date";

const SERIALS = ["XA", "XB", "XC", "XD", "XE", "XF", "XG", "XH", "XI", "XJ"];

function toTimeslotFromHHMM(hhmm = "") {
  const m = String(hhmm).match(/^(\d{2}):(\d{2})$/);
  if (!m) return "";

  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";

  const startTotal = hours * 60 + Math.floor(minutes / 15) * 15;
  const endTotal = (startTotal + 15) % (24 * 60);

  const startHH = String(Math.floor(startTotal / 60)).padStart(2, "0");
  const startMM = String(startTotal % 60).padStart(2, "0");
  const endHH = String(Math.floor(endTotal / 60)).padStart(2, "0");
  const endMM = String(endTotal % 60).padStart(2, "0");

  return `${startHH}:${startMM}-${endHH}:${endMM}`;
}

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
  const [timeslot, setTimeslot] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]); // [{timeslot, fully_published, published_count, total_serials, published_serials}]
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [numbers, setNumbers] = useState(() => {
    const map = {};
    SERIALS.forEach((s) => (map[s] = ""));
    return map;
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ticketSummary, setTicketSummary] = useState(() =>
    SERIALS.map((serial) => ({ serial, total_points: 0, entries: 0 }))
  );
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [grandTotalPoints, setGrandTotalPoints] = useState(0);

  const quickDateTimeValue = `${slotDate || ""}T${timeslot?.slice(0, 5) || "00:00"}`;

  useEffect(() => {
    api
      .get("/result/current-timeslot")
      .then((res) => {
        setTimeslot(res.data.timeslot || "");
        if (res.data.slot_date) {
          setSlotDate(res.data.slot_date);
        }
      })
      .catch(() => setTimeslot(""));
  }, []);

  // Fetch all 15-min timeslots for selected date
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!slotDate || !/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) return;
      try {
        setSlotsLoading(true);
        const res = await api.get("/result/timeslots", {
          params: { slot_date: slotDate },
        });
        if (cancelled) return;
        const items = res.data?.items || [];
        setAvailableSlots(items);

        // If timeslot is empty or not in the list, default it
        const slots = items.map((x) => x.timeslot);
        if (!timeslot || (slots.length && !slots.includes(timeslot))) {
          setTimeslot(slots[0] || timeslot);
        }
      } catch {
        if (cancelled) return;
        setAvailableSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotDate]);

  // Load existing published results for the selected slot (fills only empty inputs)
  useEffect(() => {
    let cancelled = false;

    const loadExisting = async () => {
      if (!slotDate || !/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) return;
      if (!timeslot) return;

      try {
        const res = await api.get("/result/by-slot", {
          params: { slot_date: slotDate, timeslot },
        });
        if (cancelled) return;

        const items = res.data?.items || [];
        if (!Array.isArray(items) || items.length === 0) return;

        setNumbers((prev) => {
          const next = { ...prev };
          for (const r of items) {
            const serial = r?.serial;
            const win = r?.winning_number;
            if (!serial || win == null) continue;
            if (String(next[serial] || "").trim() !== "") continue; // don't overwrite
            next[serial] = String(win);
          }
          return next;
        });
      } catch {
        // ignore
      }
    };

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [slotDate, timeslot]);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      if (!slotDate || !/^\d{4}-\d{2}-\d{2}$/.test(slotDate) || !timeslot) {
        if (cancelled) return;
        setTicketSummary(SERIALS.map((serial) => ({ serial, total_points: 0, entries: 0 })));
        setGrandTotalPoints(0);
        setSummaryError("");
        return;
      }

      try {
        setSummaryLoading(true);
        setSummaryError("");
        const res = await api.get("/result/slot-ticket-summary", {
          params: { slot_date: slotDate, timeslot },
        });
        if (cancelled) return;

        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setTicketSummary(
          SERIALS.map((serial) => {
            const found = items.find((x) => x?.serial === serial);
            return {
              serial,
              total_points: Number(found?.total_points || 0),
              entries: Number(found?.entries || 0),
            };
          })
        );
        setGrandTotalPoints(Number(res.data?.grand_total_points || 0));
      } catch {
        if (cancelled) return;
        setTicketSummary(SERIALS.map((serial) => ({ serial, total_points: 0, entries: 0 })));
        setGrandTotalPoints(0);
        setSummaryError("Failed to load ticket totals");
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [slotDate, timeslot]);

  const publishAll = async () => {
    setMsg("");
    setError("");

    if (!slotDate || !/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
      setError("Invalid Slot Date. Use YYYY-MM-DD");
      return;
    }

    if (!timeslot) {
      setError("Please select a time slot");
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
        const dateText = slotDate ? `Date: ${formatDDMMYY(slotDate)}` : "";
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
        const dateText = slotDate ? `Date: ${formatDDMMYY(slotDate)}` : "";
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

  const applyQuickDateTime = (value) => {
    const raw = String(value || "").trim();
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
    if (!m) return;

    const nextDate = m[1];
    const nextTimeslot = toTimeslotFromHHMM(m[2]);
    if (!nextTimeslot) return;

    setSlotDate(nextDate);
    setTimeslot(nextTimeslot);
  };

  return (
    <DashboardLayout>
      <div className="row g-3 align-items-start manual-result-page">
        <div className="col-12 col-xl-8">
          <div className="card p-4">
            <h4 className="mb-3">Manual Result Upload</h4>

            {msg && <div className="alert alert-success">{msg}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="mb-1">Slot Date</label>
                <input
                  type="date"
                  className="form-control manual-result-picker"
                  value={slotDate}
                  disabled={busy}
                  onChange={(e) => setSlotDate(e.target.value)}
                />
                <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                  {slotDate ? `Selected: ${formatDDMMYY(slotDate)}` : ""}
                </div>
              </div>

              <div className="col-12 col-md-6">
                <label className="mb-1">Time Slot</label>
                <select
                  className="form-select"
                  value={timeslot}
                  disabled={busy || slotsLoading}
                  onChange={(e) => setTimeslot(e.target.value)}
                >
                  {(availableSlots.length ? availableSlots : [{ timeslot }])
                    .filter((x) => x?.timeslot)
                    .map((x) => {
                      const label = x?.published_count != null && x?.total_serials != null
                        ? `${x.timeslot} (${x.published_count}/${x.total_serials} published)`
                        : x.timeslot;
                      return (
                        <option key={x.timeslot} value={x.timeslot}>
                          {label}
                        </option>
                      );
                    })}
                </select>
                <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                  {slotsLoading ? "Loading time slots..." : "15-minute slots for selected date"}
                </div>
              </div>

            </div>

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
        </div>

        <div className="col-12 col-xl-4">
          <div className="card p-3">
            <h5 className="mb-2">Ticket Totals (XA–XJ)</h5>
            <div className="mb-2">
              <label className="mb-1">Quick Date & Time Picker</label>
              <input
                type="datetime-local"
                className="form-control manual-result-picker"
                value={quickDateTimeValue}
                disabled={busy || slotsLoading}
                onChange={(e) => applyQuickDateTime(e.target.value)}
              />
              <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                Pick any date-time to auto-select 15-minute slot
              </div>
            </div>
            <div className="text-muted mb-2" style={{ fontSize: 12 }}>
              {slotDate ? formatDDMMYY(slotDate) : "--"} • {timeslot || "--"}
            </div>
            <div className="fw-semibold mb-2">Total: {grandTotalPoints}</div>

            {summaryError && <div className="alert alert-danger py-2 mb-2">{summaryError}</div>}

            <div className="table-responsive">
              <table className="table table-dark table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th>Serial</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketSummary.map((row) => (
                    <tr key={row.serial}>
                      <td>{row.serial}</td>
                      <td className="text-end">{row.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-muted mt-2" style={{ fontSize: 12 }}>
              {summaryLoading ? "Loading ticket totals..." : "Selected slot totals"}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
