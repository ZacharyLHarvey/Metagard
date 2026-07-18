import SideboardSpellList from "@/components/SideboardSpellList";
import type { SpellRow } from "@/lib/spellbook/types";

type Props = {
  spells: SpellRow[];
  spellbookTipsEnabled?: boolean;
  spellDetailLongPressEnabled?: boolean;
};

export default function BuildSideboardSection({
  spells,
  spellbookTipsEnabled,
  spellDetailLongPressEnabled,
}: Props) {
  return (
    <section className="rounded-lg border border-neutral-800 overflow-hidden">
      <h2 className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-lg font-semibold">Sideboard</h2>
      <SideboardSpellList
        spells={spells}
        spellbookTipsEnabled={spellbookTipsEnabled}
        spellDetailLongPressEnabled={spellDetailLongPressEnabled}
      />
    </section>
  );
}
