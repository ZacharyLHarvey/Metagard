export type SearchEntityType =
  | "build"
  | "custom_build"
  | "build_group"
  | "monster"
  | "custom_spell"
  | "custom_class"
  | "battlegame"
  | "spell"
  | "class"
  | "profile";

export type SearchFilter =
  | "all"
  | "builds"
  | "custom-builds"
  | "build-groups"
  | "monsters"
  | "custom-spells"
  | "custom-classes"
  | "battlegames"
  | "spells"
  | "classes"
  | "profiles";

export type SearchMeta = Record<string, unknown>;

export type SearchResultItem = {
  entityType: SearchEntityType;
  entityId: number;
  entityUuid: string | null;
  title: string;
  ownerId: string | null;
  meta: SearchMeta;
  rank: number;
  href: string;
  creatorDisplayName?: string;
};

export type SearchCursor = {
  rank: number;
  entityType: SearchEntityType;
  entityId: number;
  entityUuid: string | null;
};

export type SearchPage = {
  items: SearchResultItem[];
  nextCursor: string | null;
};

export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 50;

export const SEARCH_TYPE_FILTER_OPTIONS: { value: SearchFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "builds", label: "Builds" },
  { value: "custom-builds", label: "Custom Builds" },
  { value: "spells", label: "Spells" },
  { value: "classes", label: "Classes" },
  { value: "profiles", label: "Users" },
  { value: "build-groups", label: "Build Groups" },
  { value: "monsters", label: "Monsters" },
  { value: "custom-spells", label: "Custom Spells" },
  { value: "custom-classes", label: "Custom Classes" },
  { value: "battlegames", label: "Battlegames" },
];

const FILTER_TO_ENTITY_TYPES: Record<Exclude<SearchFilter, "all">, SearchEntityType[]> = {
  builds: ["build"],
  "custom-builds": ["custom_build"],
  "build-groups": ["build_group"],
  monsters: ["monster"],
  "custom-spells": ["custom_spell"],
  "custom-classes": ["custom_class"],
  battlegames: ["battlegame"],
  spells: ["spell"],
  classes: ["class"],
  profiles: ["profile"],
};

const ENTITY_TYPE_LABELS: Record<SearchEntityType, string> = {
  build: "Build",
  custom_build: "Custom Build",
  build_group: "Build Group",
  monster: "Monster",
  custom_spell: "Custom Spell",
  custom_class: "Custom Class",
  battlegame: "Battlegame",
  spell: "Spell",
  class: "Class",
  profile: "User",
};

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function parseSearchQuery(raw: string | null | undefined): string {
  return (raw ?? "").trim();
}

export function isSearchQueryValid(query: string): boolean {
  return query.length >= SEARCH_MIN_QUERY_LENGTH;
}

export function isSearchBrowseMode(query: string): boolean {
  return query.length === 0;
}

export function parseSearchFilter(raw: string | null | undefined): SearchFilter {
  const value = raw?.trim();
  if (
    value === "builds" ||
    value === "custom-builds" ||
    value === "build-groups" ||
    value === "monsters" ||
    value === "custom-spells" ||
    value === "custom-classes" ||
    value === "battlegames" ||
    value === "spells" ||
    value === "classes" ||
    value === "profiles"
  ) {
    return value;
  }
  return "all";
}

export function parseSearchTypes(raw: string | null | undefined): SearchEntityType[] | null {
  if (!raw?.trim()) return null;
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  const types = new Set<SearchEntityType>();
  for (const part of parts) {
    const filter = parseSearchFilter(part);
    if (filter === "all") continue;
    for (const entityType of FILTER_TO_ENTITY_TYPES[filter]) {
      types.add(entityType);
    }
  }
  return types.size > 0 ? [...types] : null;
}

export function searchFilterToEntityTypes(filter: SearchFilter): SearchEntityType[] | null {
  if (filter === "all") return null;
  return FILTER_TO_ENTITY_TYPES[filter];
}

export function parseSearchLimit(raw: string | null | undefined): number {
  const n = raw != null ? Number(raw) : SEARCH_DEFAULT_LIMIT;
  if (!Number.isFinite(n) || n < 1) return SEARCH_DEFAULT_LIMIT;
  return Math.min(Math.floor(n), SEARCH_MAX_LIMIT);
}

export function searchEntityTypeLabel(entityType: SearchEntityType): string {
  return ENTITY_TYPE_LABELS[entityType];
}

export function normalizeEntityUuid(value: string | null | undefined): string | null {
  if (!value || value === NIL_UUID) return null;
  return value;
}

