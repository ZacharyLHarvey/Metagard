"use client";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  name?: string;
};

export default function SegmentedToggle<T extends string>({ value, options, onChange, name }: Props<T>) {
  return (
    <div
      className="inline-flex rounded-full border border-neutral-700 bg-neutral-800/80 p-1"
      role="group"
      aria-label={name}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-neutral-300 hover:text-white hover:bg-neutral-700/60"
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
