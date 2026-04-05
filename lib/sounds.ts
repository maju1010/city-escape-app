// Web Audio API sound effects — generated programmatically, no external files
//
// iOS Safari REQUIRES that AudioContext is created AND resumed synchronously
// inside a touchstart/click handler. Call unlockAudio() on first user gesture.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext!)();
    }
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Call this synchronously inside a touchstart or click handler.
 * Creates the AudioContext if needed, resumes it, and plays a silent
 * 1-sample buffer — the combination iOS needs to mark audio as "allowed".
 */
export function unlockAudio() {
  try {
    const c = getCtx();
    if (!c || c.state === "running") return;
    // resume() is async — also play a silent buffer synchronously so iOS
    // registers the gesture and marks audio as permitted
    c.resume();
    const buf = c.createBuffer(1, 1, c.sampleRate);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
  } catch { /* ignore */ }
}

export function isAudioRunning(): boolean {
  return ctx !== null && ctx.state === "running";
}

function running(): AudioContext | null {
  const c = getCtx();
  return c && c.state === "running" ? c : null;
}

function tone(
  audioCtx: AudioContext,
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  peakGain: number,
  attackTime = 0.02,
  releaseTime = 0.05
) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + attackTime);
  gain.gain.setValueAtTime(peakGain, startTime + duration - releaseTime);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/** Drum-wheel tick */
export function playTick() {
  try {
    const c = running(); if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.frequency.value = 1200; osc.type = "sine";
    gain.gain.setValueAtTime(0.12, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
    osc.start(c.currentTime); osc.stop(c.currentTime + 0.04);
  } catch { /* ignore */ }
}

/** Typewriter-klik: diskret, højfrekvent tapping */
export function playTypeTick() {
  try {
    const c = running(); if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.value = 1800 + Math.random() * 400;
    osc.connect(gain); gain.connect(c.destination);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    osc.start(now); osc.stop(now + 0.026);
  } catch { /* ignore */ }
}

/** Korrekt svar – opstigende tre-toner */
export function playSuccess() {
  try {
    const c = running(); if (!c) return;
    [523, 659, 784].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, c.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.1 + 0.15);
      osc.start(c.currentTime + i * 0.1);
      osc.stop(c.currentTime + i * 0.1 + 0.15);
    });
  } catch { /* ignore */ }
}

/** Forkert svar: nedadgående buzz */
export function playError() {
  try {
    const c = running(); if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.3);
    osc.connect(gain); gain.connect(c.destination);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now); osc.stop(now + 0.31);
  } catch { /* ignore */ }
}

/** Korrekt svar: opstigende C-E-G swell */
export function playCorrect() {
  try {
    const c = running(); if (!c) return;
    const now = c.currentTime;
    const notes = [261.63, 329.63, 392]; // C4, E4, G4
    notes.forEach((freq, i) => {
      tone(c, freq, "sine", now + i * 0.1, 0.35, 0.28, 0.04, 0.1);
    });
  } catch { /* ignore */ }
}

/** Forkert svar: nedadgående buzz */
export function playWrong() {
  try {
    const c = running(); if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.3);
    osc.connect(gain); gain.connect(c.destination);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now); osc.stop(now + 0.31);
  } catch { /* ignore */ }
}

/** Hint åbnes: diskret whoosh */
export function playHint() {
  try {
    const c = running(); if (!c) return;
    const now = c.currentTime;
    const bufSize = Math.floor(c.sampleRate * 0.25);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.22);
    filter.Q.value = 0.8;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
    gain.gain.linearRampToValueAtTime(0, now + 0.25);
    src.connect(filter); filter.connect(gain); gain.connect(c.destination);
    src.start(now); src.stop(now + 0.26);
  } catch { /* ignore */ }
}

/** Ny opgave låses op: ding */
export function playDing() {
  try {
    const c = running(); if (!c) return;
    const now = c.currentTime;
    tone(c, 880, "sine", now, 0.45, 0.25, 0.005, 0.35);
    tone(c, 1108.73, "sine", now + 0.05, 0.35, 0.15, 0.005, 0.3);
  } catch { /* ignore */ }
}

/** Afslutning: triumferende fanfare */
export function playFanfare() {
  try {
    const c = running(); if (!c) return;
    const now = c.currentTime;
    const motif: [number, number, number][] = [
      [261.63, 0.0, 0.18],
      [329.63, 0.16, 0.18],
      [392.0,  0.32, 0.18],
      [523.25, 0.48, 0.22],
      [659.25, 0.68, 0.28],
    ];
    const finalChord: [number, number, number][] = [
      [523.25, 1.0, 0.8],
      [659.25, 1.0, 0.8],
      [783.99, 1.0, 0.8],
    ];
    [...motif, ...finalChord].forEach(([freq, t, dur]) => {
      tone(c, freq, "sine", now + t, dur, 0.22, 0.01, 0.12);
    });
    finalChord.forEach(([freq, t, dur]) => {
      tone(c, freq / 2, "triangle", now + t, dur, 0.08, 0.02, 0.15);
    });
  } catch { /* ignore */ }
}
