export function normalizeClassKey(value: string | null | undefined): string {
  const raw = (value ?? "").normalize("NFKC");
  const unifiedDashes = raw.replace(/[‐‑‒–—―−]/g, "-");
  const collapsedWhitespace = unifiedDashes.replace(/\s+/g, " ").trim();
  return collapsedWhitespace ? collapsedWhitespace.toLocaleLowerCase() : "—";
}

export function normalizeClassLabel(value: string | null | undefined): string {
  const raw = (value ?? "").normalize("NFKC");
  const unifiedDashes = raw.replace(/[‐‑‒–—―−]/g, "-");
  const collapsedWhitespace = unifiedDashes.replace(/\s+/g, " ").trim();
  return collapsedWhitespace || "—";
}

export const OFFICIAL_MARTIAL_CLASS_KEYS = new Set([
  "warrior",
  "paladin",
  "anti-paladin",
  "monk",
  "scout",
  "assassin",
  "barbarian",
  "archer",
]);

export const OFFICIAL_CASTER_CLASS_KEYS = new Set(["bard", "druid", "healer", "wizard"]);

export function includeOfficialClassGroup(classKey: string, group: string): boolean {
  if (group === "all") return true;
  if (group === "caster") return OFFICIAL_CASTER_CLASS_KEYS.has(classKey);
  if (group === "martial") return OFFICIAL_MARTIAL_CLASS_KEYS.has(classKey);
  if (group.startsWith("class:")) return classKey === group.slice("class:".length);
  return true;
}

export function includeCustomClassGroup(
  classKey: string,
  classType: "martial" | "caster" | null | undefined,
  group: string
): boolean {
  if (group === "all") return true;
  if (group === "caster") return classType === "caster";
  if (group === "martial") return classType === "martial";
  if (group.startsWith("class:")) return classKey === group.slice("class:".length);
  return true;
}

export function officialBuildsPageTitle(group: string, labelByClassKey: Map<string, string>): string {
  if (group === "caster") return "Caster Builds";
  if (group === "martial") return "Martial Builds";
  if (group.startsWith("class:")) {
    return `${labelByClassKey.get(group.slice("class:".length)) ?? "Class"} Builds`;
  }
  return "All Builds";
}

export function customBuildsPageTitle(group: string, labelByClassKey: Map<string, string>): string {
  if (group === "caster") return "Caster Custom Builds";
  if (group === "martial") return "Martial Custom Builds";
  if (group.startsWith("class:")) {
    return `${labelByClassKey.get(group.slice("class:".length)) ?? "Class"} Custom Builds`;
  }
  return "All Custom Builds";
}
