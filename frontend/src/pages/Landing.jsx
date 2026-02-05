import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchTriviaQuestion } from "../services/quiz";

const QUESTION_DURATION_SECONDS = 20;

// Simple daily show schedule (local time). Adjust times as needed.
// The quiz only runs during one of these windows.
const SHOW_SLOTS = [
  // Default: always live (so you don't see "No live show").
  // If you want fixed shows, replace this with specific windows.
  { start: "00:00", end: "23:59", label: "Live Show" }
];

function parseTimeToTodayMs(now, hhmm) {
  const [hh, mm] = hhmm.split(":").map((v) => Number(v));
  const d = new Date(now);
  d.setHours(hh, mm, 0, 0);
  return d.getTime();
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

function getShowStatus(now) {
  const nowMs = now.getTime();
  const slots = SHOW_SLOTS.map((slot) => {
    const startMs = parseTimeToTodayMs(now, slot.start);
    const endMs = parseTimeToTodayMs(now, slot.end);
    return { ...slot, startMs, endMs };
  }).sort((a, b) => a.startMs - b.startMs);

  const active = slots.find((s) => nowMs >= s.startMs && nowMs < s.endMs);
  if (active) {
    return {
      state: "active",
      slot: active,
      secondsToSlotEnd: Math.ceil((active.endMs - nowMs) / 1000)
    };
  }

  const next = slots.find((s) => nowMs < s.startMs);
  if (next) {
    return {
      state: "waiting",
      nextSlot: next,
      secondsToNextStart: Math.ceil((next.startMs - nowMs) / 1000)
    };
  }

  // No more slots today → next is tomorrow's first slot.
  const first = slots[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startMs = parseTimeToTodayMs(tomorrow, first.start);
  return {
    state: "waiting",
    nextSlot: { ...first, startMs },
    secondsToNextStart: Math.ceil((startMs - nowMs) / 1000)
  };
}

export default function Landing() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const status = useMemo(() => getShowStatus(now), [now]);

  const [question, setQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [questionSecondsLeft, setQuestionSecondsLeft] = useState(QUESTION_DURATION_SECONDS);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const slotKey = status.state === "active" ? `${status.slot.start}-${status.slot.end}` : "";
  const activeSlotRef = useRef(slotKey);

  async function loadNextQuestion({ resetTimer = true } = {}) {
    const controller = new AbortController();
    setLoadingQuestion(true);
    setQuestionError("");
    try {
      const q = await fetchTriviaQuestion({ signal: controller.signal });
      setQuestion(q);
      setSelected(null);
      setIsCorrect(null);
      setSubmitted(false);
      if (resetTimer) setQuestionSecondsLeft(QUESTION_DURATION_SECONDS);
    } catch (e) {
      setQuestionError(e?.message || "Failed to load question");
    } finally {
      setLoadingQuestion(false);
    }
    return () => controller.abort();
  }

  // Update clock every second.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // When slot changes, reset state.
  useEffect(() => {
    if (activeSlotRef.current !== slotKey) {
      activeSlotRef.current = slotKey;
      setQuestion(null);
      setSelected(null);
      setIsCorrect(null);
      setQuestionSecondsLeft(QUESTION_DURATION_SECONDS);
      setAnsweredCount(0);
      setCorrectCount(0);
      setShowSummary(false);
      setQuestionError("");
    }

    if (status.state === "active") {
      // Load the first question as soon as the show starts.
      if (!question && !loadingQuestion) {
        loadNextQuestion();
      }
    } else {
      // Not active → no live quiz.
      setQuestion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.state, slotKey]);

  // Question countdown & auto-rotate within active slot.
  useEffect(() => {
    if (status.state !== "active") return;
    if (showSummary) return;

    // If slot is about to end, stop rotating and show summary.
    if (status.secondsToSlotEnd <= 0) {
      setShowSummary(true);
      return;
    }

    const tick = setInterval(() => {
      setQuestionSecondsLeft((prev) => {
        const next = prev - 1;
        return next;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [status.state, status.secondsToSlotEnd, showSummary]);

  useEffect(() => {
    if (status.state !== "active") return;
    if (showSummary) return;

    if (status.secondsToSlotEnd <= 0) {
      setShowSummary(true);
      return;
    }

    if (questionSecondsLeft <= 0) {
      // If the slot doesn't have enough time for another question, end it.
      if (status.secondsToSlotEnd <= 1) {
        setShowSummary(true);
        return;
      }
      loadNextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionSecondsLeft, status.state, status.secondsToSlotEnd, showSummary]);

  const handlePick = (opt) => {
    if (!question) return;
    if (submitted) return;
    setSelected(opt);
  };

  const handleSubmit = () => {
    if (!question) return;
    if (submitted) return;
    if (selected == null) return;
    const ok = selected === question.correctAnswer;
    setIsCorrect(ok);
    setSubmitted(true);
    setAnsweredCount((c) => c + 1);
    if (ok) setCorrectCount((c) => c + 1);
  };

  const endMessage = useMemo(() => {
    if (answeredCount === 0) return "Show ended. Come back for the next slot.";
    return "Thanks for participating!";
  }, [answeredCount]);

  /* ================= QUIZ UI ================= */
  return (
    <div
      className="min-vh-100"
      style={{
        background: "linear-gradient(180deg,#020617,#000)",
        color: "#fff"
      }}
    >
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom border-secondary">
        <h3 className="text-warning fw-bold">BhagyaLaxmi</h3>

        <div>
          <button
            className="btn btn-outline-info me-2"
            onClick={() => navigate("/result")}
          >
            View Result
          </button>
          <button
            className="btn btn-warning"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </div>
      </div>

      {/* LIVE QUIZ */}
      <div className="container py-4">
        <h4 className="text-center mb-2">📺 BhagyaLaxmi Live Quiz Show</h4>
        <p className="text-center text-secondary mb-4">
          Time now: <span className="text-light">{formatClock(now)}</span>
        </p>

        {status.state === "waiting" ? (
          <div className="card bg-dark text-light shadow-sm">
            <div className="card-body text-center">
              <h5 className="text-warning mb-2">No live show right now</h5>
              <p className="mb-2">
                Next show: <span className="text-info fw-bold">{status.nextSlot.label}</span>
              </p>
              <p className="mb-0">
                Starts at <span className="text-light fw-bold">{status.nextSlot.start}</span> — Countdown:{" "}
                <span className="text-success fw-bold">{formatHhMmSs(status.secondsToNextStart)}</span>
              </p>
            </div>
          </div>
        ) : showSummary ? (
          <div className="d-flex justify-content-center">
            <div className="card bg-dark p-4 text-center shadow-lg" style={{ maxWidth: 520 }}>
              <h3 className="text-warning">🎉 Show Ended</h3>
              <h6 className="mt-2 text-secondary">{status.slot.label}</h6>
              <h5 className="mt-3">Answered: {answeredCount}</h5>
              <p className="mt-2 text-info">{endMessage}</p>
              <button
                className="btn btn-outline-light mt-2"
                onClick={() => {
                  // Stay on page; summary will auto-clear when next slot starts.
                  setShowSummary(false);
                  setAnsweredCount(0);
                  setCorrectCount(0);
                  setQuestion(null);
                  setQuestionSecondsLeft(QUESTION_DURATION_SECONDS);
                  if (status.state === "active") loadNextQuestion();
                }}
              >
                Try Again (if slot active)
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="card bg-dark text-light mb-3 shadow-sm">
              <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <div className="text-secondary">Live Slot</div>
                  <div className="fw-bold text-warning">
                    {status.slot.label} ({status.slot.start} - {status.slot.end})
                  </div>
                </div>

                <div className="text-end">
                  <div>
                    Next question in:{" "}
                    <span className="text-success fw-bold">{formatHhMmSs(questionSecondsLeft)}</span>
                  </div>
                  <div>
                    Slot ends in:{" "}
                    <span className="text-info fw-bold">{formatHhMmSs(status.secondsToSlotEnd)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-dark text-light shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <h6 className="mb-1">Question</h6>
                    <div className="text-secondary" style={{ fontSize: 13 }}>
                      Answered: {answeredCount}
                      {question?.category ? ` • ${question.category}` : ""}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-info"
                    disabled={loadingQuestion}
                    onClick={() => loadNextQuestion()}
                    title="Fetch a new question now"
                  >
                    Change Now
                  </button>
                </div>

                <div className="mt-3">
                  {questionError ? (
                    <div className="alert alert-danger mb-0">{questionError}</div>
                  ) : loadingQuestion && !question ? (
                    <div className="text-secondary">Loading question…</div>
                  ) : question ? (
                    <>
                      <h6 className="mb-3">{question.question}</h6>
                      {question.options.map((opt) => {
                        const picked = selected === opt;
                        let btnClass = "btn-outline-light";
                        if (picked) btnClass = submitted ? "btn-primary" : "btn-info";

                        return (
                          <button
                            key={opt}
                            className={`btn w-100 text-start mb-2 ${btnClass}`}
                            disabled={submitted}
                            onClick={() => handlePick(opt)}
                          >
                            {opt}
                          </button>
                        );
                      })}

                      <button
                        className="btn btn-warning w-100 mt-2"
                        disabled={submitted || selected == null}
                        onClick={handleSubmit}
                      >
                        Submit Answer
                      </button>

                      {submitted && (
                        <div className="mt-2">
                          <span className="text-info fw-bold">Submitted successfully</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-secondary">Waiting for question…</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
