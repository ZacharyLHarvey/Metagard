import AutoQuerySelect from "@/components/AutoQuerySelect";
import SearchForm from "@/components/search/SearchForm";
import SearchResultsList from "@/components/search/SearchResultsList";
import {
  isSearchQueryValid,
  parseSearchFilter,
  parseSearchQuery,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_TYPE_FILTER_OPTIONS,
  searchFilterToEntityTypes,
} from "@/lib/search";
import { getSearchPage } from "@/lib/queries/search";

type SearchParams = { q?: string; type?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q: rawQ, type: rawType } = await searchParams;
  const query = parseSearchQuery(rawQ);
  const typeFilter = parseSearchFilter(rawType);
  const types = searchFilterToEntityTypes(typeFilter);

  const page = await getSearchPage({ q: query, types });

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-6 sm:space-y-8 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold">Search</h1>
        <p className="text-sm text-neutral-400">
          Leave blank to browse all, or type to search builds, custom builds, spells, classes, battlegames, monsters, and players.
        </p>
      </div>

      <SearchForm key={query} initialQuery={query} typeFilter={typeFilter} />

      <AutoQuerySelect
        name="type"
        label="Show"
        value={typeFilter}
        clearValue="all"
        preserveKeys={["q"]}
        options={SEARCH_TYPE_FILTER_OPTIONS}
      />

      {query && !isSearchQueryValid(query) ? (
        <div className="border border-neutral-800 rounded-lg px-4 py-8 text-center text-neutral-500">
          Search terms must be at least {SEARCH_MIN_QUERY_LENGTH} characters.
        </div>
      ) : (
        <SearchResultsList
          key={`${query}-${typeFilter}`}
          query={query}
          typeFilter={typeFilter}
          initialItems={page.items}
          initialCursor={page.nextCursor}
        />
      )}
    </main>
  );
}
