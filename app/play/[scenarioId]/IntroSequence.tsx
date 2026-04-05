"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const TEXT_1 = "År 1887. En mand er forsvundet i Aarhus' gader. Politiet er rådvild. Vidner tier.";
const TEXT_2 = "Din mission begynder nu...";

function playTypeClick() {
  try {
    const audioCtx = new AudioContext();
    const buf = audioCtx.createBuffer(1, 256, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < 256; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 18);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.12;
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
    setTimeout(() => audioCtx.close(), 300);
  } catch { /* audio unavailable */ }
}

export default function IntroSequence({
  missionImageSrc,
  onComplete,
}: {
  missionImageSrc: string | null;
  onComplete: () => void;
}) {
  const shouldReduce = useReducedMotion();
  const [phase, setPhase] = useState<"text1" | "image" | "text2" | "done">("text1");
  const [typed1, setTyped1] = useState("");
  const [typed2, setTyped2] = useState("");
  const [showLogo, setShowLogo] = useState(false);
  const [cursor, setCursor] = useState(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const skip = useCallback(() => onCompleteRef.current(), []);

  useEffect(() => {
    if (shouldReduce) { onCompleteRef.current(); return; }

    // Blinking cursor
    const cursorTick = setInterval(() => setCursor((v) => !v), 500);

    // Typewriter pass 1
    let i = 0;
    const iv1 = setInterval(() => {
      i++;
      setTyped1(TEXT_1.slice(0, i));
      playTypeClick();
      if (i >= TEXT_1.length) {
        clearInterval(iv1);
        // Show image after text1
        const t1 = setTimeout(() => setPhase("image"), 500);
        // Start text2 after image has faded in
        const t2 = setTimeout(() => {
          setPhase("text2");
          let j = 0;
          const iv2 = setInterval(() => {
            j++;
            setTyped2(TEXT_2.slice(0, j));
            playTypeClick();
            if (j >= TEXT_2.length) {
              clearInterval(iv2);
              setTimeout(() => setShowLogo(true), 300);
              setTimeout(() => onCompleteRef.current(), 1800);
            }
          }, 80);
        }, 1800);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
    }, 52);

    return () => {
      clearInterval(iv1);
      clearInterval(cursorTick);
    };
  }, [shouldReduce]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Skip button */}
        <button
          onClick={skip}
          className="absolute top-4 right-4 text-[#4a4560] hover:text-amber-700 text-sm transition-colors px-3 py-2 z-10"
        >
          Spring intro over →
        </button>

        <div className="w-full max-w-sm">
          {/* Narrative text 1 */}
          <p className="text-amber-200/90 font-mono text-[15px] leading-relaxed min-h-[5rem] mb-6">
            {typed1}
            {phase === "text1" && (
              <span style={{ opacity: cursor ? 1 : 0 }} className="text-amber-500">█</span>
            )}
          </p>

          {/* Sepia city image */}
          <AnimatePresence>
            {(phase === "image" || phase === "text2" || phase === "done") && (
              <motion.div
                className="relative w-full h-44 rounded-xl overflow-hidden mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.4 }}
              >
                {missionImageSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={missionImageSrc}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ filter: "sepia(0.85) brightness(0.5) contrast(1.15)" }}
                  />
                )}
                {!missionImageSrc && (
                  <div
                    className="w-full h-full"
                    style={{
                      background: "radial-gradient(ellipse at center, #2a1a0a 0%, #0a0806 100%)",
                    }}
                  />
                )}

                {/* Pulsing red mission marker */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-4 h-4 rounded-full bg-red-600"
                    style={{ animation: "pulse-red 1.6s ease-out infinite" }}
                  />
                </div>

                {/* Vignette */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

                {/* Corner decorations */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-amber-800/50" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-amber-800/50" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-amber-800/50" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-amber-800/50" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Narrative text 2 */}
          {(phase === "text2" || phase === "done") && (
            <motion.p
              className="text-amber-400 font-mono text-lg font-semibold min-h-[2rem]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {typed2}
              {typed2.length < TEXT_2.length && (
                <span style={{ opacity: cursor ? 1 : 0 }} className="text-amber-600">█</span>
              )}
            </motion.p>
          )}

          {/* Logo dramatic fade-in at the very end */}
          <AnimatePresence>
            {showLogo && (
              <motion.div
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
      </motion.div>
    </AnimatePresence>
  );
}
