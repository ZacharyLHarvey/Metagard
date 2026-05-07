"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

type Props = {
  name: string;
  label: string;
  value: string;
  options: Option[];
  clearValue?: string;
  preserveKeys?: string[];
};

export default function AutoQuerySelect({ name, label, value, options, clearValue, preserveKeys = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onSelect(nextValue: string) {
    const params = new URLSearchParams();
    for (const key of preserveKeys) {
      const v = searchParams.get(key);
      if (v != null && v !== "") params.set(key, v);
    }
    if (!(clearValue != null && nextValue === clearValue) && nextValue !== "") {
      params.set(name, nextValue);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={name} className="text-sm text-neutral-400">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
