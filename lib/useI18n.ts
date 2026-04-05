"use client";
import { useState, useEffect, useCallback } from "react";
import { translations, Lang, TKey } from "./i18n";

export function useI18n() {
  const [lang, setLangState] = useState<Lang>("da");

  useEffect(() => {
    const stored = localStorage.getItem("cityescape_language") as Lang | null;
    if (stored && stored in translations) setLangState(stored);

    function onLangChange(e: Event) {
      const l = (e as CustomEvent<Lang>).detail;
      if (l in translations) setLangState(l);
    }
    window.addEventListener("languageChange", onLangChange);
    return () => window.removeEventListener("languageChange", onLangChange);
  }, []);

  const t = useCallback(
    (key: TKey): string => translations[lang][key],
    [lang]
  );

  const setLanguage = useCallback((l: Lang) => {
    localStorage.setItem("cityescape_language", l);
    setLangState(l);
    window.dispatchEvent(new CustomEvent<Lang>("languageChange", { detail: l }));
  }, []);

  return { t, lang, setLanguage };
}
