"use client";

import { useState } from "react";

export default function CreateBuildForm() {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [level, setLevel] = useState(1);

  const classes = [
    "Anti‑Paladin",
    "Archer",
    "Assassin",
    "Barbarian",
    "Bard",
    "Druid",
    "Healer",
    "Monk",
    "Paladin",
    "Scout",
    "Warrior",
    "Wizard",
  ];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("Creating build:", { name, className, level });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      <div>
        <label className="block mb-2 text-neutral-300">Build Name</label>
        <input
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Class</label>
        <select
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          required
        >
          <option value="">Select a class</option>
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Level</label>
        <input
          type="number"
          min="1"
          max="6"
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          required
        />
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
      >
        Create Build
      </button>
    </form>
  );
}
