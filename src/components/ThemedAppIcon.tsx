"use client";

import Image from "next/image";
import {
  BRAND_IMAGE,
  SITE_ICON_ALT,
  SITE_ICON_ALT_LIGHT,
} from "@/lib/brand";
import { useDataTheme, type AppTheme } from "@/lib/useDataTheme";

type ThemedAppIconProps = {
  /** From server profile — must match `html[data-theme]` for correct SSR/hydration. */
  initialTheme: AppTheme;
  className?: string;
  sizes: string;
  priority?: boolean;
};

/**
 * Navbar / loading icon: `icon2.png` in dark mode, `icon.png` in light mode.
 * Subscribes to `html[data-theme]` so toggling Settings updates immediately.
 */
export default function ThemedAppIcon({
  initialTheme,
  className,
  sizes,
  priority,
}: ThemedAppIconProps) {
  const theme = useDataTheme(initialTheme);

  const src =
    theme === "light" ? BRAND_IMAGE.iconLight : BRAND_IMAGE.iconDark;
  const alt = theme === "light" ? SITE_ICON_ALT_LIGHT : SITE_ICON_ALT;

  return (
    <span className={`relative inline-block shrink-0 ${className ?? ""}`}>
      <Image
        key={src}
        src={src}
        alt={alt}
        width={BRAND_IMAGE.iconSize}
        height={BRAND_IMAGE.iconSize}
        className="absolute inset-0 h-full w-full object-contain"
        sizes={sizes}
        priority={priority}
      />
    </span>
  );
}
