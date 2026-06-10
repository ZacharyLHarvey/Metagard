export type BuildViewDisplayDefault = "level" | "type" | "school";

export type BuildViewDefaults = {
  display: BuildViewDisplayDefault;
  showTypeSchool: boolean;
  showIncantation: boolean;
  showMaterials: boolean;
  showRange: boolean;
};

export type BuildEditDefaults = {
  showTypeSchool: boolean;
  showIncantation: boolean;
  showMaterials: boolean;
  showRange: boolean;
};

export const DEFAULT_BUILD_VIEW_DEFAULTS: BuildViewDefaults = {
  display: "level",
  showTypeSchool: false,
  showIncantation: false,
  showMaterials: false,
  showRange: false,
};

export const DEFAULT_BUILD_EDIT_DEFAULTS: BuildEditDefaults = {
  showTypeSchool: false,
  showIncantation: false,
  showMaterials: false,
  showRange: false,
};

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseDisplay(value: unknown, fallback: BuildViewDisplayDefault): BuildViewDisplayDefault {
  if (value === "type" || value === "school" || value === "level") return value;
  return fallback;
}

export function parseBuildViewDefaults(raw: unknown): BuildViewDefaults {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_BUILD_VIEW_DEFAULTS };
  }
  const o = raw as Record<string, unknown>;
  return {
    display: parseDisplay(o.display, DEFAULT_BUILD_VIEW_DEFAULTS.display),
    showTypeSchool: parseBoolean(o.showTypeSchool, DEFAULT_BUILD_VIEW_DEFAULTS.showTypeSchool),
    showIncantation: parseBoolean(o.showIncantation, DEFAULT_BUILD_VIEW_DEFAULTS.showIncantation),
    showMaterials: parseBoolean(o.showMaterials, DEFAULT_BUILD_VIEW_DEFAULTS.showMaterials),
    showRange: parseBoolean(o.showRange, DEFAULT_BUILD_VIEW_DEFAULTS.showRange),
  };
}

export function parseBuildEditDefaults(raw: unknown): BuildEditDefaults {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_BUILD_EDIT_DEFAULTS };
  }
  const o = raw as Record<string, unknown>;
  return {
    showTypeSchool: parseBoolean(o.showTypeSchool, DEFAULT_BUILD_EDIT_DEFAULTS.showTypeSchool),
    showIncantation: parseBoolean(o.showIncantation, DEFAULT_BUILD_EDIT_DEFAULTS.showIncantation),
    showMaterials: parseBoolean(o.showMaterials, DEFAULT_BUILD_EDIT_DEFAULTS.showMaterials),
    showRange: parseBoolean(o.showRange, DEFAULT_BUILD_EDIT_DEFAULTS.showRange),
  };
}
