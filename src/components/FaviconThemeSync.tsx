"use client";

import { useEffect } from "react";
import { BRAND_IMAGE } from "@/lib/brand";

function applyFavicons(theme: string | null) {
  const href = theme === "light" ? BRAND_IMAGE.iconLight : BRAND_IMAGE.iconDark;

  const ensureLink = (rel: string) => {
    let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    return link;
  };

  ensureLink("icon").href = href;
  const apple = ensureLink("apple-touch-icon");
  apple.href = href;
}

/**
 * Keeps tab / home-screen icons aligned with app theme (`data-theme`), not system preference.
 */
export default function FaviconThemeSync() {
  useEffect(() => {
    applyFavicons(document.documentElement.getAttribute("data-theme"));

    const observer = new MutationObserver(() => {
      applyFavicons(document.documentElement.getAttribute("data-theme"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
