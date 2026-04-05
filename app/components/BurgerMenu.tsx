"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/useI18n";
import type { Lang } from "@/lib/i18n";
import { ACTIVE_GAME_KEY } from "@/app/ContinueBanner";

type Theme = "dark" | "light";

function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("cityescape_theme") as Theme) || "dark";
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove("dark", "light");
  html.classList.add(theme);
  localStorage.setItem("cityescape_theme", theme);
}

interface ProfileInfo {
  teamName: string | null;
  gamesCompleted: number;
  bestTimeSeconds: number | null;
}

function getProfile(): ProfileInfo {
  try {
    const active = localStorage.getItem(ACTIVE_GAME_KEY);
    const teamName = active ? JSON.parse(active).teamName ?? null : null;
    const stats = JSON.parse(localStorage.getItem("cityescape_stats") || "{}");
    return {
      teamName,
      gamesCompleted: stats.gamesCompleted ?? 0,
      bestTimeSeconds: stats.bestTime ?? null,
    };
  } catch {
    return { teamName: null, gamesCompleted: 0, bestTimeSeconds: null };
  }
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Section toggle ────────────────────────────────────────────────────────────
type Section = "profile" | "settings" | "language" | "about" | "contact" | null;

export default function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>(null);
  const [theme, setThemeState] = useState<Theme>("dark");
  const { lang, setLanguage } = useI18n();
  const [profile, setProfile] = useState<ProfileInfo>({
    teamName: null,
    gamesCompleted: 0,
    bestTimeSeconds: null,
  });
  const pathname = usePathname();
  const isGamePage = pathname?.startsWith("/play/");

  // Initialise theme from localStorage
  useEffect(() => {
    const t = getTheme();
    setThemeState(t);
    applyTheme(t);
  }, []);

  // Listen for external open requests (from game header button)
  useEffect(() => {
    function handler() {
      setProfile(getProfile());
      setOpen(true);
    }
    window.addEventListener("openBurgerMenu", handler);
    return () => window.removeEventListener("openBurgerMenu", handler);
  }, []);

  const openMenu = useCallback(() => {
    setProfile(getProfile());
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setSection(null);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    applyTheme(next);
  }

  function pickLanguage(l: Lang) {
    setLanguage(l);
  }

  // ── Menu items ─────────────────────────────────────────────────────────────
  const menuItems = [
    { key: "profile" as Section, icon: "👤", label: "Profil" },
    { key: "settings" as Section, icon: "⚙️", label: "Indstillinger" },
    { key: "language" as Section, icon: "🌍", label: "Sprog" },
    { key: "about" as Section, icon: "ℹ️", label: "Om City Escape" },
    { key: "contact" as Section, icon: "✉️", label: "Kontakt" },
  ];

  return (
    <>
      {/* Floating burger button – hidden on game page (game header has its own) */}
      {!isGamePage && (
        <button
          onClick={openMenu}
          aria-label="Åbn menu"
          className="fixed top-4 right-4 w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl bg-[#242232] border border-amber-900/40 hover:border-amber-600 transition-colors shadow-lg"
          style={{ zIndex: 9997 }}
        >
          <span className="block w-5 h-[2px] bg-amber-500 rounded-full" />
          <span className="block w-5 h-[2px] bg-amber-500 rounded-full" />
          <span className="block w-5 h-[2px] bg-amber-500 rounded-full" />
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          style={{ zIndex: 9998 }}
          onClick={closeMenu}
        />
      )}

      {/* Slide-in panel */}
      <div
        className="fixed top-0 right-0 h-full w-[min(340px,90vw)] bg-[#1a1820] border-l border-amber-900/30 flex flex-col shadow-2xl transition-transform duration-300 ease-out"
        style={{ zIndex: 9999, transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/20">
          <span className="text-amber-400 font-bold text-base tracking-wide">Menu</span>
          <button
            onClick={closeMenu}
            aria-label="Luk menu"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a6e65] hover:text-amber-400 hover:bg-[#242232] transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto py-2">
          {section === null ? (
            // Main menu list
            <nav>
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#242232] transition-colors group"
                >
                  <span className="text-2xl w-8 text-center">{item.icon}</span>
                  <span className="text-[#e8e0d0] text-base font-medium group-hover:text-amber-300 transition-colors">
                    {item.label}
                  </span>
                  <span className="ml-auto text-[#7a6e65] group-hover:text-amber-700 transition-colors">›</span>
                </button>
              ))}
            </nav>
          ) : (
            // Sub-section
            <>
              {/* Back button */}
              <button
                onClick={() => setSection(null)}
                className="flex items-center gap-2 px-5 py-3 text-amber-700 hover:text-amber-500 transition-colors text-sm"
              >
                ‹ Tilbage
              </button>

              {/* Profile */}
              {section === "profile" && (
                <div className="px-5 py-2">
                  <h2 className="text-amber-400 font-bold text-lg mb-4">👤 Profil</h2>
                  <div className="bg-[#242232] border border-amber-900/30 rounded-xl p-4 mb-4">
                    <p className="text-[#7a6e65] text-xs uppercase tracking-wider mb-1">Hold</p>
                    <p className="text-[#e8e0d0] text-base font-semibold">
                      {profile.teamName ?? "—"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#242232] border border-amber-900/30 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-amber-300">{profile.gamesCompleted}</p>
                      <p className="text-[#7a6e65] text-xs mt-1 uppercase tracking-wide">Spil gennemført</p>
                    </div>
                    <div className="bg-[#242232] border border-amber-900/30 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-amber-300">
                        {profile.bestTimeSeconds !== null ? formatTime(profile.bestTimeSeconds) : "—"}
                      </p>
                      <p className="text-[#7a6e65] text-xs mt-1 uppercase tracking-wide">Bedste tid</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings */}
              {section === "settings" && (
                <div className="px-5 py-2">
                  <h2 className="text-amber-400 font-bold text-lg mb-4">⚙️ Indstillinger</h2>
                  <div className="bg-[#242232] border border-amber-900/30 rounded-xl p-4 mb-3">
                    <p className="text-[#7a6e65] text-xs uppercase tracking-wider mb-3">Tema</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setThemeState("dark"); applyTheme("dark"); }}
                        className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          theme === "dark"
                            ? "bg-amber-600 border-amber-500 text-[#1a1820] btn-glow"
                            : "border-amber-900/30 text-[#b8a99a] hover:border-amber-700"
                        }`}
                      >
                        🌙 Mørkt
                      </button>
                      <button
                        onClick={() => { setThemeState("light"); applyTheme("light"); }}
                        className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          theme === "light"
                            ? "bg-amber-600 border-amber-500 text-[#1a1820] btn-glow"
                            : "border-amber-900/30 text-[#b8a99a] hover:border-amber-700"
                        }`}
                      >
                        ☀️ Lyst
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Language */}
              {section === "language" && (
                <div className="px-5 py-2">
                  <h2 className="text-amber-400 font-bold text-lg mb-4">🌍 Sprog</h2>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => pickLanguage("da")}
                      className={`flex items-center gap-4 px-4 py-4 rounded-xl border text-base font-semibold transition-all ${
                        lang === "da"
                          ? "bg-amber-600 border-amber-500 text-[#1a1820] btn-glow"
                          : "border-amber-900/30 text-[#e8e0d0] hover:border-amber-700 bg-[#242232]"
                      }`}
                    >
                      <span className="text-2xl">🇩🇰</span> Dansk
                      {lang === "da" && <span className="ml-auto text-sm opacity-80">✓ Valgt</span>}
                    </button>
                    <button
                      onClick={() => pickLanguage("en")}
                      className={`flex items-center gap-4 px-4 py-4 rounded-xl border text-base font-semibold transition-all ${
                        lang === "en"
                          ? "bg-amber-600 border-amber-500 text-[#1a1820] btn-glow"
                          : "border-amber-900/30 text-[#e8e0d0] hover:border-amber-700 bg-[#242232]"
                      }`}
                    >
                      <span className="text-2xl">🇬🇧</span> English
                      {lang === "en" && <span className="ml-auto text-sm opacity-80">✓ Selected</span>}
                    </button>
                  </div>
                </div>
              )}

              {/* About */}
              {section === "about" && (
                <div className="px-5 py-2">
                  <h2 className="text-amber-400 font-bold text-lg mb-4">ℹ️ Om City Escape</h2>
                  <div className="flex justify-center mb-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://paitcrtbdcvujhpfpbhw.supabase.co/storage/v1/object/public/images/Logo.png"
                      alt="City Escape"
                      style={{ maxWidth: 160, width: "100%", height: "auto" }}
                    />
                  </div>
                  <p className="text-[#b8a99a] text-sm leading-relaxed mb-4">
                    City Escape er et outdoor escape room spil der bringer dig ud i byens gader.
                    Løs gåder, følg ledetråde og oplev byen på en helt ny måde.
                  </p>
                  <div className="border-t border-amber-900/20 pt-4 text-[#7a6e65] text-xs space-y-1">
                    <p>Version 1.0 Beta</p>
                    <p>© 2026 City Escape</p>
                  </div>
                </div>
              )}

              {/* Contact */}
              {section === "contact" && (
                <div className="px-5 py-2">
                  <h2 className="text-amber-400 font-bold text-lg mb-4">✉️ Kontakt</h2>
                  <p className="text-[#b8a99a] text-sm leading-relaxed mb-5">
                    Har du spørgsmål, fejlmeldinger eller forslag til forbedringer? Vi hører gerne fra dig.
                  </p>
                  <a
                    href="mailto:kontakt@cityescape.dk"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-[#1a1820] font-semibold text-base btn-glow transition-all"
                  >
                    ✉️ kontakt@cityescape.dk
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-amber-900/20">
          <Link
            href="/"
            onClick={closeMenu}
            className="text-[#7a6e65] hover:text-amber-700 text-sm underline underline-offset-2 transition-colors"
          >
            ← Tilbage til forsiden
          </Link>
        </div>
      </div>
    </>
  );
}
