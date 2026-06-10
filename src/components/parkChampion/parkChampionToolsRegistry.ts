import type { ComponentType } from "react";
import ParkChampionRandomBattlegamePicker from "@/components/ParkChampionRandomBattlegamePicker";
import ParkChampionRandomNumberGenerator from "@/components/parkChampion/ParkChampionRandomNumberGenerator";
import ParkChampionRandomTimeIntervalPicker from "@/components/parkChampion/ParkChampionRandomTimeIntervalPicker";
import ParkChampionRandomWeaponPicker from "@/components/parkChampion/ParkChampionRandomWeaponPicker";
import ParkChampionRandomClassPicker from "@/components/parkChampion/ParkChampionRandomClassPicker";
import ParkChampionRandomBuildPicker from "@/components/parkChampion/ParkChampionRandomBuildPicker";
import ParkChampionRandomMonsterPicker from "@/components/parkChampion/ParkChampionRandomMonsterPicker";
import ParkChampionRandomSpellPicker from "@/components/parkChampion/ParkChampionRandomSpellPicker";

export type ParkChampionToolDefinition = {
  id: string;
  label: string;
  Component: ComponentType;
  /** Wrap in Suspense when the tool uses hooks like useSearchParams. */
  suspense?: boolean;
};

export const PARK_CHAMPION_TOOLS: ParkChampionToolDefinition[] = [
  {
    id: "random-battlegame",
    label: "Random Battlegame Picker",
    Component: ParkChampionRandomBattlegamePicker,
    suspense: true,
  },
  {
    id: "random-number-generator",
    label: "Random Number Generator",
    Component: ParkChampionRandomNumberGenerator,
  },
  {
    id: "random-time-interval",
    label: "Random Time Interval Picker",
    Component: ParkChampionRandomTimeIntervalPicker,
  },
  {
    id: "random-weapon-picker",
    label: "Random Weapon Picker",
    Component: ParkChampionRandomWeaponPicker,
  },
  {
    id: "random-class-picker",
    label: "Random Class Picker",
    Component: ParkChampionRandomClassPicker,
  },
  {
    id: "random-build-picker",
    label: "Random Build Picker",
    Component: ParkChampionRandomBuildPicker,
    suspense: true,
  },
  {
    id: "random-monster-picker",
    label: "Random Monster Picker",
    Component: ParkChampionRandomMonsterPicker,
  },
  {
    id: "random-spell-picker",
    label: "Random Spell Picker",
    Component: ParkChampionRandomSpellPicker,
  },
];

export const DEFAULT_PARK_TOOL_ID = PARK_CHAMPION_TOOLS[0]?.id ?? "random-battlegame";

export function findParkToolById(id: string): ParkChampionToolDefinition | undefined {
  return PARK_CHAMPION_TOOLS.find((t) => t.id === id);
}
