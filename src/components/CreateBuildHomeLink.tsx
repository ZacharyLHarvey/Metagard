"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_IMAGE } from "@/lib/brand";
import { useDataTheme, type AppTheme } from "@/lib/useDataTheme";

/** Match `ThemedAppIcon` in the navbar (`Navbar.tsx`). */
const navIconBoxClass = "relative inline-block h-10 w-10 shrink-0 sm:h-11 sm:w-11";
const navIconSizes = "(max-width: 640px) 40px, 44px";

const iconImageClass = "absolute inset-0 h-full w-full object-contain";

export default function CreateBuildHomeLink({
  initialTheme,
}: {
  initialTheme: AppTheme;
}) {
  const theme = useDataTheme(initialTheme);
  const src = theme === "light" ? BRAND_IMAGE.iconLight : BRAND_IMAGE.iconDark;

  return (
    <div className="inline-flex items-center justify-center gap-3 sm:gap-4">
      <span className={navIconBoxClass} aria-hidden>
        <Image
          key={src}
          src={src}
          alt=""
          width={BRAND_IMAGE.iconSize}
          height={BRAND_IMAGE.iconSize}
          className={iconImageClass}
          sizes={navIconSizes}
        />
      </span>
      <Link
        href="/create-build"
        className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 transition"
      >
        Create Build
      </Link>
      <span className={navIconBoxClass} aria-hidden>
        <Image
          key={`${src}-r`}
          src={src}
          alt=""
          width={BRAND_IMAGE.iconSize}
          height={BRAND_IMAGE.iconSize}
          className={iconImageClass}
          sizes={navIconSizes}
        />
      </span>
    </div>
  );
}
