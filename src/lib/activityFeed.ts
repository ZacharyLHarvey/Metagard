export type ActivityFeedEntityType =
  | "build"
  | "build_group"
  | "monster"
  | "custom_spell"
  | "custom_class"
  | "battlegame";

export type ActivityFeedFilter =
  | "all"
  | "builds"
  | "build-groups"
  | "monsters"
  | "custom-spells"
  | "custom-classes"
  | "battlegames";

export const ACTIVITY_FEED_FILTER_OPTIONS: { value: ActivityFeedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "builds", label: "Builds" },
  { value: "build-groups", label: "Build Groups" },
  { value: "monsters", label: "Monsters" },
  { value: "custom-spells", label: "Custom Spells" },
  { value: "custom-classes", label: "Custom Classes" },
  { value: "battlegames", label: "Battlegames" },
];

export type ActivityFeedMeta = Record<string, unknown>;

export type ActivityFeedItem = {
  entityType: ActivityFeedEntityType;
  entityId: number;
  name: string;
  ownerId: string | null;
  createdAt: string;
  meta: ActivityFeedMeta;
  href: string;
  creatorDisplayName?: string;
};

const FILTER_TO_RPC: Record<Exclude<ActivityFeedFilter, "all">, ActivityFeedEntityType> = {
  builds: "build",
  "build-groups": "build_group",
  monsters: "monster",
  "custom-spells": "custom_spell",
  "custom-classes": "custom_class",
  battlegames: "battlegame",
};

const ENTITY_TYPE_LABELS: Record<ActivityFeedEntityType, string> = {
  build: "Build",
  build_group: "Build Group",
  monster: "Monster",
  custom_spell: "Custom Spell",
  custom_class: "Custom Class",
  battlegame: "Battlegame",
};

export function parseActivityFeedFilter(raw: string | undefined): ActivityFeedFilter {
  if (
    raw === "builds" ||
    raw === "build-groups" ||
    raw === "monsters" ||
    raw === "custom-spells" ||
    raw === "custom-classes" ||
    raw === "battlegames"
  ) {
    return raw;
  }
  return "all";
}

export function activityFeedFilterToRpc(filter: ActivityFeedFilter): string {
  if (filter === "all") return "all";
  return FILTER_TO_RPC[filter];
}

export function activityFeedEntityTypeLabel(entityType: ActivityFeedEntityType): string {
  return ENTITY_TYPE_LABELS[entityType];
}

export function activityFeedHref(entityType: ActivityFeedEntityType, entityId: number): string {
  switch (entityType) {
    case "build":
      return `/builds/${entityId}`;
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
    default:
      return "/";
  }
}

function truncateText(value: string, maxLen: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function formatActivityFeedSubtitle(item: Pick<ActivityFeedItem, "entityType" | "meta">): string | null {
  const meta = item.meta;
  switch (item.entityType) {
    case "build": {
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
    default:
      return null;
  }
}

export function formatActivityFeedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type ActivityFeedRpcRow = {
  entity_type: string;
  entity_id: number;
  name: string;
  owner_id: string | null;
  created_at: string;
  meta: ActivityFeedMeta | null;
};

function isActivityFeedEntityType(value: string): value is ActivityFeedEntityType {
  return (
    value === "build" ||
    value === "build_group" ||
    value === "monster" ||
    value === "custom_spell" ||
    value === "custom_class" ||
    value === "battlegame"
  );
}

export function mapActivityFeedRpcRow(row: ActivityFeedRpcRow): ActivityFeedItem | null {
  if (!isActivityFeedEntityType(row.entity_type)) return null;
  const entityType = row.entity_type;
  return {
    entityType,
    entityId: row.entity_id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    meta: row.meta ?? {},
    href: activityFeedHref(entityType, row.entity_id),
  };
}

export const ACTIVITY_FEED_DEFAULT_LIMIT = 20;
export const ACTIVITY_FEED_MAX_LIMIT = 50;

export function parseActivityFeedLimit(raw: string | null): number {
  const n = raw != null ? Number(raw) : ACTIVITY_FEED_DEFAULT_LIMIT;
  if (!Number.isFinite(n) || n < 1) return ACTIVITY_FEED_DEFAULT_LIMIT;
  return Math.min(Math.floor(n), ACTIVITY_FEED_MAX_LIMIT);
}
