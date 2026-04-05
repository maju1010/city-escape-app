"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import NavigationView from "./NavigationView";
import { unlockAudio, isAudioRunning, playTick, playSuccess, playError, playHint, playDing, playFanfare, playTypeTick } from "@/lib/sounds";
import { useI18n } from "@/lib/useI18n";
import { supabase } from "@/lib/supabase";
import { ACTIVE_GAME_KEY } from "@/app/ContinueBanner";
import { getLocationImage } from "@/lib/locationImages";

// ── Haptic wrapper – Android only (iOS has no vibrate API) ──
function haptic(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch { /* ignore */ }
}

// ── Error boundary ──
class GameErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GameErrorBoundary]", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[999] bg-black flex flex-col items-start justify-start p-6 overflow-auto">
          <p className="text-red-400 font-bold text-lg mb-2">Crash fanget:</p>
          <pre className="text-red-300 text-xs whitespace-pre-wrap break-all bg-[#1a0a0a] p-4 rounded-xl w-full mb-4">
            {this.state.error.message}{"\n\n"}{this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="bg-amber-600 text-black font-bold py-3 px-6 rounded-xl"
          >
            Prøv igen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function TaskImage({ locationName, imageUrl }: { locationName: string; imageUrl: string | null }) {
  const [error, setError] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (shouldReduce) return;
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [shouldReduce]);

  if (!locationName && !imageUrl) return null;
  const src = getLocationImage(locationName, imageUrl);
  return (
    <div className="relative h-36 w-full overflow-hidden bg-bg-secondary">
      {!error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={locationName}
          className="w-full object-cover"
          style={{
            height: "150%",
            transform: shouldReduce ? undefined : `translateY(${Math.min(scrollY * 0.3, 24)}px)`,
            willChange: shouldReduce ? undefined : "transform",
          }}
          onError={() => setError(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1820]" />
    </div>
  );
}

export type Task = {
  id: string;
  order_number: number;
  title: string;
  location_name: string;
  latitude: number;
  longitude: number;
  narrative_intro: string;
  question: string;
  answer: string;
  answer_type: "text" | "photo" | "multiple_choice" | "combination_lock" | "word_scramble" | "number_picker";
  choices: string | null;
  narrative_reward: string;
  hint1: string;
  hint2: string;
  hint3: string;
  image_url: string | null;
};

export type Scenario = {
  id: string;
  title: string;
  intro: string;
};

// ── Typewriter narrative ──
function TypewriterText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const skip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRevealed(text.length);
    setDone(true);
  }, [text.length]);

  useEffect(() => {
    setRevealed(0);
    setDone(false);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setRevealed(i);
      // Play tick every 3 chars — not on spaces/punctuation to keep it natural
      const ch = text[i - 1];
      if (i % 3 === 0 && ch && !/[\s,.]/.test(ch)) playTypeTick();
      if (i >= text.length) {
        clearInterval(intervalRef.current!);
        setDone(true);
      }
    }, 30);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [text]);

  return (
    <div onClick={skip} className="cursor-pointer select-none" title="Tryk for at springe frem">
      {text.slice(0, revealed)}
      {!done && (
        <span
          className="inline-block w-[2px] h-[1em] bg-amber-500 ml-[1px] align-middle"
          style={{ animation: "pulse-blink 0.7s step-start infinite" }}
        />
      )}
      {!done && (
        <span className="block text-[10px] text-text-tertiary mt-2 not-italic tracking-wide">
          Tryk for at springe frem →
        </span>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Drum combination lock ──
const DRUM_H = 56;
const DRUM_REPS = 5;

function DrumWheel({ digit, onChange }: { digit: number; onChange: (d: number) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDigit = useRef(digit);
  const items = Array.from({ length: 10 * DRUM_REPS }, (_, i) => i % 10);

  function scrollToDigit(d: number, animate = false) {
    const el = scrollRef.current;
    if (!el) return;
    const top = (20 + d) * DRUM_H;
    if (animate) {
      el.scrollTo({ top, behavior: "smooth" });
    } else {
      el.scrollTop = top;
    }
  }

  useEffect(() => { scrollToDigit(digit); }, []); // eslint-disable-line

  useEffect(() => {
    if (digit !== prevDigit.current) {
      prevDigit.current = digit;
      scrollToDigit(digit);
    }
  }, [digit]); // eslint-disable-line

  function handleScroll() {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / DRUM_H);
      const d = ((idx % 10) + 10) % 10;
      prevDigit.current = d;
      if (d !== digit) {
        onChange(d);
        playTick();
        haptic(18);
      }
      if (idx < 5 || idx > 10 * DRUM_REPS - 5) {
        el.scrollTop = (20 + d) * DRUM_H;
      }
    }, 180);
  }

  return (
    <div className="relative select-none" style={{ width: 56, height: DRUM_H * 3 }}>
      <div
        ref={scrollRef}
        className="drum-scroll"
        onTouchStart={unlockAudio}
        onScroll={handleScroll}
        style={{
          width: "100%",
          height: "100%",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
        }}
      >
        <div style={{ height: DRUM_H, flexShrink: 0 }} />
        {items.map((d, i) => (
          <div
            key={i}
            style={{
              height: DRUM_H,
              scrollSnapAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: "bold",
              color: "#fbbf24",
              fontVariantNumeric: "tabular-nums",
              userSelect: "none",
            }}
          >
            {d}
          </div>
        ))}
        <div style={{ height: DRUM_H, flexShrink: 0 }} />
      </div>
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: DRUM_H,
          height: DRUM_H,
          borderTop: "1.5px solid #92400e",
          borderBottom: "1.5px solid #92400e",
          background: "rgba(146,64,14,0.08)",
        }}
      />
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: DRUM_H, background: "linear-gradient(to bottom, #1a1820 30%, transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: DRUM_H, background: "linear-gradient(to top, #1a1820 30%, transparent)" }} />
    </div>
  );
}

