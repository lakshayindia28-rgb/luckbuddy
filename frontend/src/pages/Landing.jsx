import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchTriviaQuestions } from "../services/quiz";

const XA_REFRESH_MINUTES = 20;
const REFRESH_VIEW_TIMER_SECONDS = 120;
const TIMER_RADIUS = 52;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

const QUIZ_CODES = Array.from({ length: 10 }, (_, i) => `X${String.fromCharCode(65 + i)}`);

function getXaCycleKey(date = new Date()) {
  const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const cycle = Math.floor(totalMinutes / XA_REFRESH_MINUTES);
  return `${dayKey}-${cycle}`;
}

function getXaSecondsToNextCycle(date = new Date()) {
  const totalSeconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  const cycleSeconds = XA_REFRESH_MINUTES * 60;
  const elapsed = totalSeconds % cycleSeconds;
  const left = cycleSeconds - elapsed;
  return left === 0 ? cycleSeconds : left;
}

function formatHhMmSs(totalSeconds) {
  const safe = Number.isFinite(totalSeconds) ? totalSeconds : 0;
  const s = Math.max(0, Math.floor(safe));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Landing() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [showInstructions, setShowInstructions] = useState(false);

  const [xaTiles, setXaTiles] = useState([]);
  const [xaLoading, setXaLoading] = useState(false);
  const [xaError, setXaError] = useState("");
  const [xaSelections, setXaSelections] = useState({});
  const [xaSubmitted, setXaSubmitted] = useState({});
  const [refreshViewSecondsLeft, setRefreshViewSecondsLeft] = useState(REFRESH_VIEW_TIMER_SECONDS);

  // Update clock every second.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Local 2-minute timer: resets on every page refresh/reload.
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshViewSecondsLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const xaCycleKey = useMemo(() => getXaCycleKey(now), [now]);
  const xaSecondsLeft = useMemo(() => getXaSecondsToNextCycle(now), [now]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadXaTiles() {
      setXaLoading(true);
      setXaError("");
      try {
        const questions = await fetchTriviaQuestions(QUIZ_CODES.length, { signal: controller.signal });
        if (ignore) return;

        const prepared = QUIZ_CODES.map((code, idx) => {
          const source = questions[idx % questions.length];
          return {
            code,
            question: source.question,
            options: source.options,
            correctAnswer: source.correctAnswer,
            category: source.category,
          };
        });

        setXaTiles(prepared);
        setXaSelections({});
        setXaSubmitted({});
      } catch (e) {
        if (ignore || e?.name === "AbortError") return;
        setXaError(e?.message || "Failed to load XA-XJ questions");
        setXaTiles([]);
      } finally {
        if (!ignore) setXaLoading(false);
      }
    }

    loadXaTiles();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [xaCycleKey]);

  const handleXaPick = (code, option) => {
    if (xaSubmitted[code]) return;
    setXaSelections((prev) => ({ ...prev, [code]: option }));
  };

  const handleXaSubmit = (code) => {
    const picked = xaSelections[code];
    if (!picked) return;
    setXaSubmitted((prev) => ({ ...prev, [code]: true }));
  };

  const timerProgress = Math.max(0, Math.min(1, refreshViewSecondsLeft / REFRESH_VIEW_TIMER_SECONDS));
  const timerOffset = TIMER_CIRCUMFERENCE * (1 - timerProgress);

  /* ================= QUIZ UI ================= */
  return (
    <div className="landing-quiz-page min-vh-100">
      {showInstructions && (
        <>
          <div className="landing-instructions-backdrop" onClick={() => setShowInstructions(false)}></div>
          <aside className="landing-instructions-drawer">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 fw-bold">Quiz Instructions</h5>
              <button
                className="btn btn-sm btn-outline-light"
                onClick={() => setShowInstructions(false)}
              >
                Close
              </button>
            </div>

            <h6 className="fw-bold mb-1">Time Limit</h6>
            <p className="mb-3">You have a limited time to complete each quiz session. The timer shows the remaining time for the current slot.</p>

            <h6 className="fw-bold mb-1">Answering Questions</h6>
            <p className="mb-3">Select one answer for each question. All questions are mandatory. Review your answers before submitting.</p>

            <h6 className="fw-bold mb-1">Important Notes</h6>
            <ul className="mb-3 ps-3">
              <li>Quiz runs in multiple time slots throughout the day</li>
              <li>Each slot has unique questions</li>
              <li>Timer will blink when 2 minutes remain</li>
              <li>Submit before time expires</li>
              <li>Questions are labeled with brand codes (XA, XB, etc.)</li>
            </ul>

            <h6 className="fw-bold mb-1">Scoring</h6>
            <p className="mb-0">Each correct answer carries equal marks. There is no negative marking for incorrect answers.</p>
          </aside>
        </>
      )}

      {/* HEADER */}
      <div className="landing-quiz-header d-flex justify-content-between align-items-center px-4 py-3">
        <h3 className="fw-bold mb-0">BhagyaLaxmi</h3>

        <div>
          <button
            className="btn btn-dark me-2"
            onClick={() => navigate("/result")}
          >
            View Result
          </button>
          <button
            className="btn btn-danger"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </div>
      </div>

      {/* XA-XJ QUIZ */}
      <div className="container py-4">
        <h4 className="text-center mb-2 text-dark fw-bold">📺 BhagyaLaxmi Live Quiz Tiles</h4>
        <p className="text-center text-dark mb-4 fw-semibold">
          Time now: <span className="text-danger">{formatClock(now)}</span>
        </p>
        <div className="d-flex justify-content-start mb-3">
          <button
            className="btn btn-dark"
            onClick={() => setShowInstructions(true)}
          >
            Quiz Instructions
          </button>
        </div>

        <div className="card landing-quiz-card landing-quiz-random-card shadow-sm mt-4">
          <div className="card-body">
            <div className="mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
              <h5 className="mb-0 text-warning">Live Quiz Tiles (XA–XJ)</h5>
              <div className="landing-timer-wrap" style={{ width: 96, height: 96 }}>
                <svg width="96" height="96" viewBox="0 0 128 128">
                  <circle className="landing-timer-bg" cx="64" cy="64" r={TIMER_RADIUS}></circle>
                  <circle
                    className="landing-timer-progress"
                    cx="64"
                    cy="64"
                    r={TIMER_RADIUS}
                    strokeDasharray={TIMER_CIRCUMFERENCE}
                    strokeDashoffset={timerOffset}
                  ></circle>
                </svg>
                <div className="landing-timer-text" style={{ fontSize: 14 }}>{formatHhMmSs(refreshViewSecondsLeft)}</div>
              </div>
            </div>

            {xaError ? (
              <div className="alert alert-danger mb-0">{xaError}</div>
            ) : xaLoading && xaTiles.length === 0 ? (
              <div className="text-secondary">Loading live XA–XJ questions…</div>
            ) : (
              <div className="landing-quiz-grid">
                {xaTiles.map((tile) => {
                  const picked = xaSelections[tile.code];
                  const isSubmitted = Boolean(xaSubmitted[tile.code]);
                  return (
                    <div key={tile.code} className="landing-quiz-tile">
                      <span className="landing-quiz-code">{tile.code}</span>
                      <p className="landing-quiz-question">{tile.question}</p>
                      <div className="landing-quiz-options">
                        {tile.options.map((opt) => (
                          <label key={`${tile.code}-${opt}`} className="landing-quiz-option">
                            <input
                              type="radio"
                              name={`xa-${tile.code}`}
                              checked={picked === opt}
                              disabled={isSubmitted}
                              onChange={() => handleXaPick(tile.code, opt)}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        className="btn btn-sm btn-warning w-100 mt-2"
                        onClick={() => handleXaSubmit(tile.code)}
                        disabled={isSubmitted || !picked}
                      >
                        {isSubmitted ? "Submitted" : "Submit"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {xaLoading && xaTiles.length > 0 && (
              <div className="text-secondary mt-3" style={{ fontSize: 13 }}>
                Refreshing next XA–XJ set…
              </div>
            )}
            {!xaLoading && !xaError && xaTiles.length === 0 && (
              <div className="text-secondary">No questions available right now.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
