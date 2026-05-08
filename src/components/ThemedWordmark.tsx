"use client";

import Image from "next/image";
import {
  BRAND_IMAGE,
  SITE_LOGO_ALT,
  SITE_LOGO_ALT_LIGHT,
} from "@/lib/brand";
import { useDataTheme, type AppTheme } from "@/lib/useDataTheme";

type ThemedWordmarkProps = {
  initialTheme: AppTheme;
  priority?: boolean;
};

/**
 * Full wordmark: `logo.png` / `logo2.png` following `html[data-theme]`.
 */
export default function ThemedWordmark({
  initialTheme,
  priority,
}: ThemedWordmarkProps) {
  const theme = useDataTheme(initialTheme);

  const src =
    theme === "light" ? BRAND_IMAGE.logoLight : BRAND_IMAGE.logoDark;
  const alt = theme === "light" ? SITE_LOGO_ALT_LIGHT : SITE_LOGO_ALT;

  return (
    <div className="relative mx-auto aspect-[900/650] w-full max-w-md sm:max-w-lg">
      <Image
        key={src}
        src={src}
        alt={alt}
        width={BRAND_IMAGE.logoWidth}
        height={BRAND_IMAGE.logoHeight}
        className="absolute inset-0 h-full w-full object-contain object-center"
        sizes="(max-width: 640px) 100vw, 32rem"
        priority={priority}
      />
    </div>
  );
}
