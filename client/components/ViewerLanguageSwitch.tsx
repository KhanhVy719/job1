import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";

type ViewerLanguageCode = "en" | "fil";

const STORAGE_KEY = "rophim.viewerLanguage";
const COOKIE_KEY = "viewer_language";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const VIEWER_LANGUAGES: Array<{
  code: ViewerLanguageCode;
  htmlLang: string;
  label: string;
  shortLabel: string;
}> = [
  { code: "en", htmlLang: "en", label: "English", shortLabel: "EN" },
  { code: "fil", htmlLang: "fil-PH", label: "Filipino", shortLabel: "FIL" },
];

interface ViewerLanguageSwitchProps {
  className?: string;
  compact?: boolean;
}

const getLanguage = (code?: string) =>
  VIEWER_LANGUAGES.find((language) => language.code === code) || VIEWER_LANGUAGES[0];

const getCookieLanguage = () =>
  document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${COOKIE_KEY}=`))
    ?.split("=")[1];

const ViewerLanguageSwitch: React.FC<ViewerLanguageSwitchProps> = ({
  className,
  compact = false,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<ViewerLanguageCode>("en");

  const applyLanguage = useCallback((code: string, persist: boolean) => {
    const language = getLanguage(code);

    setSelectedLanguage(language.code);
    document.documentElement.lang = language.htmlLang;

    if (!persist) return;

    localStorage.setItem(STORAGE_KEY, language.code);
    document.cookie = `${COOKIE_KEY}=${language.code}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    window.dispatchEvent(
      new CustomEvent("rophim:viewer-language-change", { detail: language })
    );
  }, []);

  useEffect(() => {
    const storedLanguage = localStorage.getItem(STORAGE_KEY) || getCookieLanguage();
    applyLanguage(storedLanguage || "en", false);

    const handleLanguageChange = (event: Event) => {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code;
      if (code) applyLanguage(code, false);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) applyLanguage(event.newValue || "en", false);
    };

    window.addEventListener("rophim:viewer-language-change", handleLanguageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("rophim:viewer-language-change", handleLanguageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [applyLanguage]);

  return (
    <div
      className={clsx(
        "flex items-center gap-2 border border-white/10 bg-white/[.08] text-white shadow-[0_10px_24px_rgba(0,0,0,.14)]",
        compact ? "rounded-full px-2 py-1.5" : "w-full rounded-xl p-2.5",
        className
      )}
      aria-label="Viewer language"
    >
      <div className={clsx("flex min-w-0 items-center gap-2", compact && "hidden 2xl:flex")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-black">
          <i className="fa-solid fa-globe text-sm" aria-hidden="true"></i>
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-[11px] font-medium text-gray-300">Language</span>
          <span className="truncate text-sm font-semibold text-white">Viewer site</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center rounded-full bg-black/25 p-1">
        {VIEWER_LANGUAGES.map((language) => {
          const isSelected = selectedLanguage === language.code;

          return (
            <button
              key={language.code}
              type="button"
              aria-pressed={isSelected}
              title={language.label}
              onClick={() => applyLanguage(language.code, true)}
              className={clsx(
                "h-8 min-w-10 rounded-full px-3 text-xs font-semibold transition-colors",
                isSelected
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className={clsx(compact && "hidden 2xl:inline")}>{language.label}</span>
              {compact ? <span className="2xl:hidden">{language.shortLabel}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ViewerLanguageSwitch;