function DrumLock({ value, numDigits, onChange }: { value: string; numDigits: number; onChange: (v: string) => void }) {
  const digits = value.padStart(numDigits, "0").slice(0, numDigits).split("").map(Number);

  function setDigit(i: number, d: number) {
    const next = [...digits];
    next[i] = d;
    onChange(next.join(""));
  }

  return (
    <div className="flex justify-center my-5">
      <div className="relative bg-bg-primary border-2 border-amber-900/60 rounded-2xl px-4 py-3 flex gap-3 items-center shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-0 rounded-2xl bg-amber-900/5 pointer-events-none" />
        {digits.map((d, i) => (
          <DrumWheel key={i} digit={d} onChange={(v) => setDigit(i, v)} />
        ))}
      </div>
    </div>
  );
}

// ── Number picker ──
function NumberPicker({
  answerState,
  onCheck,
  onReset,
}: {
  answerState: "idle" | "correct" | "wrong";
  onCheck: (v: string) => void;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  function pick(n: number) {
    setSelected(n);
    if (answerState === "wrong") onReset();
  }

  return (
    <div className="mb-6">
      <p className="text-xs text-text-tertiary tracking-widest uppercase text-center mb-4">
        Vælg et tal
      </p>
      <div className="flex flex-wrap justify-center gap-3 mb-5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const isSelected = selected === n;
          return (
            <button
              key={n}
              onClick={() => pick(n)}
              className={`w-16 h-16 rounded-2xl text-2xl font-bold border-2 transition-all duration-150 select-none active:scale-90 ${
                isSelected
                  ? "bg-amber-600 border-amber-400 text-bg-primary shadow-[0_0_18px_rgba(245,158,11,0.45)]"
                  : "bg-bg-secondary border-amber-900/40 text-amber-300 hover:border-amber-500 hover:bg-amber-900/20"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {answerState === "wrong" && (
        <p className="text-red-400 text-sm text-center mb-3">Forkert tal – prøv igen</p>
      )}
      <button
        onClick={() => selected !== null && onCheck(String(selected))}
        disabled={selected === null}
        className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-bg-primary font-semibold text-base transition-all disabled:opacity-40"
      >
        Tjek svar
      </button>
    </div>
  );
}

// ── Word scramble ──
function deterministicScramble(word: string): string {
  const upper = word.toUpperCase().replace(/\s/g, "");
  const chars = upper.split("");
  let s = chars.reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let i = chars.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const result = chars.join("");
  return result === upper ? chars.reverse().join("") : result;
}

function parseScrambledLetters(raw: string): string[] {
  if (raw.includes("|")) {
    return raw.split("|").map((c) => c.trim().toUpperCase()).filter(Boolean);
  }
  return raw.toUpperCase().split("");
}

function WordScramble({
  answer,
  rawChoices,
  answerState,
  onCheck,
  onWrong,
}: {
  answer: string;
  rawChoices: string;
  answerState: "idle" | "correct" | "wrong";
  onCheck: (v: string) => void;
  onWrong: () => void;
}) {
  const letters = parseScrambledLetters(rawChoices);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (answerState === "idle") setSelected([]);
  }, [answerState]);

  function pick(i: number) {
    if (selected.includes(i)) return;
    setSelected((s) => [...s, i]);
    if (answerState === "wrong") onWrong();
  }

  function deleteLast() {
    setSelected((s) => s.slice(0, -1));
    if (answerState === "wrong") onWrong();
  }

  function clearAll() {
    setSelected([]);
    if (answerState === "wrong") onWrong();
  }

  function check() {
    const word = selected.map((i) => letters[i]).join("");
    onCheck(word);
  }

  const built = selected.map((i) => letters[i]);

  return (
    <div className="mb-6">
      <div className="bg-bg-card border border-amber-900/30 rounded-xl px-4 py-3 mb-5 text-center">
        <p className="text-amber-400 font-semibold text-base">Sæt bogstaverne i den rigtige rækkefølge</p>
        <p className="text-text-tertiary text-xs mt-1">Svaret er {answer.replace(/\s/g, "").length} bogstaver</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-5">
        {letters.map((letter, i) => {
          const used = selected.includes(i);
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={used}
              className={`w-13 h-13 min-w-[3rem] min-h-[3rem] text-xl font-bold rounded-xl border-2 transition-all select-none ${
                used
                  ? "border-transparent text-transparent bg-bg-card cursor-default"
                  : "border-amber-700 text-amber-300 bg-bg-secondary hover:border-amber-400 hover:bg-amber-900/20 active:scale-90"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center gap-2 mb-4 min-h-[3.5rem] flex-wrap">
        {built.length === 0 ? (
          <div className="flex gap-2">
            {Array.from({ length: answer.replace(/\s/g, "").length }).map((_, i) => (
              <div key={i} className="w-12 h-12 rounded-xl border-2 border-dashed border-bg-inset" />
            ))}
          </div>
        ) : (
          built.map((letter, i) => (
            <div key={i} className="w-12 h-12 flex items-center justify-center bg-bg-card border-2 border-amber-600 rounded-xl text-amber-300 text-xl font-bold">
              {letter}
            </div>
          ))
        )}
      </div>
      {answerState === "wrong" && (
        <p className="text-red-400 text-sm text-center mb-3">Forkert rækkefølge – prøv igen</p>
      )}
      <div className="flex gap-3 mb-2">
        <button
          onClick={deleteLast}
          disabled={selected.length === 0}
          className="flex-1 py-3 rounded-xl border border-amber-900/40 hover:border-amber-700 text-amber-800 hover:text-amber-600 font-semibold text-base transition-all disabled:opacity-30"
        >
          ← Slet
        </button>
        <button
          onClick={check}
          disabled={selected.length !== answer.replace(/\s/g, "").length}
          className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-bg-primary font-semibold text-base transition-all disabled:opacity-40"
        >
          Tjek svar
        </button>
      </div>
      {selected.length > 0 && (
        <button
          onClick={clearAll}
          className="w-full text-text-tertiary hover:text-amber-800 text-sm underline underline-offset-2 transition-colors py-1"
        >
          Ryd alle
        </button>
      )}
    </div>
  );
}

// ── Phase type ──
type Phase = "navigation" | "task" | "finished";

function GameClientInner({
  scenario,
  tasks,
}: {
  scenario: Scenario;
  tasks: Task[];
}) {
  const SESSION_KEY = `cityescape_session_${scenario.id}`;

  // ── All state – declared unconditionally at the top ──
  const [phase, setPhase] = useState<Phase>("navigation");
  const [teamName, setTeamName] = useState("Holdet");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [hintsShown, setHintsShown] = useState(0);
  const [totalHints, setTotalHints] = useState(0);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoAlbum, setPhotoAlbum] = useState<Array<{ taskTitle: string; url: string }>>([]);
  const [lockValue, setLockValue] = useState("0000");
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showGoldRain, setShowGoldRain] = useState(false);

  const shouldReduce = useReducedMotion();
  const { t } = useI18n();
  const answerAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef(Date.now());

  // ── Derived values – must be above all early returns ──
  const task = tasks[currentIndex];
  const choices = task?.choices ? task.choices.split("|").map((c) => c.trim()) : [];
  const shuffledChoices = useMemo(() => {
    if (choices.length === 0) return choices;
    const arr = [...choices];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  // ── Unlock AudioContext on user gestures ──
  // iOS Safari requires AudioContext.resume() inside a touchstart/click.
  // We retry on every gesture (no { once: true }) so a failed first attempt
  // doesn't permanently silence the app. unlockAudio() no-ops once running.
  useEffect(() => {
    function unlock() {
      if (!isAudioRunning()) unlockAudio();
    }
    document.addEventListener("touchstart", unlock, { passive: true });
    document.addEventListener("click",      unlock);
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click",      unlock);
    };
  }, []);

  // ── Restore session + start timer ──
  useEffect(() => {
    const storedTeam = localStorage.getItem("cityescape_teamname") || "Holdet";
    setTeamName(storedTeam);

    let idx = 0;
    let hints = 0;
    let startTs = Date.now();

    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        idx = s.currentIndex ?? 0;
        hints = s.totalHints ?? 0;
        startTs = s.startTime ?? Date.now();
      } else {
        // Fallback: old key format
        const activeRaw = localStorage.getItem(ACTIVE_GAME_KEY);
        if (activeRaw) {
          const s = JSON.parse(activeRaw);
          if (s.scenarioId === scenario.id) {
            idx = s.currentIndex ?? 0;
            hints = s.totalHints ?? 0;
          }
        }
        const oldStart = parseInt(localStorage.getItem(`city-escape-start-${scenario.id}`) ?? "", 10);
        if (!isNaN(oldStart)) startTs = oldStart;
      }
    } catch { /* ignore */ }

    startTsRef.current = startTs;
    setCurrentIndex(idx);
    setTotalHints(hints);

    const firstTask = tasks[idx];
    setPhase(firstTask?.latitude && firstTask?.longitude ? "navigation" : "task");

    const tick = () => setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  // ── Scroll to top on every task / phase change ──
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(id);
  }, [currentIndex, phase]);

  // ── Exit confirmation ──
  useEffect(() => {
    if (phase === "finished") return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    function handlePopState() {
      window.history.pushState(null, "", window.location.href);
      setShowExitModal(true);
    }
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [phase]);

  // ── Confetti ──
  const fireConfetti = useCallback(() => {
    if (shouldReduce) return;
    const colors = ["#f59e0b", "#fbbf24", "#fde68a", "#ffffff", "#d97706", "#f97316", "#34d399"];
    confetti({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.1 }, colors, startVelocity: 45 });
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 60, spread: 70, origin: { x: 0 }, colors, startVelocity: 55 });
      confetti({ particleCount: 50, angle: 120, spread: 70, origin: { x: 1 }, colors, startVelocity: 55 });
    }, 400);
    const end = Date.now() + 2500;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 50, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 50, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [shouldReduce]);

  // Modest single-burst confetti for per-task correct answers
  function fireTaskConfetti() {
    if (shouldReduce) return;
    const colors = ["#f0a830", "#fbbf24", "#fde68a", "#34d399", "#ffffff"];
    confetti({ particleCount: 40, spread: 65, origin: { x: 0.5, y: 0.55 }, colors, startVelocity: 30, gravity: 1.1, ticks: 100 });
  }

  // ── Session persistence helper ──
  function saveSession(index: number, hints: number) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      currentIndex: index,
      totalHints: hints,
      startTime: startTsRef.current,
    }));
    localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      currentIndex: index,
      totalTasks: tasks.length,
      teamName,
      totalHints: hints,
    }));
  }

  // ── Handlers ──
  async function handleNextTask() {
    if (currentIndex + 1 >= tasks.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      const secs = Math.floor((Date.now() - startTsRef.current) / 1000);
      setFinalTime(secs);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ACTIVE_GAME_KEY);
      localStorage.removeItem(`city-escape-start-${scenario.id}`);
      localStorage.removeItem(`city-escape-team-${scenario.id}`);
      setPhase("finished");
      setTimeout(() => { fireConfetti(); playFanfare(); }, 300);
      supabase.from("leaderboard").insert({
        team_name: teamName,
        scenario_id: scenario.id,
        completion_time_seconds: secs,
        hints_used: totalHints,
      }).then(({ error: lbErr }) => {
        if (lbErr) {
          console.error("[Leaderboard] Insert error:", lbErr);
          setLeaderboardError(`${lbErr.message} (kode: ${lbErr.code})`);
        }
      });
    } else {
      playDing();
      const nextIndex = currentIndex + 1;
      const nextTask = tasks[nextIndex];
      saveSession(nextIndex, totalHints);
      setCurrentIndex(nextIndex);
      setTextAnswer("");
      setAnswerState("idle");
      setHintsShown(0);
      setPhotoUploaded(false);
      setLockValue("0000");
      setPhase(nextTask?.latitude && nextTask?.longitude ? "navigation" : "task");
    }
  }

  function handleCheckAnswer(givenOverride?: string) {
    const given = (givenOverride ?? textAnswer).trim();
    const correct = task.answer.trim();

    const isMatch =
      task.answer_type === "combination_lock" || task.answer_type === "number_picker"
        ? parseInt(given, 10) === parseInt(correct, 10)
        : given.toLowerCase() === correct.toLowerCase();

    if (isMatch) {
      setAnswerState("correct");
      playSuccess();
      haptic([50, 30, 50]);
      if (!shouldReduce) {
        // Green ring on the answer area
        const el = answerAreaRef.current;
        if (el) {
          el.classList.remove("correct-ring");
          void el.offsetWidth;
          el.classList.add("correct-ring");
          setTimeout(() => el.classList.remove("correct-ring"), 900);
        }
        // Confetti burst + gold rain
        fireTaskConfetti();
        setShowGoldRain(true);
        setTimeout(() => setShowGoldRain(false), 2200);
        // Green glow on reward box after React renders it
        if (task.narrative_reward) {
          requestAnimationFrame(() => {
            const box = answerAreaRef.current?.querySelector(".reward-box") as HTMLElement | null;
            if (box) {
              box.classList.remove("reward-glow");
              void box.offsetWidth;
              box.classList.add("reward-glow");
              setTimeout(() => box.classList.remove("reward-glow"), 1000);
            }
          });
        }
      }
    } else {
      setAnswerState("wrong");
      playError();
      haptic(200);
      if (!shouldReduce) {
        const el = answerAreaRef.current;
        if (el) {
          el.classList.remove("answer-shake");
          void el.offsetWidth;
          el.classList.add("answer-shake");
          setTimeout(() => el.classList.remove("answer-shake"), 500);
        }
      }
    }
  }

  function jumpToTask(idx: number) {
    const target = tasks[idx];
    setCurrentIndex(idx);
    setTextAnswer("");
    setAnswerState("idle");
    setHintsShown(0);
    setPhotoUploaded(false);
    setLockValue("0000");
    setPhase(target?.latitude && target?.longitude ? "navigation" : "task");
  }

  function handleShowHint() {
    if (hintsShown < 3) {
      playHint();
      const newTotal = totalHints + 1;
      setHintsShown((h) => h + 1);
      setTotalHints(newTotal);
      saveSession(currentIndex, newTotal);
    }
  }

  async function handleSubmitReview() {
    if (reviewRating === 0 || reviewSending) return;
    setReviewSending(true);
    setReviewError(null);
    const { error } = await supabase.from("reviews").insert({
      scenario_id: scenario.id,
      team_name: teamName,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    });
    setReviewSending(false);
    if (error) {
      setReviewError(error.message);
    } else {
      setReviewSubmitted(true);
    }
  }

  function handleShare() {
    const minutes = Math.round(finalTime / 60);
    const text = `${teamName} løste "${scenario.title}" på ${minutes} minut${minutes !== 1 ? "ter" : ""}! 🔍 Prøv selv: city-escape-app.vercel.app`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ── Shared header JSX ──
  const headerJSX = (
    <header className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur border-b border-amber-900/30 px-4 pt-4 pb-3">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-300 font-semibold text-base truncate max-w-[55%]">{teamName}</span>
          <div className="flex items-center gap-2">
            <div className="bg-bg-secondary border border-amber-900/40 rounded-lg px-3 py-1.5 text-amber-400 font-mono text-base tabular-nums">
              {formatTime(elapsed)}
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("openBurgerMenu"))}
              aria-label="Menu"
              className="w-9 h-9 flex flex-col items-center justify-center gap-[4px] rounded-lg bg-bg-secondary border border-amber-900/40 hover:border-amber-600 transition-colors shrink-0"
            >
              <span className="block w-4 h-[2px] bg-amber-500 rounded-full" />
              <span className="block w-4 h-[2px] bg-amber-500 rounded-full" />
              <span className="block w-4 h-[2px] bg-amber-500 rounded-full" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-tertiary tracking-wider uppercase truncate mr-3">{scenario.title}</span>
          <span className="text-xs text-amber-700 shrink-0">{currentIndex + 1} / {tasks.length}</span>
        </div>
        <div className="w-full h-2 bg-bg-inset rounded-full overflow-hidden">
          <div
            className="h-2 bg-gradient-to-r from-amber-700 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / tasks.length) * 100}%` }}
          />
        </div>
      </div>
    </header>
  );

  // ── Finished phase ──
  if (phase === "finished") {
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    const timeFormatted = `${minutes > 0 ? minutes + ":" : ""}${seconds.toString().padStart(2, "0")}`;
    const whatsappText = `Kan I slå vores tid på ${timeFormatted} i ${scenario.title}? 🔍 city-escape-app.vercel.app`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center py-12">
        <motion.div
          className="relative mb-6 flex items-center justify-center"
          initial={shouldReduce ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Ambient glow behind logo */}
          <div className="absolute inset-0 rounded-full blur-2xl opacity-30"
            style={{ background: "radial-gradient(ellipse, rgba(240,168,48,0.6) 0%, transparent 70%)" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://paitcrtbdcvujhpfpbhw.supabase.co/storage/v1/object/public/images/Logo.png"
            alt="City Escape"
            style={{
              maxWidth: 200, width: "100%", height: "auto", position: "relative",
              filter: "drop-shadow(0 0 18px rgba(240,168,48,0.35)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
            }}
          />
        </motion.div>

        <motion.div
          className="text-6xl mb-4"
          initial={shouldReduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.2 }}
        >
          🏆
        </motion.div>
        <motion.h1
          className="text-3xl font-bold text-amber-400 mb-1 tracking-wide"
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Mysteriet er løst!
        </motion.h1>
        <p className="text-amber-600 text-sm tracking-widest uppercase mb-1">{scenario.title}</p>
        <p className="text-text-secondary text-base mb-8">{teamName}</p>

        <div className="flex gap-4 mb-8">
          <div className="bg-bg-secondary border border-amber-900/40 rounded-xl px-6 py-4 text-center">
            <div className="text-2xl font-bold text-amber-300">
              {minutes > 0 ? `${minutes}m ` : ""}{seconds}s
            </div>
            <div className="text-text-tertiary text-xs mt-1 tracking-wide uppercase">Tid brugt</div>
          </div>
          <div className="bg-bg-secondary border border-amber-900/40 rounded-xl px-6 py-4 text-center">
            <div className="text-2xl font-bold text-amber-300">{totalHints}</div>
            <div className="text-text-tertiary text-xs mt-1 tracking-wide uppercase">Hints brugt</div>
          </div>
        </div>

        <p className="text-text-secondary text-base leading-relaxed max-w-sm mb-8">
          Mysteriet er opklaret. Byen har ingen hemmeligheder for jer.
        </p>

        {/* Photo album */}
        {photoAlbum.length > 0 && (
          <motion.div
            className="w-full max-w-xs mb-8"
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <p className="text-text-tertiary text-xs uppercase tracking-widest mb-3 text-center">Fotoalbum</p>
            <div className={`grid gap-3 ${photoAlbum.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {photoAlbum.map((photo) => (
                <div key={photo.taskTitle} className="relative rounded-xl overflow-hidden border border-amber-900/30 aspect-square bg-bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.taskTitle}
                    className="w-full h-full object-cover"
                  />
                  {/* Logo watermark */}
                  <div className="absolute bottom-2 right-2 bg-black/50 rounded-lg p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://paitcrtbdcvujhpfpbhw.supabase.co/storage/v1/object/public/images/Logo.png"
                      alt=""
                      aria-hidden="true"
                      style={{ width: 48, height: "auto", opacity: 0.9 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="w-full max-w-xs flex flex-col gap-3">
          <button
            onClick={handleShare}
            className="w-full bg-amber-600 hover:bg-amber-500 text-bg-primary font-semibold py-4 rounded-xl transition-colors text-base"
          >
            {copied ? "✓ Kopieret!" : "Del dit resultat"}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366]/10 border border-[#25D366]/40 hover:bg-[#25D366]/20 text-[#25D366] font-semibold py-4 rounded-xl transition-colors text-base"
          >
            <span>💬</span> Udfordr et andet hold
          </a>

          <Link
            href={`/leaderboard/${scenario.id}`}
            className="w-full text-center border border-amber-900/40 hover:border-amber-700 text-amber-700 hover:text-amber-500 font-semibold py-4 rounded-xl transition-colors text-base"
          >
            Se leaderboard →
          </Link>

          {leaderboardError && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
              <p className="text-red-400 text-xs font-semibold mb-1">Leaderboard-fejl</p>
              <p className="text-red-400 text-xs font-mono">{leaderboardError}</p>
            </div>
          )}

          <div className="w-full border-t border-amber-900/30 pt-6 mt-2">
            {reviewSubmitted ? (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <p className="text-2xl mb-2">🙏</p>
                <p className="text-amber-400 font-semibold text-base mb-1">Tak for din feedback!</p>
                <p className="text-text-tertiary text-sm">Det hjælper os med at gøre spillet bedre.</p>
              </motion.div>
            ) : (
              <>
                <p className="text-text-secondary text-sm font-semibold mb-3 text-center">Hvordan var oplevelsen?</p>
                <div className="flex justify-center gap-2 mb-4" onMouseLeave={() => setReviewHover(0)}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      className="text-3xl transition-transform active:scale-90"
                      style={{
                        color: star <= (reviewHover || reviewRating) ? "#f59e0b" : "var(--color-bg-inset)",
                        filter: star <= (reviewHover || reviewRating) ? "drop-shadow(0 0 6px rgba(245,158,11,0.5))" : "none",
                        transform: star <= (reviewHover || reviewRating) ? "scale(1.1)" : "scale(1)",
                        transition: "all 0.15s ease",
                      }}
                      aria-label={`${star} stjerne${star !== 1 ? "r" : ""}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Fortæl os hvad du synes (valgfrit)"
                  rows={3}
                  maxLength={500}
                  className="w-full bg-bg-secondary border border-amber-900/30 focus:border-amber-700 rounded-xl px-4 py-3 text-text-primary text-sm placeholder-text-tertiary outline-none transition-colors resize-none mb-3"
                />
                {reviewError && (
                  <p className="text-red-400 text-xs mb-2">{reviewError}</p>
                )}
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || reviewSending}
                  className="w-full py-3 rounded-xl bg-bg-secondary border border-amber-900/40 hover:border-amber-700 text-amber-700 hover:text-amber-500 font-semibold text-base transition-colors disabled:opacity-40"
                >
                  {reviewSending ? "Sender…" : "Send anmeldelse"}
                </button>
              </>
            )}
          </div>

          <Link
            href="/"
            className="text-text-tertiary hover:text-amber-800 text-sm underline underline-offset-2 transition-colors py-1"
          >
            Tilbage til forsiden
          </Link>
        </div>
      </main>
    );
  }

  // ── Navigation phase ──
  if (phase === "navigation") {
    return (
      <div className="min-h-screen bg-bg-nav">
        {headerJSX}
        <NavigationView
          task={task}
          onArrived={() => setPhase("task")}
          onSkip={() => setPhase("task")}
        />
      </div>
    );
  }

  // ── Task phase ──
  const hints = [task?.hint1, task?.hint2, task?.hint3].filter(Boolean);
  const canShowMoreHints = hintsShown < hints.length;
  const mapsUrl =
    task?.latitude && task?.longitude
      ? `https://www.google.com/maps?q=${task.latitude},${task.longitude}`
      : null;
  const lockDigits = task?.answer_type === "combination_lock"
    ? Math.max(task.answer.replace(/\D/g, "").length, 1)
    : 4;
  const taskSolved = answerState === "correct" || (task?.answer_type === "photo" && photoUploaded);

  return (
    <>
      <div className="min-h-screen flex flex-col">
        {headerJSX}

        <main className="flex-1 max-w-lg mx-auto w-full">
          <TaskImage locationName={task.location_name} imageUrl={task.image_url} />

          <div className="px-4 py-5">
            <h2 className="text-xl font-bold text-amber-300 mb-4">{task.title}</h2>

            {task.narrative_intro && (
              <div className="bg-narrative-bg border-l-4 border-narrative-border rounded-r-xl px-5 py-4 mb-5 italic text-text-secondary text-[17px] leading-relaxed">
                <TypewriterText key={task.id} text={task.narrative_intro} />
              </div>
            )}

            {task.location_name && (
              <div className="flex items-center gap-2 mb-5">
                <span className="text-base">📍</span>
                <span className="text-text-secondary text-base">{task.location_name}</span>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-600 hover:text-amber-400 underline underline-offset-2 transition-colors ml-1"
                  >
                    Åbn kort
                  </a>
                )}
              </div>
            )}

            <div className="bg-bg-card border border-amber-900/30 rounded-xl p-5 mb-4">
              <p className="text-text-primary text-[18px] leading-relaxed">{task.question}</p>
            </div>

            {task.latitude && task.longitude && (
              <button
                onClick={() => setPhase("navigation")}
                className="mb-4 text-sm text-amber-700 hover:text-amber-500 underline underline-offset-2 transition-colors flex items-center gap-1"
              >
                {t("showRouteAgain")}
              </button>
            )}

            {/* Answer area */}
            <div ref={answerAreaRef} key={task?.id}>
              {answerState === "correct" ? (
                <div className="reward-box reward-enter bg-[#1a2818] border border-green-800/50 rounded-xl p-5 mb-6">
                  <p className="text-green-400 font-semibold text-base mb-2">{t("correct")}</p>
                  {task.narrative_reward && (
                    <p className="text-[#a8c8a0] text-[17px] leading-relaxed italic">
                      {task.narrative_reward}
                    </p>
                  )}
                </div>
              ) : task.answer_type === "multiple_choice" && shuffledChoices.length > 0 ? (
                <div className="mb-6">
                  <div className="flex flex-col gap-3">
                    {shuffledChoices.map((choice, i) => (
                      <button
                        key={i}
                        onClick={() => handleCheckAnswer(choice)}
                        className={`w-full text-left px-5 py-4 rounded-xl border text-base transition-all ${
                          answerState === "wrong"
                            ? "border-red-800/50 bg-bg-secondary text-text-secondary"
                            : "border-amber-900/40 bg-bg-secondary hover:border-amber-600 hover:bg-bg-inset text-text-primary"
                        }`}
                      >
                        <span className="text-amber-700 mr-3 font-semibold">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {choice}
                      </button>
                    ))}
                  </div>
                  {answerState === "wrong" && (
                    <p className="text-red-400 text-sm mt-3">Ikke rigtigt – prøv igen.</p>
                  )}
                </div>
              ) : task.answer_type === "combination_lock" ? (
                <div className="mb-6">
                  <p className="text-center text-xs text-text-tertiary tracking-widest uppercase mb-1">
                    Træk op/ned for at dreje
                  </p>
                  <DrumLock
                    value={lockValue}
                    numDigits={lockDigits}
                    onChange={(v) => { setLockValue(v); if (answerState === "wrong") setAnswerState("idle"); }}
                  />
                  <button
                    onClick={() => handleCheckAnswer(lockValue)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-bg-primary font-semibold py-4 rounded-xl transition-colors text-base"
                  >
                    {t("unlock")}
                  </button>
                  {answerState === "wrong" && (
                    <p className="text-red-400 text-sm mt-3 text-center">{t("wrongLock")}</p>
                  )}
                </div>
              ) : task.answer_type === "number_picker" ? (
                <NumberPicker
                  key={task.id}
                  answerState={answerState}
                  onCheck={handleCheckAnswer}
                  onReset={() => setAnswerState("idle")}
                />
              ) : task.answer_type === "word_scramble" ? (
                <WordScramble
                  key={task.id}
                  answer={task.answer}
                  rawChoices={task.choices || deterministicScramble(task.answer)}
                  answerState={answerState}
                  onCheck={handleCheckAnswer}
                  onWrong={() => setAnswerState("idle")}
                />
              ) : task.answer_type === "photo" ? (
                <div className="mb-6">
                  {!photoUploaded ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-amber-800/50 hover:border-amber-600 rounded-xl py-10 text-center text-amber-700 hover:text-amber-500 transition-colors text-base"
                    >
                      <span className="block text-3xl mb-2">📷</span>
                      Tryk for at tage/uploade billede
                    </button>
                  ) : (
                    <div className="bg-[#1a2818] border border-green-800/50 rounded-xl p-5">
                      <p className="text-green-400 font-semibold text-base mb-2">✓ Billede uploadet!</p>
                      {task.narrative_reward && (
                        <p className="text-[#a8c8a0] text-base leading-relaxed italic">
                          {task.narrative_reward}
                        </p>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setPhotoAlbum((prev) => {
                          // Replace existing photo for this task if re-taken
                          const filtered = prev.filter((p) => p.taskTitle !== task.title);
                          return [...filtered, { taskTitle: task.title, url }];
                        });
                        setPhotoUploaded(true);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="mb-6">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => {
                      setTextAnswer(e.target.value);
                      if (answerState === "wrong") setAnswerState("idle");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCheckAnswer()}
                    placeholder="Skriv dit svar her..."
                    className={`w-full bg-bg-secondary border rounded-xl px-4 py-4 text-text-primary text-[17px] placeholder-text-tertiary transition-colors input-glow ${
                      answerState === "wrong"
                        ? "border-red-700 focus:border-red-500"
                        : "border-amber-900/40 focus:border-amber-600"
                    }`}
                  />
                  {answerState === "wrong" && (
                    <p className="text-red-400 text-sm mt-2">Forkert svar – prøv igen.</p>
                  )}
                  <button
                    onClick={() => handleCheckAnswer()}
                    disabled={!textAnswer.trim()}
                    className="w-full mt-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900/40 disabled:text-amber-800 text-bg-primary font-semibold py-4 rounded-xl text-base btn-glow disabled:shadow-none"
                  >
                    {t("checkAnswer")}
                  </button>
                </div>
              )}
            </div>

            {/* Hints */}
            {hints.length > 0 && !taskSolved && (
              <div className="mb-6">
                <AnimatePresence initial={false}>
                  {hints.slice(0, hintsShown).map((hint, i) => (
                    <motion.div
                      key={i}
                      initial={shouldReduce ? false : { opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="mb-2 overflow-hidden"
                    >
                      <div className="bg-bg-secondary border border-amber-900/30 rounded-lg px-4 py-3 text-text-secondary text-sm hint-glow">
                        <span className="text-amber-700 font-semibold">Hint {i + 1}: </span>
                        {hint}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {canShowMoreHints && (
                  <button
                    onClick={handleShowHint}
                    className="text-amber-800 hover:text-amber-600 text-sm underline underline-offset-2 transition-colors"
                  >
                    {t("getHint")} {hintsShown > 0 ? `(${hintsShown}/${hints.length})` : ""}
                  </button>
                )}
              </div>
            )}

            {/* Next task */}
            {taskSolved && (
              <button
                onClick={handleNextTask}
                className="w-full bg-amber-600 hover:bg-amber-500 text-bg-primary font-semibold py-4 rounded-xl text-base btn-glow"
              >
                {currentIndex + 1 >= tasks.length ? t("seeResult") : t("nextTask")}
              </button>
            )}
          </div>
        </main>
      </div>

      <div className="h-8" />

      {/* Gold rain particles */}
      {showGoldRain && !shouldReduce && (
        <div aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="gold-particle"
              style={{
                left: `${8 + i * 7.5}%`,
                top: "-10px",
                fontSize: `${14 + (i % 3) * 6}px`,
                animationDuration: `${1.4 + (i % 4) * 0.25}s`,
                animationDelay: `${(i % 5) * 0.08}s`,
              }}
            >
              {(["✦", "★", "◆", "✦"] as const)[i % 4]}
            </div>
          ))}
        </div>
      )}

      {/* Exit confirmation modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-amber-900/40 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-amber-300 font-bold text-lg mb-2">{t("exitTitle")}</h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">{t("exitBody")}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="w-full bg-amber-600 hover:bg-amber-500 text-bg-primary font-semibold py-3 rounded-xl text-base btn-glow"
              >
                {t("continueGame")}
              </button>
              <button
                onClick={() => { window.location.href = "/"; }}
                className="w-full border border-amber-900/40 hover:border-amber-700 text-amber-800 hover:text-amber-600 font-semibold py-3 rounded-xl text-base transition-colors"
              >
                {t("quitGame")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0910]/95 border-t border-gray-800/60 px-3 py-1.5 flex items-center gap-2">
        <span className="text-gray-600 text-[10px] tracking-widest uppercase shrink-0 select-none">⚙ TEST</span>
        <div className="flex gap-1 overflow-x-auto scrollbar-none flex-1">
          {tasks.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpToTask(i)}
              className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                i === currentIndex
                  ? "bg-amber-900/60 text-amber-400"
                  : "text-gray-600 hover:text-gray-400 hover:bg-gray-800/50"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function GameClient(props: { scenario: Scenario; tasks: Task[] }) {
  return (
    <GameErrorBoundary>
      <GameClientInner {...props} />
    </GameErrorBoundary>
  );
}
