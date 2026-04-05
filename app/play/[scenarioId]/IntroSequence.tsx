"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const TEXT_1 =
  "År 1887. En mand er forsvundet i Aarhus' gader. Politiet er rådvild. Vidner tier.";
const TEXT_2 = "Din mission begynder nu...";

// ── Single shared AudioContext for typewriter clicks ──────────────────────────
// A new AudioContext per click hits the browser's hard limit (4–6 contexts).
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new AudioContext();
    }
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  } catch {
    return null;
  }
}

function playTypeClick() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const buf = ctx.createBuffer(1, 256, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < 256; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 18);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.11;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch { /* audio unavailable */ }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function IntroSequence({
  missionImageSrc,
  onComplete,
}: {
  missionImageSrc: string | null;
  onComplete: () => void;
}) {
  const shouldReduce = useReducedMotion();

  const [phase, setPhase] = useState<"text1" | "image" | "text2">("text1");
  const [typed1, setTyped1] = useState("");
  const [typed2, setTyped2] = useState("");
  const [showLogo, setShowLogo] = useState(false);
  const [cursor, setCursor] = useState(true);

  // Stable ref so timers don't capture stale onComplete
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Prevent double-firing onComplete (Strict Mode re-runs effects)
  const doneRef = useRef(false);

  // Track every timer/interval so cleanup can cancel all of them
  const allTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function schedule(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    allTimers.current.push(id);
    return id;
  }
  function repeat(fn: () => void, ms: number) {
    const id = setInterval(fn, ms);
    allTimers.current.push(id as unknown as ReturnType<typeof setTimeout>);
    return id;
  }

  function complete() {
    if (doneRef.current) return;
    doneRef.current = true;
    onCompleteRef.current();
  }

  const skip = useCallback(() => complete(), []); // eslint-disable-line

  useEffect(() => {
    if (shouldReduce) {
      complete();
      return;
    }

    doneRef.current = false;
    allTimers.current = [];

    // Blinking cursor
    repeat(() => setCursor((v) => !v), 500);

    // Phase 1 – typewrite TEXT_1
    let i = 0;
    const iv1 = repeat(() => {
      i++;
      setTyped1(TEXT_1.slice(0, i));
      playTypeClick();

      if (i >= TEXT_1.length) {
        clearInterval(iv1);

        // Show sepia image
        schedule(() => setPhase("image"), 500);

        // Phase 2 – typewrite TEXT_2
        schedule(() => {
          setPhase("text2");
          let j = 0;
          const iv2 = repeat(() => {
            j++;
            setTyped2(TEXT_2.slice(0, j));
            playTypeClick();

            if (j >= TEXT_2.length) {
              clearInterval(iv2);
              schedule(() => setShowLogo(true), 300);
              schedule(() => complete(), 1800);
            }
          }, 80);
        }, 1800);
      }
    }, 52);

    // Cleanup: cancel everything
    return () => {
      allTimers.current.forEach((id) => {
        clearTimeout(id);
        clearInterval(id as unknown as ReturnType<typeof setInterval>);
      });
      allTimers.current = [];
    };
  }, [shouldReduce]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center px-6">
      {/* Skip */}
      <button
        onClick={skip}
        className="absolute top-4 right-4 text-[#4a4560] hover:text-amber-700 text-sm transition-colors px-3 py-2 z-10"
      >
        Spring intro over →
      </button>

      <div className="w-full max-w-sm">
        {/* Text 1 */}
        <p className="text-amber-200/90 font-mono text-[15px] leading-relaxed min-h-[5rem] mb-6">
          {typed1}
          {phase === "text1" && (
            <span style={{ opacity: cursor ? 1 : 0 }} className="text-amber-500">
              █
            </span>
          )}
        </p>

        {/* Sepia image */}
        <AnimatePresence>
          {phase !== "text1" && (
            <motion.div
              key="intro-image"
              className="relative w-full h-44 rounded-xl overflow-hidden mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4 }}
            >
              {missionImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={missionImageSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: "sepia(0.85) brightness(0.5) contrast(1.15)" }}
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, #2a1a0a 0%, #0a0806 100%)",
                  }}
                />
              )}

              {/* Red mission dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-4 h-4 rounded-full bg-red-600"
                  style={{ animation: "pulse-red 1.6s ease-out infinite" }}
                />
              </div>

              {/* Vignette */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
              <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-amber-800/50" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-amber-800/50" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-amber-800/50" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-amber-800/50" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text 2 */}
        <AnimatePresence>
          {phase === "text2" && (
            <motion.p
              key="intro-text2"
              className="text-amber-400 font-mono text-lg font-semibold min-h-[2rem]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {typed2}
              {typed2.length < TEXT_2.length && (
                <span style={{ opacity: cursor ? 1 : 0 }} className="text-amber-600">
                  █
                </span>
              )}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Logo fade-in at the very end */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              key="intro-logo"
              className="mt-8 flex justify-center"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://paitcrtbdcvujhpfpbhw.supabase.co/storage/v1/object/public/images/Logo.png"
                alt="City Escape"
                style={{ maxWidth: 240, width: "100%", height: "auto" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
