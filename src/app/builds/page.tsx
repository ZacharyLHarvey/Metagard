import Link from "next/link";
import SaveBuildButton from "@/components/SaveBuildButton";

// Full build list — at least two per class
const allBuilds = [
    // Anti‑Paladin
    { id: 1, name: "Doom Herald", class: "Anti‑Paladin", level: 6 },
    { id: 2, name: "Black Oathbreaker", class: "Anti‑Paladin", level: 3 },
  
    // Archer
    { id: 3, name: "Falcon Eye", class: "Archer", level: 5 },
    { id: 4, name: "Windstrider", class: "Archer", level: 2 },
  
    // Assassin
    { id: 5, name: "Shadowblade", class: "Assassin", level: 3 },
    { id: 6, name: "Night Reaper", class: "Assassin", level: 5 },
  
    // Barbarian
    { id: 7, name: "Rageborn Berserker", class: "Barbarian", level: 6 },
    { id: 8, name: "Bloodhowl Raider", class: "Barbarian", level: 4 },
  
    // Bard
    { id: 9, name: "Echoweaver", class: "Bard", level: 3 },
    { id: 10, name: "Silver Chanter", class: "Bard", level: 1 },
  
    // Druid
    { id: 11, name: "Stormcaller", class: "Druid", level: 4 },
    { id: 12, name: "Verdant Shaper", class: "Druid", level: 6 },
  
    // Healer
    { id: 13, name: "Sunward Acolyte", class: "Healer", level: 2 },
    { id: 14, name: "Sanctum Keeper", class: "Healer", level: 5 },
  
    // Monk
    { id: 15, name: "Lotus Striker", class: "Monk", level: 6 },
    { id: 16, name: "Silent Palm", class: "Monk", level: 2 },
  
    // Paladin
    { id: 17, name: "Radiant Vindicator", class: "Paladin", level: 6 },
    { id: 18, name: "Oathbound Shield", class: "Paladin", level: 3 },
  
    // Scout
    { id: 19, name: "Trailstalker", class: "Scout", level: 4 },
    { id: 20, name: "Greencloak Ranger", class: "Scout", level: 1 },
  
    // Warrior
    { id: 21, name: "Stoneheart Guardian", class: "Warrior", level: 5 },
    { id: 22, name: "Iron Vanguard", class: "Warrior", level: 2 },
  
    // Wizard
    { id: 23, name: "Firestorm Adept", class: "Wizard", level: 6 },
    { id: 24, name: "Arcane Tempest", class: "Wizard", level: 4 },
  ];
  

export default function BuildsPage() {
  return (
    <main className="p-10 text-white">
      <h1 className="text-2xl font-bold mb-6">All Builds</h1>

      {/* Shared column layout (matches homepage exactly) */}
      <style>
        {`
          .col-name { width: 40%; }
          .col-class { width: 20%; }
          .col-level { width: 15%; }
          .col-actions { width: 25%; }
        `}
      </style>

      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-neutral-900">
            <tr>
              <th className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                Name
              </th>
              <th className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                Class
              </th>
              <th className="col-level px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                Level
              </th>
              <th className="col-actions px-4 py-2 border-b border-neutral-800 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {allBuilds.map((b) => (
              <tr key={b.id} className="hover:bg-neutral-900/40 transition">
                <td className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  {b.name}
                </td>

                <td className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  {b.class}
                </td>

                <td className="col-level px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  {b.level}
                </td>

                <td className="col-actions px-4 py-2 border-b border-neutral-800 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/builds/${b.id}`}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      View
                    </Link>

                    <SaveBuildButton buildId={b.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
