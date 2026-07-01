import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  getStoredViewerLanguageCode,
  getViewerLanguage,
  type ViewerLanguageCode,
} from "@/utils/viewer-language";
import { translateViewerText } from "@/utils/viewer-language-dictionary";

const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "TEXTAREA"]);

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

const getAttributeOriginals = (element: Element) => {
  const existing = originalAttributes.get(element);
  if (existing) return existing;

  const originals = new Map<string, string>();
  originalAttributes.set(element, originals);
  return originals;
};

const shouldSkipElement = (element: Element | null) => {
  if (!element) return true;
  if (SKIPPED_TAGS.has(element.tagName)) return true;
  return Boolean(element.closest("[data-no-translate]"));
};

const translateTextNode = (node: Text, language: ViewerLanguageCode) => {
  if (shouldSkipElement(node.parentElement)) return;

  if (!originalText.has(node)) {
    originalText.set(node, node.nodeValue || "");
  }

  const source = originalText.get(node) || "";
  const translated = translateViewerText(source, language);
  if (node.nodeValue !== translated) node.nodeValue = translated;
};

const translateElementAttributes = (element: Element, language: ViewerLanguageCode) => {
  if (shouldSkipElement(element)) return;

  const originals = getAttributeOriginals(element);

  TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
    const value = element.getAttribute(attribute);
    if (!value) return;

    if (!originals.has(attribute)) {
      originals.set(attribute, value);
    }

    const source = originals.get(attribute) || value;
    const translated = translateViewerText(source, language);
    if (translated !== value) element.setAttribute(attribute, translated);
  });
};

const translateRoot = (root: ParentNode, language: ViewerLanguageCode) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    translateTextNode(current as Text, language);
    current = walker.nextNode();
  }

  if (root instanceof Element) {
    translateElementAttributes(root, language);
  }

  root.querySelectorAll?.("*").forEach((element) => {
    translateElementAttributes(element, language);
  });
};

const ViewerLanguageTranslator: React.FC = () => {
  const router = useRouter();
  const languageRef = useRef<ViewerLanguageCode>("en");
  const translatingRef = useRef(false);
  const pendingFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const runTranslation = () => {
      if (pendingFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingFrameRef.current);
      }

      pendingFrameRef.current = window.requestAnimationFrame(() => {
        translatingRef.current = true;
        translateRoot(document.body, languageRef.current);
        document.documentElement.lang = getViewerLanguage(languageRef.current).htmlLang;
        translatingRef.current = false;
        pendingFrameRef.current = null;
      });
    };

    const setLanguage = (code?: string) => {
      languageRef.current = getViewerLanguage(code).code;
      runTranslation();
    };

    setLanguage(getStoredViewerLanguageCode());

    const handleLanguageChange = (event: Event) => {
      setLanguage((event as CustomEvent<{ code?: string }>).detail?.code);
    };

    const observer = new MutationObserver((mutations) => {
      if (translatingRef.current) return;
      if (
        mutations.some((mutation) => {
          const target = mutation.target;
          return target instanceof Element
            ? !shouldSkipElement(target)
            : target.parentElement
              ? !shouldSkipElement(target.parentElement)
              : false;
        })
      ) {
        runTranslation();
      }
    });

    window.addEventListener("rophim:viewer-language-change", handleLanguageChange);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => {
      window.removeEventListener("rophim:viewer-language-change", handleLanguageChange);
      observer.disconnect();
      if (pendingFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("rophim:viewer-language-change", {
        detail: getViewerLanguage(languageRef.current),
      })
    );
  }, [router.asPath]);

  return null;
};

export default ViewerLanguageTranslator;