export function searchResultHref(
  entityType: SearchEntityType,
  entityId: number,
  entityUuid?: string | null
): string {
  switch (entityType) {
    case "build":
      return `/builds/${entityId}`;
    case "custom_build":
      return `/custom-builds/${entityId}`;
    case "build_group":
      return `/build-groups/${entityId}`;
    case "monster":
      return `/monsters/${entityId}`;
    case "custom_spell":
      return `/custom-spells/${entityId}`;
    case "custom_class":
      return `/custom-classes/${entityId}`;
    case "battlegame":
      return `/battlegames/${entityId}`;
    case "spell":
      return `/spells/${entityId}`;
    case "class":
      return `/classes/${entityId}`;
    case "profile":
      return `/profile/${entityUuid ?? entityId}`;
    default:
      return "/";
  }
}

function truncateText(value: string, maxLen: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function formatSearchSubtitle(item: Pick<SearchResultItem, "entityType" | "meta">): string | null {
  const meta = item.meta;
  switch (item.entityType) {
    case "build":
    case "custom_build": {
      const className = typeof meta.class === "string" ? meta.class : null;
      const level = typeof meta.level === "number" ? meta.level : null;
      const ltp = meta.look_the_part === true;
      if (!className && level == null) return null;
      const parts = [className, level != null ? `L${level}` : null, ltp ? "Look the Part" : null].filter(Boolean);
      return parts.join(" · ");
    }
    case "build_group": {
      const count = typeof meta.member_count === "number" ? meta.member_count : 0;
      return `${count} build${count === 1 ? "" : "s"}`;
    }
    case "monster": {
      const type = typeof meta.monster_type === "string" ? meta.monster_type : null;
      const threat = typeof meta.threat_level === "string" ? meta.threat_level : null;
      const parts = [type, threat ? `Tier ${threat}` : null].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : null;
    }
    case "custom_spell":
    case "custom_class": {
      const desc = typeof meta.description === "string" ? meta.description : null;
      return desc ? truncateText(desc, 80) : null;
    }
    case "battlegame": {
      const gameType = typeof meta.game_type === "string" ? meta.game_type : null;
      return gameType || null;
    }
    case "spell": {
      const type = typeof meta.type === "string" ? meta.type : null;
      const school = typeof meta.school === "string" ? meta.school : null;
      const parts = [type, school].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : null;
    }
    case "class":
      return "Catalog class";
    case "profile":
      return "Player profile";
    default:
      return null;
  }
}

export type SearchRpcRow = {
  entity_type: string;
  entity_id: number;
  entity_uuid: string;
  title: string;
  owner_id: string | null;
  meta: SearchMeta | null;
  rank: number;
};

function isSearchEntityType(value: string): value is SearchEntityType {
  return (
    value === "build" ||
    value === "custom_build" ||
    value === "build_group" ||
    value === "monster" ||
    value === "custom_spell" ||
    value === "custom_class" ||
    value === "battlegame" ||
    value === "spell" ||
    value === "class" ||
    value === "profile"
  );
}

export function mapSearchRpcRow(row: SearchRpcRow): SearchResultItem | null {
  if (!isSearchEntityType(row.entity_type)) return null;
  const entityUuid = normalizeEntityUuid(row.entity_uuid);
  return {
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityUuid,
    title: row.title,
    ownerId: row.owner_id,
    meta: row.meta ?? {},
    rank: row.rank,
    href: searchResultHref(row.entity_type, row.entity_id, entityUuid),
  };
}

export function encodeSearchCursor(cursor: SearchCursor): string {
  return Buffer.from(
    JSON.stringify({
      rank: cursor.rank,
      entityType: cursor.entityType,
      entityId: cursor.entityId,
      entityUuid: cursor.entityUuid ?? NIL_UUID,
    }),
    "utf8"
  ).toString("base64url");
}

export function decodeSearchCursor(raw: string | null | undefined): SearchCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      rank?: unknown;
      entityType?: unknown;
      entityId?: unknown;
      entityUuid?: unknown;
    };
    if (
      typeof parsed.rank !== "number" ||
      typeof parsed.entityType !== "string" ||
      !isSearchEntityType(parsed.entityType) ||
      typeof parsed.entityId !== "number"
    ) {
      return null;
    }
    return {
      rank: parsed.rank,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      entityUuid:
        typeof parsed.entityUuid === "string"
          ? normalizeEntityUuid(parsed.entityUuid)
          : null,
    };
  } catch {
    return null;
  }
}

export function searchCursorFromItem(item: SearchResultItem): SearchCursor {
  return {
    rank: item.rank,
    entityType: item.entityType,
    entityId: item.entityId,
    entityUuid: item.entityUuid,
  };
}
