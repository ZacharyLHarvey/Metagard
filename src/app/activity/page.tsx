import AutoQuerySelect from "@/components/AutoQuerySelect";
import ActivityFeedList from "@/components/activity/ActivityFeedList";
import {
  ACTIVITY_FEED_FILTER_OPTIONS,
  parseActivityFeedFilter,
} from "@/lib/activityFeed";
import { getActivityFeedPage } from "@/lib/queries/activityFeed";

type Search = { feed?: string };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { feed: rawFeed } = await searchParams;
  const feed = parseActivityFeedFilter(rawFeed);
  const { items, nextCursor } = await getActivityFeedPage({ feed });

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-6 sm:space-y-8 max-w-4xl">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold">Activity</h1>
          <p className="text-sm text-neutral-400">Latest community builds and creations, newest first.</p>
        </div>
        <AutoQuerySelect
          name="feed"
          label="Show"
          value={feed}
          clearValue="all"
          options={ACTIVITY_FEED_FILTER_OPTIONS}
        />
      </div>

      <ActivityFeedList
        key={feed}
        feed={feed}
        initialItems={items}
        initialCursor={nextCursor}
      />
    </main>
  );
}
