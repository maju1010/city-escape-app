"use client";

import { useState, useRef } from "react";
import Link from "next/link";

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
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [finished, setFinished] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const task = tasks[currentIndex];

  function handleNextTask() {
    if (currentIndex + 1 >= tasks.length) {
      setFinished(true);
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
    if (hintsShown < 3) setHintsShown((h) => h + 1);
  }

  const hints = [task.hint1, task.hint2, task.hint3].filter(Boolean);
  const canShowMoreHints = hintsShown < hints.length;

  const mapsUrl =
    task.latitude && task.longitude
      ? `https://www.google.com/maps?q=${task.latitude},${task.longitude}`
      : null;

  // ── Finished screen ──
  if (finished) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-amber-400 mb-4">
          Tillykke!
        </h1>
        <p className="text-[#a09880] mb-2 leading-relaxed max-w-sm">
          Du har løst alle opgaver i
        </p>
        <p className="text-amber-300 font-semibold text-lg mb-8">
          {scenario.title}
        </p>
        <p className="text-[#a09880] text-sm leading-relaxed max-w-sm mb-10">
          Mysteriet er opklaret. Byen har ingen hemmeligheder for dig.
        </p>
        <Link
          href="/"
          className="bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Tilbage til forsiden
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col px-4 py-8 max-w-lg mx-auto">
      {/* Progress + title */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#6b6380] tracking-widest uppercase">
            {scenario.title}
          </span>
          <span className="text-xs text-amber-700">
            {currentIndex + 1} / {tasks.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-[#2a2840] rounded-full">
          <div
            className="h-1 bg-amber-600 rounded-full transition-all duration-500"
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
          <span className="text-[#6b6380] text-xs">📍</span>
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
        /* Reward */
        <div className="bg-[#1a2818] border border-green-800/50 rounded-xl p-5 mb-6">
          <p className="text-green-400 font-semibold text-sm mb-2">✓ Korrekt svar!</p>
          {task.narrative_reward && (
            <p className="text-[#a8c8a0] text-sm leading-relaxed italic">
              {task.narrative_reward}
            </p>
          )}
        </div>
      ) : task.answer_type === "photo" ? (
        /* Photo upload */
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
          {currentIndex + 1 >= tasks.length ? "Se resultat" : "Næste opgave →"}
        </button>
      )}
    </main>
  );
}
