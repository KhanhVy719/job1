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

export const normalizeViewerLanguageCode = (code?: string | null): ViewerLanguageCode | undefined => {
  const normalized = code?.trim().toLowerCase();
  if (!normalized) return undefined;
  return VIEWER_LANGUAGES.find((language) => language.code === normalized)?.code;
};

export const getViewerLanguage = (code?: string | null) =>
  VIEWER_LANGUAGES.find((language) => language.code === normalizeViewerLanguageCode(code)) || VIEWER_LANGUAGES[0];

export const getViewerLanguageFromCookieHeader = (cookieHeader?: string) => {
  if (!cookieHeader) return undefined;

  const value = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${VIEWER_LANGUAGE_COOKIE_KEY}=`))
    ?.slice(VIEWER_LANGUAGE_COOKIE_KEY.length + 1);

  if (!value) return undefined;

  try {
    return normalizeViewerLanguageCode(decodeURIComponent(value));
  } catch {
    return normalizeViewerLanguageCode(value);
  }
};

export const getViewerLanguageRequestHeaders = (cookieHeader?: string) => {
  const language = getViewerLanguageFromCookieHeader(cookieHeader);
  return language ? { "X-Viewer-Language": language } : {};
};

export const getCookieViewerLanguage = () =>
  document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${VIEWER_LANGUAGE_COOKIE_KEY}=`))
    ?.split("=")[1];

export const getStoredViewerLanguageCode = () =>
  normalizeViewerLanguageCode(localStorage.getItem(VIEWER_LANGUAGE_STORAGE_KEY)) ||
  normalizeViewerLanguageCode(getCookieViewerLanguage()) ||
  "en";

export const persistViewerLanguage = (code: ViewerLanguageCode) => {
  localStorage.setItem(VIEWER_LANGUAGE_STORAGE_KEY, code);
  document.cookie = `${VIEWER_LANGUAGE_COOKIE_KEY}=${code}; path=/; max-age=${VIEWER_LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax`;
};
