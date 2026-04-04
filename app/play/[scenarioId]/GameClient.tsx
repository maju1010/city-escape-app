"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";

type Task = {
  id: string;
  order_number: number;
  title: string;
  location_name: string;
  latitude: number;
  longitude: number;
  narrative_intro: string;
  question: string;
  answer: string;
  answer_type: "text" | "photo";
  narrative_reward: string;
  hint1: string;
  hint2: string;
  hint3: string;
};

type Scenario = {
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

export default function GameClient({
  scenario,
  tasks,
}: {
  scenario: Scenario;
  tasks: Task[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [hintsShown, setHintsShown] = useState(0);
  const [totalHints, setTotalHints] = useState(0);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise timer from localStorage
  useEffect(() => {
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
  }, [scenario.id]);

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 3000;
    const colors = ["#f59e0b", "#fbbf24", "#fde68a", "#ffffff", "#d97706"];

    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  const task = tasks[currentIndex];

  function handleNextTask() {
    if (currentIndex + 1 >= tasks.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      const key = getStorageKey(scenario.id);
      const startTs = parseInt(localStorage.getItem(key) ?? "", 10);
      const secs = isNaN(startTs) ? elapsed : Math.floor((Date.now() - startTs) / 1000);
      setFinalTime(secs);
      localStorage.removeItem(key);
      setFinished(true);
      setTimeout(() => fireConfetti(), 300);
    } else {
      setCurrentIndex((i) => i + 1);
      setTextAnswer("");
      setAnswerState("idle");
      setHintsShown(0);
      setPhotoUploaded(false);
    }
  }

  function handleCheckAnswer() {
    const correct = task.answer.trim().toLowerCase();
    const given = textAnswer.trim().toLowerCase();
    if (given === correct) {
      setAnswerState("correct");
    } else {
      setAnswerState("wrong");
    }
  }

  function handleShowHint() {
    if (hintsShown < 3) {
      setHintsShown((h) => h + 1);
      setTotalHints((t) => t + 1);
    }
  }

  function handleShare() {
    const minutes = Math.round(finalTime / 60);
    const text = `Jeg løste "${scenario.title}" på ${minutes} minut${minutes !== 1 ? "ter" : ""}! 🔍 Prøv selv: city-escape-app.vercel.app`;
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

  // ── Finished screen ──
  if (finished) {
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🏆</div>

        <h1 className="text-3xl font-bold text-amber-400 mb-1 tracking-wide">
          Mysteriet er løst!
        </h1>
        <p className="text-amber-700 text-sm tracking-widest uppercase mb-8">
          {scenario.title}
        </p>

        {/* Stats */}
        <div className="flex gap-6 mb-10">
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

        <p className="text-[#a09880] text-sm leading-relaxed max-w-sm mb-10">
          Mysteriet er opklaret. Byen har ingen hemmeligheder for dig.
        </p>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full max-w-xs bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold py-3 rounded-xl transition-colors mb-4"
        >
          {copied ? "✓ Kopieret!" : "Del dit resultat"}
        </button>

        <Link
          href="/"
          className="text-amber-800 hover:text-amber-600 text-sm underline underline-offset-2 transition-colors"
        >
          Tilbage til forsiden
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Top bar: progress + timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs text-[#6b6380] tracking-widest uppercase block">
              {scenario.title}
            </span>
            <span className="text-xs text-amber-600 font-medium">
              Opgave {currentIndex + 1} af {tasks.length}
            </span>
          </div>
          {/* Timer */}
          <div className="bg-[#1a1828] border border-amber-900/40 rounded-lg px-3 py-1.5 text-amber-400 font-mono text-sm tabular-nums">
            {formatTime(elapsed)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-[#2a2840] rounded-full overflow-hidden">
          <div
            className="h-2 bg-gradient-to-r from-amber-700 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Task title */}
      <h2 className="text-xl font-bold text-amber-300 mb-4">{task.title}</h2>

      {/* Narrative intro */}
      {task.narrative_intro && (
        <div className="bg-[#1a1828] border-l-4 border-amber-700 rounded-r-xl px-5 py-4 mb-5 italic text-[#c8b89a] text-sm leading-relaxed">
          {task.narrative_intro}
        </div>
      )}

      {/* Location */}
      {task.location_name && (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs">📍</span>
          <span className="text-[#a09880] text-sm">{task.location_name}</span>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-600 hover:text-amber-400 underline underline-offset-2 transition-colors ml-1"
            >
              Åbn kort
            </a>
          )}
        </div>
      )}

      {/* Question */}
      <div className="bg-[#14131f] border border-amber-900/30 rounded-xl p-5 mb-6">
        <p className="text-[#e8e0d0] text-sm leading-relaxed">{task.question}</p>
      </div>

      {/* Answer area */}
      {answerState === "correct" ? (
        <div className="bg-[#1a2818] border border-green-800/50 rounded-xl p-5 mb-6">
          <p className="text-green-400 font-semibold text-sm mb-2">✓ Korrekt svar!</p>
          {task.narrative_reward && (
            <p className="text-[#a8c8a0] text-sm leading-relaxed italic">
              {task.narrative_reward}
            </p>
          )}
        </div>
      ) : task.answer_type === "photo" ? (
        <div className="mb-6">
          {!photoUploaded ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-amber-800/50 hover:border-amber-600 rounded-xl py-8 text-center text-amber-700 hover:text-amber-500 transition-colors text-sm"
            >
              <span className="block text-2xl mb-2">📷</span>
              Tryk for at tage/uploade billede
            </button>
          ) : (
            <div className="bg-[#1a2818] border border-green-800/50 rounded-xl p-5">
              <p className="text-green-400 font-semibold text-sm mb-2">✓ Billede uploadet!</p>
              {task.narrative_reward && (
                <p className="text-[#a8c8a0] text-sm leading-relaxed italic">
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
              if (e.target.files && e.target.files.length > 0) {
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
            className={`w-full bg-[#1a1828] border rounded-xl px-4 py-3 text-[#e8e0d0] text-sm placeholder-[#4a4560] outline-none transition-colors ${
              answerState === "wrong"
                ? "border-red-700 focus:border-red-500"
                : "border-amber-900/40 focus:border-amber-600"
            }`}
          />
          {answerState === "wrong" && (
            <p className="text-red-400 text-xs mt-2">Forkert svar – prøv igen.</p>
          )}
          <button
            onClick={handleCheckAnswer}
            disabled={!textAnswer.trim()}
            className="w-full mt-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900/40 disabled:text-amber-800 text-[#0f0e17] font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Tjek svar
          </button>
        </div>
      )}

      {/* Hints */}
      {hints.length > 0 && answerState !== "correct" && !(task.answer_type === "photo" && photoUploaded) && (
        <div className="mb-6">
          {hintsShown > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {hints.slice(0, hintsShown).map((hint, i) => (
                <div
                  key={i}
                  className="bg-[#1a1828] border border-amber-900/30 rounded-lg px-4 py-3 text-[#a09880] text-xs"
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
              className="text-amber-800 hover:text-amber-600 text-xs underline underline-offset-2 transition-colors"
            >
              Få et hint {hintsShown > 0 ? `(${hintsShown}/${hints.length})` : ""}
            </button>
          )}
        </div>
      )}

      {/* Next task button */}
      {(answerState === "correct" || (task.answer_type === "photo" && photoUploaded)) && (
        <button
          onClick={handleNextTask}
          className="w-full bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold py-3 rounded-xl transition-colors"
        >
          {currentIndex + 1 >= tasks.length ? "Se resultat 🏆" : "Næste opgave →"}
        </button>
      )}
    </main>
  );
}
