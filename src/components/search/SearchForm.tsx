"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { SearchFilter } from "@/lib/search";

type Props = {
  initialQuery: string;
  typeFilter: SearchFilter;
};

export default function SearchForm({ initialQuery, typeFilter }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    if (typeFilter !== "all") params.set("type", typeFilter);
    const query = params.toString();
    router.push(query ? `/search?${query}` : "/search");
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <label htmlFor="search-query" className="sr-only">
        Search Metagard
      </label>
      <input
        id="search-query"
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search builds, custom builds, spells, players…"
        autoFocus
        className="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded text-base"
      />
      <button
        type="submit"
        className="px-4 py-3 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium shrink-0"
      >
        Search
      </button>
    </form>
  );
}
