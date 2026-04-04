"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import NavigationView from "./NavigationView";
import QRShare from "./QRShare";
import { playCorrect, playWrong, playHint, playDing, playFanfare } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";
import { ACTIVE_GAME_KEY } from "@/app/ContinueBanner";

function TaskImage({ locationName, imageUrl }: { locationName: string; imageUrl: string | null }) {
  const [error, setError] = useState(false);
  if (!locationName && !imageUrl) return null;
  const src =
    imageUrl ||
    `https://picsum.photos/seed/${encodeURIComponent(locationName)}/800/400`;
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
  answer_type: "text" | "photo" | "multiple_choice" | "combination_lock";
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

// ── Combination lock component ──
function CombinationLock({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const digits = value.padStart(4, "0").split("").map(Number);

  function adjust(index: number, delta: number) {
    const next = [...digits];
    next[index] = (next[index] + delta + 10) % 10;
    onChange(next.join(""));
  }

  return (
    <div className="flex justify-center gap-3 my-4">
      {digits.map((digit, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <button
            onClick={() => adjust(i, 1)}
            className="w-14 h-10 text-amber-400 text-xl bg-[#1a1828] border border-amber-800/50 rounded-lg hover:bg-[#221e36] active:scale-95 transition-all select-none"
            aria-label="Op"
          >
            ▲
          </button>
          <div className="w-14 h-14 flex items-center justify-center bg-[#14131f] border-2 border-amber-700 rounded-xl text-3xl font-bold text-amber-300 tabular-nums">
            {digit}
          </div>
          <button
            onClick={() => adjust(i, -1)}
            className="w-14 h-10 text-amber-400 text-xl bg-[#1a1828] border border-amber-800/50 rounded-lg hover:bg-[#221e36] active:scale-95 transition-all select-none"
            aria-label="Ned"
          >
            ▼
          </button>
        </div>
      ))}
    </div>
  );
}

export default function GameClient({
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved team name
  useEffect(() => {
    const saved = localStorage.getItem(getTeamKey(scenario.id));
    if (saved) setTeamName(saved);
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
    const end = Date.now() + 3000;
    const colors = ["#f59e0b", "#fbbf24", "#fde68a", "#ffffff", "#d97706"];
    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  function saveActiveGame(name: string, index: number) {
    localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      currentIndex: index,
      totalTasks: tasks.length,
      teamName: name,
    }));
  }

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

  const task = tasks[currentIndex];

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
      // Save to leaderboard (fire and forget)
      void supabase.from("leaderboard").insert({
        team_name: teamName,
        scenario_id: scenario.id,
        completion_time_seconds: secs,
        hints_used: totalHints,
      });
    } else {
      playDing();
      const nextIndex = currentIndex + 1;
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
    const correct = task.answer.trim().toLowerCase();
    const given = (givenOverride ?? textAnswer).trim().toLowerCase();
    if (given === correct) {
      setAnswerState("correct");
      playCorrect();
    } else {
      setAnswerState("wrong");
      playWrong();
    }
  }

  function handleShowHint() {
    if (hintsShown < 3) {
      playHint();
      setHintsShown((h) => h + 1);
      setTotalHints((t) => t + 1);
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
  const choices = task?.choices ? task.choices.split("|").map((c) => c.trim()) : [];

  // ── Finished screen ──
  if (finished) {
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    const timeFormatted = `${minutes > 0 ? minutes + ":" : ""}${seconds.toString().padStart(2, "0")}`;
    const whatsappText = `Kan I slå vores tid på ${timeFormatted} i ${scenario.title}? 🔍 city-escape-app.vercel.app`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center py-12">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold text-amber-400 mb-1 tracking-wide">
          Mysteriet er løst!
        </h1>
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
            <div className="w-full h-2 bg-[#2a2840] rounded-full overflow-hidden">
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
        {taskSolved && answerState !== "correct" ? null : answerState === "correct" ? (
          <div className="bg-[#1a2818] border border-green-800/50 rounded-xl p-5 mb-6">
            <p className="text-green-400 font-semibold text-base mb-2">✓ Korrekt svar!</p>
            {task.narrative_reward && (
              <p className="text-[#a8c8a0] text-base leading-relaxed italic">
                {task.narrative_reward}
              </p>
            )}
          </div>
        ) : task.answer_type === "multiple_choice" && choices.length > 0 ? (
          /* Multiple choice */
          <div className="mb-6">
            <div className="flex flex-col gap-3">
              {choices.map((choice, i) => (
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
          /* Combination lock */
          <div className="mb-6">
            <CombinationLock value={lockValue} onChange={setLockValue} />
            <button
              onClick={() => handleCheckAnswer(lockValue)}
              className="w-full mt-2 bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold py-4 rounded-xl transition-colors text-base"
            >
              Lås op
            </button>
            {answerState === "wrong" && (
              <p className="text-red-400 text-sm mt-3 text-center">Forkert kode – prøv igen.</p>
            )}
          </div>
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

        {/* Hints */}
        {hints.length > 0 && !taskSolved && (
          <div className="mb-6">
            {hintsShown > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {hints.slice(0, hintsShown).map((hint, i) => (
                  <div
                    key={i}
                    className="bg-[#1a1828] border border-amber-900/30 rounded-lg px-4 py-3 text-[#a09880] text-sm"
                  >
                    <span className="text-amber-700 font-semibold">Hint {i + 1}: </span>
                    {hint}
                  </div>
                ))}
              </div>
            )}
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
  );
}
