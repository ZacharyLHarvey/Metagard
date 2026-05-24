/** Image paths — dark assets are default when `data-theme` is absent or `dark`. */
export const BRAND_IMAGE = {
  logoDark: "/images/logo2.png",
  logoLight: "/images/logo.png",
  iconDark: "/images/icon2.png",
  iconLight: "/images/icon.png",
  logoWidth: 900,
  logoHeight: 650,
  iconSize: 1024,
  ogImage: "/og-image.png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
} as const;

/** Open Graph / social preview alt — `og-image.png`. */
export const SITE_OG_IMAGE_ALT =
  "Metagard — community tools for Amtgard builds, spells, and battlegames";

/** Full wordmark alt — `logo2.png` (dark theme). */
export const SITE_LOGO_ALT =
  "Metagard logo: stylized dark lettering over a shield and crossed swords";

/** Full wordmark alt — `logo.png` (light theme). */
export const SITE_LOGO_ALT_LIGHT =
  "Metagard logo: stylized light lettering over a shield and crossed swords on dark fields";

/** App icon alt — `icon2.png` (dark theme). */
export const SITE_ICON_ALT =
  "Metagard icon: distressed dark letter M inside a spiky shield with crossed swords";

/** App icon alt — `icon.png` (light theme). */
export const SITE_ICON_ALT_LIGHT =
  "Metagard icon: distressed light letter M inside a spiky shield with crossed swords on dark fields";
