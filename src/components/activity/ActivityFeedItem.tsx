"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import CreatorAttribution from "@/components/CreatorAttribution";
import {
  activityFeedEntityTypeLabel,
  formatActivityFeedDate,
  formatActivityFeedSubtitle,
  type ActivityFeedItem,
} from "@/lib/activityFeed";

const INTERACTIVE_SELECTOR =
  "a[href], button, input, textarea, select, [role='button'], [data-prevent-activity-row-nav]";

type Props = {
  item: ActivityFeedItem;
};

export default function ActivityFeedItem({ item }: Props) {
  const router = useRouter();
  const subtitle = formatActivityFeedSubtitle(item);

  function handleClick(e: MouseEvent<HTMLLIElement>) {
    if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
    router.push(item.href);
  }

  return (
    <li
      className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 cursor-pointer hover:bg-neutral-900/40 transition"
      onClick={handleClick}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="inline-flex shrink-0 rounded border border-neutral-700 bg-neutral-800/80 px-2 py-0.5 text-xs text-neutral-300">
            {activityFeedEntityTypeLabel(item.entityType)}
          </span>
          <span className="text-xs text-neutral-500">{formatActivityFeedDate(item.createdAt)}</span>
        </div>
        <p className="font-medium text-neutral-100">{item.name}</p>
        {subtitle ? <p className="text-xs text-neutral-500 mt-1">{subtitle}</p> : null}
        <div className="mt-1">
          <CreatorAttribution
            ownerId={item.ownerId}
            displayName={item.creatorDisplayName ?? (item.ownerId ? "Player" : "—")}
          />
        </div>
      </div>
    </li>
  );
}
