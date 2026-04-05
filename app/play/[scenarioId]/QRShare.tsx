"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function QRShare({ scenarioId }: { scenarioId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const gameUrl = `${window.location.origin}/play/${scenarioId}`;
    setUrl(gameUrl);
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, gameUrl, {
      width: 180,
      margin: 1,
      color: { dark: "#F59E0B", light: "#1a1a2e" },
    });
  }, [scenarioId]);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="mt-8 pt-6 border-t border-amber-900/30">
      <p className="text-xs text-text-tertiary tracking-widest uppercase text-center mb-5">
        Del med dit hold
      </p>
      <div className="flex flex-col items-center gap-3">
        <canvas ref={canvasRef} className="rounded-xl" />
        <p className="text-text-secondary text-sm">Scan og spil med</p>
        <button
          onClick={handleCopy}
          className="text-amber-700 hover:text-amber-500 text-sm underline underline-offset-2 transition-colors"
        >
          {copied ? "✓ Kopieret!" : "Kopiér link"}
        </button>
      </div>
    </div>
  );
}
