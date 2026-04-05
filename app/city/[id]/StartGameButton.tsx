"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartGameButton({ scenarioId }: { scenarioId: string }) {
  const [name, setName] = useState("");
  const router = useRouter();

  function start() {
    localStorage.setItem("cityescape_teamname", name.trim() || "Holdet");
    router.push(`/play/${scenarioId}`);
  }

  return (
    <div className="flex flex-col gap-3 mt-5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && start()}
        placeholder="fx Familie Hansen"
        maxLength={30}
        className="w-full bg-[#14131f] border border-amber-900/40 focus:border-amber-600 rounded-xl px-4 py-3 text-[#e8e0d0] text-base placeholder-[#4a4560] outline-none transition-colors"
      />
      <button
        onClick={start}
        className="block w-full text-center bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold text-base py-3 rounded-lg transition-colors"
      >
        {name.trim() ? `Start som "${name.trim()}"` : "Start som Holdet"}
      </button>
    </div>
  );
}
