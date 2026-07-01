export type ViewerLanguageCode = "en" | "fil";

export const VIEWER_LANGUAGE_STORAGE_KEY = "rophim.viewerLanguage";
export const VIEWER_LANGUAGE_COOKIE_KEY = "viewer_language";
export const VIEWER_LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const VIEWER_LANGUAGES: Array<{
  code: ViewerLanguageCode;
  htmlLang: string;
  label: string;
  shortLabel: string;
}> = [
  { code: "en", htmlLang: "en", label: "English", shortLabel: "EN" },
  { code: "fil", htmlLang: "fil-PH", label: "Filipino", shortLabel: "FIL" },
];

export const getViewerLanguage = (code?: string) =>
  VIEWER_LANGUAGES.find((language) => language.code === code) || VIEWER_LANGUAGES[0];

export const getCookieViewerLanguage = () =>
  document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${VIEWER_LANGUAGE_COOKIE_KEY}=`))
    ?.split("=")[1];

export const getStoredViewerLanguageCode = () =>
  localStorage.getItem(VIEWER_LANGUAGE_STORAGE_KEY) || getCookieViewerLanguage() || "en";

export const persistViewerLanguage = (code: ViewerLanguageCode) => {
  localStorage.setItem(VIEWER_LANGUAGE_STORAGE_KEY, code);
  document.cookie = `${VIEWER_LANGUAGE_COOKIE_KEY}=${code}; path=/; max-age=${VIEWER_LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax`;
};
