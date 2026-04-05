"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import NavigationView from "./NavigationView";
import QRShare from "./QRShare";
import GoldRain from "./GoldRain";
import TaskTransition from "./TaskTransition";
import { playCorrect, playWrong, playHint, playDing, playFanfare } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";
import { ACTIVE_GAME_KEY } from "@/app/ContinueBanner";
import { getLocationImage } from "@/lib/locationImages";

// ── Error boundary – captures runtime crashes and shows them on screen ──
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
  if (!locationName && !imageUrl) return null;
  const src = getLocationImage(locationName, imageUrl);
  return (
    <div className="relative h-36 w-full overflow-hidden bg-[#1a1828]">
      {!error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={locationName}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0e17]" />
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

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getStorageKey(scenarioId: string) {
  return `city-escape-start-${scenarioId}`;
}

function getTeamKey(scenarioId: string) {
  return `city-escape-team-${scenarioId}`;
}

// ── Drum combination lock – CSS scroll-snap ──
const DRUM_H = 56; // px per digit slot
const DRUM_REPS = 5; // repeat 0-9 five times for pseudo-infinite scroll
// scrollTop = itemIndex * DRUM_H  (padding top = DRUM_H cancels out)
// middle rep starts at index 20

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

  // Mount: jump to current digit in middle repetition
  useEffect(() => { scrollToDigit(digit); }, []); // eslint-disable-line

  // Externally-driven digit change (e.g. reset): re-center
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
      if (d !== digit) onChange(d);
      // Silently re-center if near edges (no event loop since scrollTop assignment won't snap-trigger)
      if (idx < 5 || idx > 10 * DRUM_REPS - 5) {
        el.scrollTop = (20 + d) * DRUM_H;
      }
    }, 180);
  }

  return (
    <div className="relative select-none" style={{ width: 56, height: DRUM_H * 3 }}>
      {/* Scrollable column */}
      <div
        ref={scrollRef}
        className="drum-scroll"
        onScroll={handleScroll}
        style={{
          width: "100%",
          height: "100%",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
        }}
      >
        {/* Top spacer so first item can center */}
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
        {/* Bottom spacer */}
        <div style={{ height: DRUM_H, flexShrink: 0 }} />
      </div>

      {/* Selection highlight */}
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
      {/* Fade edges */}
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: DRUM_H, background: "linear-gradient(to bottom, #0d0c17 30%, transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: DRUM_H, background: "linear-gradient(to top, #0d0c17 30%, transparent)" }} />
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
      <div className="relative bg-[#0d0c17] border-2 border-amber-900/60 rounded-2xl px-4 py-3 flex gap-3 items-center shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)]">
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
      <p className="text-xs text-[#6b6380] tracking-widest uppercase text-center mb-4">
        Vælg et tal
      </p>

      {/* Number grid */}
      <div className="flex flex-wrap justify-center gap-3 mb-5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const isSelected = selected === n;
          return (
            <button
              key={n}
              onClick={() => pick(n)}
              className={`w-16 h-16 rounded-2xl text-2xl font-bold border-2 transition-all duration-150 select-none active:scale-90 ${
                isSelected
                  ? "bg-amber-600 border-amber-400 text-[#0f0e17] shadow-[0_0_18px_rgba(245,158,11,0.45)]"
                  : "bg-[#1a1828] border-amber-900/40 text-amber-300 hover:border-amber-500 hover:bg-amber-900/20"
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
        className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold text-base transition-all disabled:opacity-40"
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
  // Ensure it's actually different
  return result === upper ? chars.reverse().join("") : result;
}

// Parse choices for word_scramble: handles both "A|B|C" and "ABC" formats
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

  // Reset selection whenever answerState is reset to idle from outside
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
      {/* Heading */}
      <div className="bg-[#14131f] border border-amber-900/30 rounded-xl px-4 py-3 mb-5 text-center">
        <p className="text-amber-400 font-semibold text-base">Sæt bogstaverne i den rigtige rækkefølge</p>
        <p className="text-[#6b6380] text-xs mt-1">Svaret er {answer.replace(/\s/g, "").length} bogstaver</p>
      </div>

      {/* Scrambled letter pool */}
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
                  ? "border-transparent text-transparent bg-[#14131f] cursor-default"
                  : "border-amber-700 text-amber-300 bg-[#1a1828] hover:border-amber-400 hover:bg-amber-900/20 active:scale-90"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Built word */}
      <div className="flex justify-center gap-2 mb-4 min-h-[3.5rem] flex-wrap">
        {built.length === 0 ? (
          <div className="flex gap-2">
            {Array.from({ length: answer.replace(/\s/g, "").length }).map((_, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-xl border-2 border-dashed border-[#2a2840]"
              />
            ))}
          </div>
        ) : (
          built.map((letter, i) => (
            <div
              key={i}
              className="w-12 h-12 flex items-center justify-center bg-[#14131f] border-2 border-amber-600 rounded-xl text-amber-300 text-xl font-bold"
            >
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
          className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold text-base transition-all disabled:opacity-40"
        >
          Tjek svar
        </button>
      </div>
      {selected.length > 0 && (
        <button
          onClick={clearAll}
          className="w-full text-[#4a4560] hover:text-amber-800 text-sm underline underline-offset-2 transition-colors py-1"
        >
          Ryd alle
        </button>
      )}
    </div>
  );
}

function GameClientInner({
  scenario,
  tasks,
}: {
  scenario: Scenario;
  tasks: Task[];
}) {
  const [teamName, setTeamName] = useState<string | null>(null);
  const [teamInput, setTeamInput] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNavigation, setShowNavigation] = useState(true);
  const [textAnswer, setTextAnswer] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [hintsShown, setHintsShown] = useState(0);
  const [totalHints, setTotalHints] = useState(0);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [lockValue, setLockValue] = useState("0000");
  const [finished, setFinished] = useState(false);
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
  // Test navigation (activated by 5 quick taps on progress bar)
  const [testMode, setTestMode] = useState(false);
  const progressTaps = useRef(0);
  const progressTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Animation states
  const [showGoldRain, setShowGoldRain] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const [transitionTitle, setTransitionTitle] = useState("");
  const [transitionTaskNumber, setTransitionTaskNumber] = useState(1);
  const shouldReduce = useReducedMotion();
  const answerAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore saved team name and progress
  useEffect(() => {
    const savedTeam = localStorage.getItem(getTeamKey(scenario.id));
    if (!savedTeam) return;
    setTeamName(savedTeam);
    try {
      const raw = localStorage.getItem(ACTIVE_GAME_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        if (state.scenarioId === scenario.id) {
          setCurrentIndex(state.currentIndex ?? 0);
          setTotalHints(state.totalHints ?? 0);
        }
      }
    } catch { /* ignore */ }
  }, [scenario.id]);

  // Timer
  useEffect(() => {
    if (!teamName) return;
    const key = getStorageKey(scenario.id);
    let startTs = parseInt(localStorage.getItem(key) ?? "", 10);
    if (!startTs || isNaN(startTs)) {
      startTs = Date.now();
      localStorage.setItem(key, String(startTs));
    }
    function tick() {
      setElapsed(Math.floor((Date.now() - startTs) / 1000));
    }
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [teamName, scenario.id]);

  const fireConfetti = useCallback(() => {
    if (shouldReduce) return;
    const colors = ["#f59e0b", "#fbbf24", "#fde68a", "#ffffff", "#d97706", "#f97316", "#34d399"];
    // Wave 1 – burst from center top
    confetti({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.1 }, colors, startVelocity: 45 });
    // Wave 2 – from sides
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 60, spread: 70, origin: { x: 0 }, colors, startVelocity: 55 });
      confetti({ particleCount: 50, angle: 120, spread: 70, origin: { x: 1 }, colors, startVelocity: 55 });
    }, 400);
    // Wave 3 – lingering stream
    const end = Date.now() + 2500;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 50, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 50, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [shouldReduce]);

  function saveActiveGame(name: string, index: number, hints = totalHints) {
    localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      currentIndex: index,
      totalTasks: tasks.length,
      teamName: name,
      totalHints: hints,
    }));
  }

  // Derived from current task – must be above all early returns to satisfy Rules of Hooks
  const task = tasks[currentIndex];
  const choices = task?.choices ? task.choices.split("|").map((c) => c.trim()) : [];

  // Fisher-Yates shuffle – re-randomised each time a new task is shown
  const shuffledChoices = useMemo(() => {
    if (choices.length === 0) return choices;
    const arr = [...choices];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]); // shuffle once per task (stable within session, random across games)

  // ── Team name screen ──
  function handleStartGame() {
    const name = teamInput.trim() || "Holdet";
    localStorage.setItem(getTeamKey(scenario.id), name);
    saveActiveGame(name, 0);
    setTeamName(name);
  }

  if (!teamName) {
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-amber-700 text-xs tracking-widest uppercase mb-2">{scenario.title}</p>
            <h1 className="text-2xl font-bold text-amber-300">Hvad hedder jeres hold?</h1>
          </div>

          <input
            type="text"
            value={teamInput}
            onChange={(e) => setTeamInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStartGame()}
            placeholder="fx Familie Hansen"
            maxLength={30}
            className="w-full bg-[#1a1828] border border-amber-900/40 focus:border-amber-600 rounded-xl px-4 py-4 text-[#e8e0d0] text-base placeholder-[#4a4560] outline-none transition-colors mb-4"
          />
          <button
            onClick={handleStartGame}
            className="w-full bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold py-4 rounded-xl transition-colors text-base"
          >
            Start spillet →
          </button>
          <p className="text-center text-[#4a4560] text-xs mt-3">
            Lad feltet stå tomt for at bruge &ldquo;Holdet&rdquo;
          </p>

          {/* QR code — secondary section */}
          <QRShare scenarioId={scenario.id} />
        </div>
      </main>
    );
  }

  async function handleNextTask() {
    if (currentIndex + 1 >= tasks.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      const key = getStorageKey(scenario.id);
      const startTs = parseInt(localStorage.getItem(key) ?? "", 10);
      const secs = isNaN(startTs) ? elapsed : Math.floor((Date.now() - startTs) / 1000);
      setFinalTime(secs);
      // Clean up localStorage
      localStorage.removeItem(key);
      localStorage.removeItem(getTeamKey(scenario.id));
      localStorage.removeItem(ACTIVE_GAME_KEY);
      setFinished(true);
      setTimeout(() => { fireConfetti(); playFanfare(); }, 300);
      // Save to leaderboard
      const leaderboardPayload = {
        team_name: teamName,
        scenario_id: scenario.id,
        completion_time_seconds: secs,
        hints_used: totalHints,
      };
      console.log("[Leaderboard] Inserting:", leaderboardPayload);
      supabase.from("leaderboard").insert(leaderboardPayload).then(({ error: lbErr }) => {
        if (lbErr) {
          console.error("[Leaderboard] Insert error:", lbErr);
          setLeaderboardError(`${lbErr.message} (kode: ${lbErr.code})`);
        } else {
          console.log("[Leaderboard] Insert success");
        }
      });
    } else {
      playDing();
      const nextIndex = currentIndex + 1;
      const nextTask = tasks[nextIndex];
      // Show transition overlay (state changes happen underneath it)
      setTransitionTitle(nextTask.title);
      setTransitionTaskNumber(nextIndex + 1);
      setTransitionActive(true);
      saveActiveGame(teamName!, nextIndex);
      setCurrentIndex(nextIndex);
      setShowNavigation(true);
      setTextAnswer("");
      setAnswerState("idle");
      setHintsShown(0);
      setPhotoUploaded(false);
      setLockValue("0000");
    }
  }

  function handleCheckAnswer(givenOverride?: string) {
    const given = (givenOverride ?? textAnswer).trim();
    const correct = task.answer.trim();

    console.log("Sammenligner:", JSON.stringify(given), "med:", JSON.stringify(correct), "type:", typeof given, typeof correct);

    // Combination lock and number picker: compare as integers so "4" matches " 4" etc.
    const isMatch =
      task.answer_type === "combination_lock" || task.answer_type === "number_picker"
        ? parseInt(given, 10) === parseInt(correct, 10)
        : given.toLowerCase() === correct.toLowerCase();

    if (isMatch) {
      setAnswerState("correct");
      playCorrect();
      // Green ring + gold rain
      if (!shouldReduce) {
        const el = answerAreaRef.current;
        if (el) {
          el.classList.remove("correct-ring");
          void el.offsetWidth;
          el.classList.add("correct-ring");
          setTimeout(() => el.classList.remove("correct-ring"), 900);
        }
        setShowGoldRain(true);
        setTimeout(() => setShowGoldRain(false), 2500);
      }
    } else {
      setAnswerState("wrong");
      playWrong();
      // Shake animation
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

  function handleProgressTap() {
    progressTaps.current++;
    if (progressTapTimer.current) clearTimeout(progressTapTimer.current);
    if (progressTaps.current >= 5) {
      progressTaps.current = 0;
      setTestMode((v) => !v);
    } else {
      progressTapTimer.current = setTimeout(() => { progressTaps.current = 0; }, 1500);
    }
  }

  function jumpToTask(idx: number) {
    setCurrentIndex(idx);
    setShowNavigation(true);
    setTextAnswer("");
    setAnswerState("idle");
    setHintsShown(0);
    setPhotoUploaded(false);
    setLockValue("0000");
  }

  function handleShowHint() {
    if (hintsShown < 3) {
      playHint();
      setHintsShown((h) => h + 1);
      setTotalHints((t) => t + 1);
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

  const hints = [task?.hint1, task?.hint2, task?.hint3].filter(Boolean);
  const canShowMoreHints = hintsShown < hints.length;
  const mapsUrl =
    task?.latitude && task?.longitude
      ? `https://www.google.com/maps?q=${task.latitude},${task.longitude}`
      : null;
  // Number of digits for combination lock – derived from the answer
  const lockDigits = task?.answer_type === "combination_lock"
    ? Math.max(task.answer.replace(/\D/g, "").length, 1)
    : 4;

  // ── Finished screen ──
  if (finished) {
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    const timeFormatted = `${minutes > 0 ? minutes + ":" : ""}${seconds.toString().padStart(2, "0")}`;
    const whatsappText = `Kan I slå vores tid på ${timeFormatted} i ${scenario.title}? 🔍 city-escape-app.vercel.app`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center py-12">
        {/* Logo */}
        <motion.div
          className="mb-6"
          initial={shouldReduce ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://paitcrtbdcvujhpfpbhw.supabase.co/storage/v1/object/public/images/Logo.png"
            alt="City Escape"
            style={{ maxWidth: 200, width: "100%", height: "auto" }}
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
        <p className="text-[#a09880] text-base mb-8">{teamName}</p>

        <div className="flex gap-4 mb-8">
          <div className="bg-[#1a1828] border border-amber-900/40 rounded-xl px-6 py-4 text-center">
            <div className="text-2xl font-bold text-amber-300">
              {minutes > 0 ? `${minutes}m ` : ""}{seconds}s
            </div>
            <div className="text-[#6b6380] text-xs mt-1 tracking-wide uppercase">Tid brugt</div>
          </div>
          <div className="bg-[#1a1828] border border-amber-900/40 rounded-xl px-6 py-4 text-center">
            <div className="text-2xl font-bold text-amber-300">{totalHints}</div>
            <div className="text-[#6b6380] text-xs mt-1 tracking-wide uppercase">Hints brugt</div>
          </div>
        </div>

        <p className="text-[#a09880] text-base leading-relaxed max-w-sm mb-8">
          Mysteriet er opklaret. Byen har ingen hemmeligheder for jer.
        </p>

        <div className="w-full max-w-xs flex flex-col gap-3">
          {/* Primary: share */}
          <button
            onClick={handleShare}
            className="w-full bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold py-4 rounded-xl transition-colors text-base"
          >
            {copied ? "✓ Kopieret!" : "Del dit resultat"}
          </button>

          {/* WhatsApp challenge */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366]/10 border border-[#25D366]/40 hover:bg-[#25D366]/20 text-[#25D366] font-semibold py-4 rounded-xl transition-colors text-base"
          >
            <span>💬</span> Udfordr et andet hold
          </a>

          {/* Leaderboard */}
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

          {/* Review section */}
          <div className="w-full border-t border-amber-900/30 pt-6 mt-2">
            {reviewSubmitted ? (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <p className="text-2xl mb-2">🙏</p>
                <p className="text-amber-400 font-semibold text-base mb-1">Tak for din feedback!</p>
                <p className="text-[#6b6380] text-sm">Det hjælper os med at gøre spillet bedre.</p>
              </motion.div>
            ) : (
              <>
                <p className="text-[#a09880] text-sm font-semibold mb-3 text-center">Hvordan var oplevelsen?</p>
                {/* Stars */}
                <div
                  className="flex justify-center gap-2 mb-4"
                  onMouseLeave={() => setReviewHover(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      className="text-3xl transition-transform active:scale-90"
                      style={{
                        color: star <= (reviewHover || reviewRating) ? "#f59e0b" : "#2a2840",
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
                {/* Comment */}
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Fortæl os hvad du synes (valgfrit)"
                  rows={3}
                  maxLength={500}
                  className="w-full bg-[#1a1828] border border-amber-900/30 focus:border-amber-700 rounded-xl px-4 py-3 text-[#e8e0d0] text-sm placeholder-[#4a4560] outline-none transition-colors resize-none mb-3"
                />
                {reviewError && (
                  <p className="text-red-400 text-xs mb-2">{reviewError}</p>
                )}
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || reviewSending}
                  className="w-full py-3 rounded-xl bg-[#1a1828] border border-amber-900/40 hover:border-amber-700 text-amber-700 hover:text-amber-500 font-semibold text-base transition-colors disabled:opacity-40"
                >
                  {reviewSending ? "Sender…" : "Send anmeldelse"}
                </button>
              </>
            )}
          </div>

          <Link
            href="/"
            className="text-[#4a4560] hover:text-amber-800 text-sm underline underline-offset-2 transition-colors py-1"
          >
            Tilbage til forsiden
          </Link>
        </div>
      </main>
    );
  }

  const taskSolved = answerState === "correct" || (task.answer_type === "photo" && photoUploaded);

  // Show navigation if task has coordinates and navigation not yet dismissed
  const hasCoords = !!(task.latitude && task.longitude);
  if (showNavigation && hasCoords) {
    return (
      <>
        {/* Sticky header also on navigation screen */}
        <header className="sticky top-0 z-10 bg-[#0f0e17]/95 backdrop-blur border-b border-amber-900/30 px-4 pt-4 pb-3">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-300 font-semibold text-base truncate max-w-[60%]">{teamName}</span>
              <div className="bg-[#1a1828] border border-amber-900/40 rounded-lg px-3 py-1.5 text-amber-400 font-mono text-base tabular-nums">
                {formatTime(elapsed)}
              </div>
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#6b6380] tracking-wider uppercase truncate mr-3">{scenario.title}</span>
              <span className="text-xs text-amber-700 shrink-0">{currentIndex + 1} / {tasks.length}</span>
            </div>
            <div className="w-full h-2 bg-[#2a2840] rounded-full overflow-hidden cursor-pointer" onClick={handleProgressTap}>
              <div
                className="h-2 bg-gradient-to-r from-amber-700 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / tasks.length) * 100}%` }}
              />
            </div>
          </div>
        </header>
        <NavigationView
          task={task}
          onArrived={() => setShowNavigation(false)}
          onSkip={() => setShowNavigation(false)}
        />
      </>
    );
  }

  return (
    <>
    <GoldRain active={showGoldRain} />
    <TaskTransition
      active={transitionActive}
      title={transitionTitle}
      taskNumber={transitionTaskNumber}
      onComplete={() => setTransitionActive(false)}
    />
    <div className="min-h-screen flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-[#0f0e17]/95 backdrop-blur border-b border-amber-900/30 px-4 pt-4 pb-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-300 font-semibold text-base truncate max-w-[60%]">
              {teamName}
            </span>
            <div className="bg-[#1a1828] border border-amber-900/40 rounded-lg px-3 py-1.5 text-amber-400 font-mono text-base tabular-nums">
              {formatTime(elapsed)}
            </div>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#6b6380] tracking-wider uppercase truncate mr-3">
              {scenario.title}
            </span>
            <span className="text-xs text-amber-700 shrink-0">
              {currentIndex + 1} / {tasks.length}
            </span>
          </div>
          <div className="w-full h-2 bg-[#2a2840] rounded-full overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-amber-700 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / tasks.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full">
        {/* Location image */}
        <TaskImage locationName={task.location_name} imageUrl={task.image_url} />


        <div className="px-4 py-5">
        <h2 className="text-xl font-bold text-amber-300 mb-4">{task.title}</h2>

        {/* Narrative intro */}
        {task.narrative_intro && (
          <div className="bg-[#1a1828] border-l-4 border-amber-700 rounded-r-xl px-5 py-4 mb-5 italic text-[#c8b89a] text-base leading-relaxed">
            {task.narrative_intro}
          </div>
        )}

        {/* Location */}
        {task.location_name && (
          <div className="flex items-center gap-2 mb-5">
            <span className="text-base">📍</span>
            <span className="text-[#a09880] text-base">{task.location_name}</span>
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

        {/* Question */}
        <div className="bg-[#14131f] border border-amber-900/30 rounded-xl p-5 mb-6">
          <p className="text-[#e8e0d0] text-base leading-relaxed">{task.question}</p>
        </div>

        {/* Answer area */}
        <div ref={answerAreaRef} key={task?.id}>
        {taskSolved && answerState !== "correct" ? null : answerState === "correct" ? (
          <div className="bg-[#1a2818] border border-green-800/50 rounded-xl p-5 mb-6">
            <p className="text-green-400 font-semibold text-base mb-2">✓ Korrekt svar!</p>
            {task.narrative_reward && (
              <p className="text-[#a8c8a0] text-base leading-relaxed italic">
                {task.narrative_reward}
              </p>
            )}
          </div>
        ) : task.answer_type === "multiple_choice" && shuffledChoices.length > 0 ? (
          /* Multiple choice */
          <div className="mb-6">
            <div className="flex flex-col gap-3">
              {shuffledChoices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleCheckAnswer(choice)}
                  className={`w-full text-left px-5 py-4 rounded-xl border text-base transition-all ${
                    answerState === "wrong"
                      ? "border-red-800/50 bg-[#1a1828] text-[#a09880]"
                      : "border-amber-900/40 bg-[#1a1828] hover:border-amber-600 hover:bg-[#1e1c2e] text-[#e8e0d0]"
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
          /* Drum lock */
          <div className="mb-6">
            <p className="text-center text-xs text-[#6b6380] tracking-widest uppercase mb-1">
              Træk op/ned for at dreje
            </p>
            <DrumLock
              value={lockValue}
              numDigits={lockDigits}
              onChange={(v) => { setLockValue(v); if (answerState === "wrong") setAnswerState("idle"); }}
            />
            <button
              onClick={() => handleCheckAnswer(lockValue)}
              className="w-full bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold py-4 rounded-xl transition-colors text-base"
            >
              Lås op
            </button>
            {answerState === "wrong" && (
              <p className="text-red-400 text-sm mt-3 text-center">Forkert kode – prøv igen.</p>
            )}
          </div>
        ) : task.answer_type === "number_picker" ? (
          /* Number picker */
          <NumberPicker
            key={task.id}
            answerState={answerState}
            onCheck={handleCheckAnswer}
            onReset={() => setAnswerState("idle")}
          />
        ) : task.answer_type === "word_scramble" ? (
          /* Word scramble */
          <WordScramble
            key={task.id}
            answer={task.answer}
            rawChoices={task.choices || deterministicScramble(task.answer)}
            answerState={answerState}
            onCheck={handleCheckAnswer}
            onWrong={() => setAnswerState("idle")}
          />
        ) : task.answer_type === "photo" ? (
          /* Photo */
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
                if (e.target.files && e.target.files.length > 0) setPhotoUploaded(true);
              }}
            />
          </div>
        ) : (
          /* Text answer */
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
              className={`w-full bg-[#1a1828] border rounded-xl px-4 py-4 text-[#e8e0d0] text-base placeholder-[#4a4560] outline-none transition-colors ${
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
              className="w-full mt-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900/40 disabled:text-amber-800 text-[#0f0e17] font-semibold py-4 rounded-xl transition-colors text-base"
            >
              Tjek svar
            </button>
          </div>
        )}
        </div>{/* close answerAreaRef */}

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
                  <div className="bg-[#1a1828] border border-amber-900/30 rounded-lg px-4 py-3 text-[#a09880] text-sm hint-glow">
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
                Få et hint {hintsShown > 0 ? `(${hintsShown}/${hints.length})` : ""}
              </button>
            )}
          </div>
        )}

        {/* Next task */}
        {taskSolved && (
          <button
            onClick={handleNextTask}
            className="w-full bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold py-4 rounded-xl transition-colors text-base"
          >
            {currentIndex + 1 >= tasks.length ? "Se resultat 🏆" : "Næste opgave →"}
          </button>
        )}
        </div>{/* close px-4 py-5 */}
      </main>
    </div>

    {/* Test navigation overlay – activated by 5 taps on progress bar */}
    {testMode && (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0c17]/95 border-t border-gray-700/50 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => currentIndex > 0 && jumpToTask(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="text-gray-400 hover:text-gray-200 text-sm px-3 py-1.5 disabled:opacity-30 transition-colors"
        >
          ← Forrige
        </button>
        <span className="text-gray-600 text-xs tracking-wider">
          TEST · opgave {currentIndex + 1} / {tasks.length}
        </span>
        <button
          onClick={() => currentIndex < tasks.length - 1 && jumpToTask(currentIndex + 1)}
          disabled={currentIndex >= tasks.length - 1}
          className="text-gray-400 hover:text-gray-200 text-sm px-3 py-1.5 disabled:opacity-30 transition-colors"
        >
          Næste →
        </button>
      </div>
    )}
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
