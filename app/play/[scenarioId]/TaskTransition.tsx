"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function TaskTransition({
  active,
  title,
  taskNumber,
  onComplete,
}: {
  active: boolean;
  title: string;
  taskNumber: number;
  onComplete: () => void;
}) {
  const shouldReduce = useReducedMotion();
  const [showParchment, setShowParchment] = useState(false);
  const [typedTitle, setTypedTitle] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) {
      setShowParchment(false);
      setTypedTitle("");
      return;
    }

    setShowParchment(false);
    setTypedTitle("");

    if (shouldReduce) {
      // Skip animation, just show briefly
      setShowParchment(true);
      setTypedTitle(title);
      const t = setTimeout(() => onCompleteRef.current(), 600);
      return () => clearTimeout(t);
    }

    const t1 = setTimeout(() => setShowParchment(true), 350);

    // Typewriter: speed adapts to title length, max 1400ms total
    const charDelay = Math.min(70, Math.floor(1400 / (title.length || 1)));
    let charIndex = 0;
    const t2 = setTimeout(() => {
      const interval = setInterval(() => {
        charIndex++;
        setTypedTitle(title.slice(0, charIndex));
        if (charIndex >= title.length) clearInterval(interval);
      }, charDelay);
    }, 700);

    // Complete after blackout + parchment + typewriter + brief pause
    const totalMs = 700 + title.length * charDelay + 650;
    const t3 = setTimeout(() => onCompleteRef.current(), totalMs);

    // Blinking cursor
    const cursorInterval = setInterval(() => setCursorVisible((v) => !v), 530);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(cursorInterval);
    };
  }, [active, title, shouldReduce]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{ background: "rgba(8, 7, 16, 0.97)" }}
          aria-live="polite"
        >
          <AnimatePresence>
            {showParchment && (
              <motion.div
                className="relative mx-6 max-w-sm w-full"
                initial={shouldReduce ? false : { scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                style={{ originY: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="relative rounded-2xl border border-amber-800/50 px-8 py-10 text-center overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(160deg, #1c1626 0%, #201a2e 50%, #18121f 100%)",
                    boxShadow:
                      "0 0 60px rgba(245,158,11,0.12), 0 0 120px rgba(245,158,11,0.05), inset 0 0 80px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Corner runes */}
                  {["top-3 left-4", "top-3 right-4", "bottom-3 left-4", "bottom-3 right-4"].map((pos) => (
                    <span key={pos} className={`absolute ${pos} text-amber-900/40 text-base select-none`}>✦</span>
                  ))}

                  {/* Top divider with label */}
                  <p className="text-amber-700/80 text-[10px] tracking-[0.35em] uppercase mb-3 font-medium">
                    Opgave {taskNumber}
                  </p>
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-800/60 to-transparent mb-6" />

                  {/* Typewriter title */}
                  <h2 className="text-amber-300 text-xl font-bold leading-snug min-h-[3.5rem]">
                    {typedTitle}
                    <span
                      className="text-amber-600 font-thin"
                      style={{ opacity: cursorVisible ? 1 : 0 }}
                    >
                      |
                    </span>
                  </h2>

                  <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-800/60 to-transparent mt-6" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
