/** Image paths — dark assets are default when `data-theme` is absent or `dark`. */
export const BRAND_IMAGE = {
  logoDark: "/images/logo.png",
  logoLight: "/images/logo2.png",
  iconDark: "/images/icon.png",
  iconLight: "/images/icon2.png",
  logoWidth: 900,
  logoHeight: 650,
  iconSize: 1024,
} as const;

/** Full wordmark — dark mode (light artwork on dark background). */
export const SITE_LOGO_ALT =
  "Metagard logo: stylized jagged white text over a shield and crossed swords on a black background";

/** Full wordmark — light mode (dark artwork on light background). */
export const SITE_LOGO_ALT_LIGHT =
  "Metagard logo for light mode: stylized dark text over a shield and crossed swords on a light background";

/** App icon — dark mode. */
export const SITE_ICON_ALT =
  "Metagard icon: distressed white letter M inside a spiky shield with crossed swords on a black background";

/** App icon — light mode. */
export const SITE_ICON_ALT_LIGHT =
  "Metagard icon for light mode: distressed dark letter M inside a spiky shield with crossed swords on a light background";
