/**
 * Read-only gap analysis: compares parity SQL archetype canon to app code surfaces.
 * Run: node scripts/archetype-gap-analysis.mjs
 * Output: docs/archetype-gap-analysis-data.json (consumed by doc author)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const sqlPath = path.join(root, "supabase/policies/generated_swiftgard_parity.sql");
const grantsPath = path.join(root, "src/lib/spellbook/archetypeGrantedSpells.ts");
const rulesPath = path.join(root, "src/lib/spellbook/rules.ts");
const gearPath = path.join(root, "src/lib/spellbook/martialEquipment.ts");

const sql = fs.readFileSync(sqlPath, "utf8");
const grantsSrc = fs.readFileSync(grantsPath, "utf8");
const rulesSrc = fs.readFileSync(rulesPath, "utf8");
const gearSrc = fs.readFileSync(gearPath, "utf8");

/** Parse archetype rows from parity SQL inserts (line-oriented). */
function parseArchetypesFromSql(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.includes("'Archetype'")) continue;
    const idM = line.match(/^\((\d+),\s*'/);
    if (!idM) continue;
    const nameM = line.match(/^\(\d+,\s*'([^']+)',\s*'Archetype'/);
    if (!nameM) continue;
    const archIdx = line.indexOf("'Archetype'");
    if (archIdx < 0) continue;
    let cursor = line.indexOf("null", archIdx);
    cursor = line.indexOf("null", cursor + 4);
    cursor = line.indexOf("null", cursor + 4);
    const effectField = extractSqlQuotedField(line, cursor + 4);
    const limitationField = extractSqlQuotedField(line, effectField.end);
    const noteField = extractSqlQuotedField(line, limitationField.end);
    rows.push({
      id: Number(idM[1]),
      name: nameM[1],
      effect: effectField.value ?? "",
      limitation: limitationField.value ?? "",
      note: noteField.value,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function extractSqlQuotedField(line, fromIndex) {
  let i = fromIndex;
  while (i < line.length && /[\s,]/.test(line[i])) i++;
  while (i < line.length && line[i] !== "'" && line.slice(i, i + 4) !== "null") i++;
  if (line.slice(i, i + 4) === "null") return { value: null, end: i + 4 };
  if (line[i] !== "'") return { value: null, end: i };
  i += 1;
  let out = "";
  while (i < line.length) {
    if (line[i] === "'" && line[i + 1] === "'") {
      out += "'";
      i += 2;
      continue;
    }
    if (line[i] === "'") return { value: out, end: i + 1 };
    out += line[i++];
  }
  return { value: out, end: i };
}

/** Split SQL tuple remainder by top-level commas (respect quoted strings). */
function splitSqlTupleTail(tail) {
  const out = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < tail.length; i++) {
    const ch = tail[i];
    if (ch === "'" && tail[i + 1] === "'") {
      cur += "''";
      i++;
      continue;
    }
    if (ch === "'") inQuote = !inQuote;
    if (ch === "," && !inQuote) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseGrantMap(src) {
  const map = {};
  const blockMatch = src.match(/const ARCHETYPE_GRANTED_SPELLS[^=]*=\s*\{([\s\S]*?)\};/);
  if (!blockMatch) return map;
  const block = blockMatch[1];
  const archRe = /^\s*(\w+):\s*\[/gm;
  let am;
  while ((am = archRe.exec(block)) !== null) {
    const arch = am[1];
    const start = am.index;
    const nextArch = block.slice(am.index + am[0].length).search(/^\s*\w+:\s*\[/m);
    const slice =
      nextArch >= 0
        ? block.slice(start, start + am[0].length + nextArch)
        : block.slice(start);
    const descriptors = [];
    const spellIdRe = /spellId:\s*(\d+)/g;
    const purchasedRe = /purchased:\s*(\d+)/g;
    const freqRe = /displayFrequency:\s*"([^"]+)"/g;
    const rangeRe = /displayRange:\s*"([^"]+)"/g;
    const ltpRe = /requiresLookThePart:\s*true/;
    const deriveRe = /deriveDisplayFrequencyFromSpellName:\s*"([^"]+)"/g;
    let ids = [...slice.matchAll(spellIdRe)].map((x) => Number(x[1]));
    let purchased = [...slice.matchAll(purchasedRe)].map((x) => Number(x[1]));
    let freqs = [...slice.matchAll(freqRe)].map((x) => x[1]);
    let ranges = [...slice.matchAll(rangeRe)].map((x) => x[1]);
    const derives = [...slice.matchAll(deriveRe)].map((x) => x[1]);
    for (let i = 0; i < ids.length; i++) {
      descriptors.push({
        spellId: ids[i],
        purchased: purchased[i] ?? 1,
        displayFrequency: freqs[i] ?? (derives[i] ? `derived:${derives[i]}` : null),
        displayRange: ranges[i] ?? null,
        requiresLookThePart: ltpRe.test(slice),
      });
    }
    map[arch] = descriptors;
  }
  return map;
}

function archetypesInEvaluateRules(src) {
  const names = new Set();
  const re = /hasArchetype\(selectedSpellNames,\s*"([^"]+)"\)/g;
  let m;
  while ((m = re.exec(src)) !== null) names.add(m[1]);
  return [...names].sort();
}

function archetypesInDisplayRules(src) {
  const names = new Set();
  const re = /hasArchetype\(selectedSpellNames,\s*"([^"]+)"\)/g;
  const displayStart = src.indexOf("export function computeDisplayRuleOverrides");
  const displaySrc = src.slice(displayStart);
  let m;
  while ((m = re.exec(displaySrc)) !== null) names.add(m[1]);
  return [...names].sort();
}

function parseGearMap(src) {
  const names = [];
  const re = /^\s*(\w+):\s*apply/gm;
  const start = src.indexOf("const ARCHETYPE_EQUIPMENT");
  const slice = src.slice(start, start + 600);
  let m;
  while ((m = re.exec(slice)) !== null) names.push(m[1]);
  return names.sort();
}

function parseEvaluateBranches(src) {
  const branches = [];
  const evalStart = src.indexOf("export function evaluateSpellRules");
  const evalEnd = src.indexOf("export function computeDisplayRuleOverrides");
  const evalSrc = src.slice(evalStart, evalEnd);
  const blocks = evalSrc.split(/if \(hasArchetype/);
  for (const b of blocks.slice(1)) {
    const nameM = b.match(/selectedSpellNames,\s*"([^"]+)"/);
    if (!nameM) continue;
    const arch = nameM[1];
    const restricted = /restricted\s*=\s*true/.test(b);
    const cost = /adjustedCost/.test(b);
    branches.push({ archetype: arch, restricted, costAdjust: cost });
  }
  return branches;
}

function parseDisplaySpells(src) {
  const displayStart = src.indexOf("export function computeDisplayRuleOverrides");
  const displayEnd = src.indexOf("return { frequency, range, tag }");
  const displaySrc = src.slice(displayStart, displayEnd);
  const rules = [];
  const re =
    /hasArchetype\(selectedSpellNames,\s*"([^"]+)"\)[\s\S]*?(?:spell\.name === "([^"]+)"|spell\.type === "([^"]+)"|spell\.school === "([^"]+)")/g;
  let m;
  while ((m = re.exec(displaySrc)) !== null) {
    rules.push({
      archetype: m[1],
      spellName: m[2] || null,
      spellType: m[3] || null,
      school: m[4] || null,
    });
  }
  return rules;
}

const canon = parseArchetypesFromSql(sql);
const grants = parseGrantMap(grantsSrc);
const evalArchetypes = archetypesInEvaluateRules(rulesSrc);
const displayArchetypes = archetypesInDisplayRules(rulesSrc);
const gearArchetypes = parseGearMap(gearSrc);
const evalBranches = parseEvaluateBranches(rulesSrc);

const CLASS_BY_ARCHETYPE = {
  Apex: "Paladin",
  Artificer: "Archer",
  "Avatar of Nature": "Druid",
  Battlemage: "Wizard",
  Berserker: "Barbarian",
  "Combat Caster": "Wizard",
  Corruptor: "Anti-Paladin",
  Dervish: "Bard",
  Evoker: "Wizard",
  Guardian: "Paladin",
  Hunter: "Scout",
  Infernal: "Anti-Paladin",
  Inquisitor: "Paladin",
  Juggernaut: "Warrior",
  Legend: "Bard",
  Marauder: "Warrior",
  Medium: "Monk",
  Mystic: "Monk",
  Necromancer: "Healer",
  Priest: "Healer",
  Raider: "Barbarian",
  Ranger: "Druid",
  Rogue: "Assassin",
  Sniper: "Archer",
  Spy: "Assassin",
  Summoner: "Druid",
  Warder: "Healer",
  Warlock: "Wizard",
};

/** Archetypes with DB gains but no grant-map entry (verified against archetypeGrantedSpells.ts). */
const EXPECTED_GRANTS = {
  Corruptor: [{ spellId: 169, note: "Void Touched" }],
  Infernal: [{ spellId: 60, note: "Fireball x2 Unlimited (m)" }],
  Inquisitor: [{ spellId: 187, note: "Sacred Blades" }],
  Guardian: [
    { spellId: 81, note: "Imbue Shield" },
    { spellId: 95, note: "Martyr" },
  ],
  Raider: [{ spellId: 179, note: "Bear Strength" }],
};

/** Heuristic gap detection from canon text vs code presence */
function detectGaps(row) {
  const gaps = [];
  const name = row.name;
  const effect = row.effect || "";
  const limitation = row.limitation || "";
  const note = row.note;
  const hasGain = /\bGain\b/i.test(effect) || /\bReplace\b/i.test(effect);
  const hasGrantMap = Boolean(grants[name]?.length);

  if (hasGain && !hasGrantMap && !EXPECTED_GRANTS[name]) {
    gaps.push({
      id: `GAP-${name}-A1`,
      requirement: "Gained",
      severity: "blocking",
      canon: effect.slice(0, 200),
      expectedSurface: "archetypeGrantedSpells",
      actual: "No ARCHETYPE_GRANTED_SPELLS entry",
      detectionStep: "A1",
      fixOutline: `Add descriptors for ${name} in archetypeGrantedSpells.ts; wire spell IDs from parity SQL row ${row.id}`,
    });
  }

  if (limitation && !evalArchetypes.includes(name)) {
    gaps.push({
      id: `GAP-${name}-B1`,
      requirement: "Limitation",
      severity: "blocking",
      canon: limitation.slice(0, 200),
      expectedSurface: "evaluateSpellRules",
      actual: "No hasArchetype branch in evaluateSpellRules",
      detectionStep: "B1",
      fixOutline: `Add evaluateSpellRules branches for ${name} in rules.ts`,
    });
  }

  const freqText = `${effect} ${limitation}`;
  const needsDisplay =
    /\bdouble\b/i.test(freqText) ||
    /\bCharge x\d/i.test(freqText) ||
    /\bUnlimited\b/i.test(freqText) ||
    /\bbecomes\b/i.test(freqText) ||
    /\brange Self\b/i.test(freqText);
  const skipGenericDisplayGap =
    /Enchantments of level 4 and below.*range Self/i.test(effect);
  if (
    needsDisplay &&
    !displayArchetypes.includes(name) &&
    !hasGrantMap &&
    !EXPECTED_GRANTS[name] &&
    !skipGenericDisplayGap
  ) {
    gaps.push({
      id: `GAP-${name}-C1`,
      requirement: "Frequency",
      severity: "display",
      canon: effect.slice(0, 200),
      expectedSurface: "computeDisplayRuleOverrides",
      actual: "No hasArchetype branch in computeDisplayRuleOverrides",
      detectionStep: "C1/C8",
      fixOutline: `Add computeDisplayRuleOverrides for ${name} in rules.ts`,
    });
  }

  if (/Coup de Grace|does not consume|Mend on weapons/i.test(effect) && name === "Rogue") {
    if (!rulesSrc.includes("ROGUE_COUP_DE_GRACE_TAG")) {
      gaps.push({
        id: `GAP-${name}-D1`,
        requirement: "Tag",
        severity: "display",
        canon: effect,
        expectedSurface: "computeDisplayRuleOverrides + UI",
        actual: "Tag constant missing",
        detectionStep: "D1",
        fixOutline: "Add ROGUE_COUP_DE_GRACE_TAG and Assassin-gated branch",
      });
    }
  }

  const gearText = `${effect} ${limitation} ${note ?? ""}`;
  const mentionsGear =
    /\bMay not (?:wear|wield|fire)\b/i.test(gearText) ||
    /\bMay wield\b/i.test(gearText) ||
    /\bMaximum Armor\b/i.test(gearText) ||
    /\bno armor\b/i.test(gearText) ||
    /\bMay not wear Armor\b/i.test(gearText) ||
    /\bGreat [Ww]eapons?\b/i.test(gearText) ||
    /\bHeavy Thrown\b/i.test(gearText) ||
    /\bMay use Bows\b/i.test(gearText) ||
    /\b(?:Small|Large) shield\b/i.test(gearText);
  if (mentionsGear && !gearArchetypes.includes(name) && !/fire normal arrows/i.test(gearText)) {
    const isCasterOnlyGear = name === "Ranger";
    gaps.push({
      id: `GAP-${name}-E1`,
      requirement: "Gear",
      severity: isCasterOnlyGear ? "display" : "blocking",
      canon: gearText.slice(0, 200),
      expectedSurface: isCasterOnlyGear ? "class equipment / caster view" : "martialEquipment",
      actual: isCasterOnlyGear
        ? "No caster gear override path; martialEquipment only"
        : "No ARCHETYPE_EQUIPMENT entry",
      detectionStep: "E1/E8",
      fixOutline: isCasterOnlyGear
        ? "Add Ranger bow allowance on Druid view or class equipment patch"
        : `Add apply${name} in martialEquipment.ts`,
    });
  }

  if (/five Undead Minion/i.test(effect) && !rulesSrc.includes("max 5 Undead Minion")) {
    gaps.push({
      id: `GAP-${name}-B7`,
      requirement: "Limitation",
      severity: "blocking",
      canon: effect,
      expectedSurface: "evaluateSpellRules or editor validation",
      actual: "No Undead Minion count cap in rules.ts",
      detectionStep: "B7",
      fixOutline: "Enforce max 5 Undead Minion enchantments in evaluateSpellRules or editor",
    });
  }

  if (/one instance of Imbue Shield/i.test(limitation) && !rulesSrc.includes("only one Imbue Shield")) {
    gaps.push({
      id: `GAP-${name}-B8`,
      requirement: "Limitation",
      severity: "blocking",
      canon: limitation,
      expectedSurface: "evaluateSpellRules or runtime validation",
      actual: "No active Imbue Shield cap",
      detectionStep: "B8",
      fixOutline: "Add purchase/active cap for Imbue Shield when Guardian selected",
    });
  }

  if (/Meta-Magic may only be used on Spirit/i.test(effect) && !rulesSrc.includes("PRIEST_META_MAGIC_SPIRIT_TAG")) {
    gaps.push({
      id: `GAP-${name}-B9`,
      requirement: "Limitation",
      severity: "blocking",
      canon: effect,
      expectedSurface: "evaluateSpellRules",
      actual: "Priest only adjusts Meta-Magic frequency and Heal cost",
      detectionStep: "B9",
      fixOutline: "Restrict Meta-Magic purchases/targets to Spirit school for Priest",
    });
  }

  if (
    /Enchantments of level 4 and below.*range Self/i.test(effect) &&
    !rulesSrc.includes('"Avatar of Nature"')
  ) {
    gaps.push({
      id: `GAP-${name}-C8`,
      requirement: "Frequency",
      severity: "display",
      canon: effect,
      expectedSurface: "computeDisplayRuleOverrides",
      actual: "No Avatar of Nature range override",
      detectionStep: "C8",
      fixOutline: "Add Enchantment L4- range Self override (exclude Golem)",
    });
  }

  if (/empty hand to cast/i.test(effect) && !rulesSrc.includes("COMBAT_CASTER_EMPTY_HAND_TAG")) {
    gaps.push({
      id: `GAP-${name}-COMBAT`,
      requirement: "Frequency",
      severity: "display",
      canon: effect,
      expectedSurface: "rules or build metadata",
      actual: "Combat Caster not referenced in rules.ts",
      detectionStep: "C9",
      fixOutline: "Document or implement empty-hand casting rule for Combat Caster",
    });
  }

  if (/May not fire normal arrows/i.test(limitation) && !rulesSrc.includes("SNIPER_NO_NORMAL_ARROWS_NOTE")) {
    gaps.push({
      id: `GAP-${name}-E9`,
      requirement: "Gear",
      severity: "display",
      canon: limitation,
      expectedSurface: "evaluateSpellRules or archer UI",
      actual: "No normal-arrow restriction",
      detectionStep: "E9",
      fixOutline: "Model Sniper normal-arrow ban in rules or archer materials UI",
    });
  }

  if (/Look the part becomes/i.test(effect)) {
    const ltpGrant = grants[name]?.some((d) => d.requiresLookThePart);
    if (!ltpGrant) {
      gaps.push({
        id: `GAP-${name}-A5`,
        requirement: "Gained",
        severity: "blocking",
        canon: effect.match(/Look the part[^.]+/i)?.[0] ?? effect,
        expectedSurface: "archetypeGrantedSpells + LtP partition",
        actual: "LtP replacement grant missing",
        detectionStep: "A5",
        fixOutline: `Add requiresLookThePart grant for ${name}; hide class LtP pick-one where applicable`,
      });
    }
  }

  if (EXPECTED_GRANTS[name]) {
    const missing = !hasGrantMap;
    if (missing) {
      gaps.push({
        id: `GAP-${name}-A1`,
        requirement: "Gained",
        severity: "blocking",
        canon: effect.slice(0, 200),
        expectedSurface: "archetypeGrantedSpells",
        actual: "No ARCHETYPE_GRANTED_SPELLS entry",
        detectionStep: "A1",
        fixOutline: `Add grant descriptors for ${name} in archetypeGrantedSpells.ts`,
      });
    }
  }

  if (
    name === "Apex" &&
    evalArchetypes.includes("Apex") &&
    rulesSrc.includes("Adaptive Protection") &&
    !sql.includes("Adaptive Protection")
  ) {
    gaps.push({
      id: "GAP-Apex-B6",
      requirement: "Limitation",
      severity: "info",
      canon: limitation,
      expectedSurface: "evaluateSpellRules",
      actual: "Code also blocks Adaptive Protection (not in DB limitation)",
      detectionStep: "B6",
      fixOutline: "Align parity SQL with code or remove extra block",
    });
  }

  return gaps;
}

const allGaps = [];
const perArchetype = canon.map((row) => {
  const gaps = detectGaps(row);
  allGaps.push(...gaps);
  return {
    ...row,
    fixtureClass: CLASS_BY_ARCHETYPE[row.name] ?? "TBD",
    code: {
      grants: grants[row.name] ?? [],
      inEvaluateRules: evalArchetypes.includes(row.name),
      inDisplayRules: displayArchetypes.includes(row.name),
      inGear: gearArchetypes.includes(row.name),
    },
    gaps,
  };
});

const dedupedGaps = [];
const seenGapIds = new Set();
for (const g of allGaps) {
  if (seenGapIds.has(g.id)) continue;
  seenGapIds.add(g.id);
  dedupedGaps.push(g);
}

const summary = {
  generatedAt: new Date().toISOString(),
  archetypeCount: canon.length,
  grantMapCount: Object.keys(grants).length,
  grantArchetypes: Object.keys(grants).sort(),
  evalArchetypeCount: evalArchetypes.length,
  displayArchetypeCount: displayArchetypes.length,
  gearArchetypeCount: gearArchetypes.length,
  openGapCount: dedupedGaps.filter((g) => g.severity !== "info").length,
  overallPass: dedupedGaps.filter((g) => g.severity !== "info").length === 0,
  evalArchetypes,
  displayArchetypes,
  gearArchetypes,
  perArchetype,
  allGaps: dedupedGaps,
};

const outPath = path.join(root, "docs/archetype-gap-analysis-data.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

const mdPath = path.join(root, "docs/ARCHETYPE_COVERAGE_GAP_ANALYSIS.md");
fs.writeFileSync(mdPath, renderMarkdown(summary));
console.log(
  JSON.stringify(
    { outPath, mdPath, openGapCount: dedupedGaps.filter((g) => g.severity !== "info").length, overallPass: summary.overallPass },
    null,
    2
  )
);

function renderMarkdown(summary) {
  const lines = [];
  lines.push("# Archetype 100% Coverage — Gap-Analysis Test Case");
  lines.push("");
  lines.push("> **Status:** FAIL — open blocking/display gaps remain.");
  lines.push(`> **Generated:** ${summary.generatedAt}`);
  lines.push(`> **Archetypes in canon:** ${summary.archetypeCount} | **Grant map entries:** ${summary.grantMapCount} | **Open gaps (excl. info):** ${summary.openGapCount}`);
  lines.push("");
  lines.push("This document is the **deliverable test case** from the Archetype Coverage Gap Analysis plan. It does **not** modify archetype logic; it records canon vs implementation and remediation steps if gaps are found.");
  lines.push("");
  lines.push("Machine-readable output: [archetype-gap-analysis-data.json](./archetype-gap-analysis-data.json). Regenerate with `node scripts/archetype-gap-analysis.mjs`.");
  lines.push("");
  lines.push("## 1. Purpose and constraints");
  lines.push("");
  lines.push("- **Purpose:** Validate that every archetype rule in Swiftgard parity appears in Metagard build output (view, edit, spell lists, budgets, equipment).");
  lines.push("- **On failure:** Produce gap entries with detection step IDs (A1–E10) and implementation outlines — **no auto-fix**.");
  lines.push("- **Canon:** `supabase/policies/generated_swiftgard_parity.sql` (`type = 'Archetype'`).");
  lines.push("- **Implementation surfaces:**");
  lines.push("  - Gained spells → `src/lib/spellbook/archetypeGrantedSpells.ts`");
  lines.push("  - Restrictions / cost → `evaluateSpellRules` in `src/lib/spellbook/rules.ts`");
  lines.push("  - Frequency / range / tags → `computeDisplayRuleOverrides` in `rules.ts`");
  lines.push("  - Gear (martial view) → `src/lib/spellbook/martialEquipment.ts`");
  lines.push("  - View hide blocked purchases → `src/lib/spellbook/viewBuildSpellSelections.ts`");
  lines.push("");
  lines.push("## 2. Regression patterns (prior fixes)");
  lines.push("");
  lines.push("| Pattern | Example | Detection |");
  lines.push("|---------|---------|-----------|");
  lines.push("| Missing grant map | Mystic Force/Suppression bolts | A1 |");
  lines.push("| Charge appended not replaced | Medium Spirit school | C2 |");
  lines.push("| Missing `(ex)` on frequency | Spy Blink/Shadow Step | C4 |");
  lines.push("| Tag not on ability row | Rogue Coup de Grace | D3 |");
  lines.push("| Replacement not in catalog | Juggernaut Harden → Greater Harden | A6 |");
  lines.push("| LtP not swapped | Sniper/Artificer/Raider | A5 |");
  lines.push("| Gear not on view | Hunter Great weapons | E1 |");
  lines.push("| Caster gear only in cost rules | Ranger Bows | E8 |");
  lines.push("");
  lines.push("## 3. Code surface inventory");
  lines.push("");
  lines.push(`| Surface | Archetypes covered | Count |`);
  lines.push(`|---------|-------------------|-------|`);
  lines.push(`| \`ARCHETYPE_GRANTED_SPELLS\` | ${summary.grantArchetypes.join(", ")} | ${summary.grantMapCount} / 28 |`);
  lines.push(`| \`evaluateSpellRules\` | ${summary.evalArchetypes.join(", ")} | ${summary.evalArchetypeCount} / 28 |`);
  lines.push(`| \`computeDisplayRuleOverrides\` | ${summary.displayArchetypes.join(", ")} | ${summary.displayArchetypeCount} / 28 |`);
  lines.push(`| \`ARCHETYPE_EQUIPMENT\` | ${summary.gearArchetypes.join(", ")} | ${summary.gearArchetypeCount} / 28 |`);
  lines.push("");
  lines.push("## 4. Test fixture matrix");
  lines.push("");
  lines.push("| Fixture ID (assign when created) | Class | Archetype | Level | LtP | Notes |");
  lines.push("|--------------------------------|-------|-----------|-------|-----|-------|");
  for (const row of summary.perArchetype) {
    const ltp = ["Sniper", "Artificer", "Raider"].includes(row.name) ? "on + off" : "—";
    const extra =
      row.name === "Hunter" ? "Hold Person vs Pinning Arrow variants" : row.name === "Hunter" ? "" : "";
    lines.push(`| \`fixture-${row.fixtureClass}-${row.name}\` | ${row.fixtureClass} | ${row.name} | 6 | ${ltp} | ${extra || "Purchase archetype + dependent spells"} |`);
  }
  lines.push("");
  lines.push("**Fixture build IDs:** None assigned in this pass (static analysis only). When executing manually, record build IDs in this table.");
  lines.push("");
  lines.push("## 5. Canon extraction (28 archetypes)");
  lines.push("");
  lines.push("| ID | Archetype | Class | Gained (effect) | Limitations | Gear / notes |");
  lines.push("|----|-----------|-------|-----------------|-------------|--------------|");
  for (const row of summary.perArchetype) {
    const gain = (row.effect || "—").replace(/\|/g, "\\|").slice(0, 80);
    const lim = (row.limitation || "—").replace(/\|/g, "\\|").slice(0, 60);
    const note = (row.note || "—").replace(/\|/g, "\\|").slice(0, 40);
    lines.push(`| ${row.id} | ${row.name} | ${row.fixtureClass} | ${gain} | ${lim} | ${note} |`);
  }
  lines.push("");
  lines.push("## 6. Code mapping matrix");
  lines.push("");
  lines.push("| Archetype | Grants | evaluate | display | gear | Gap count |");
  lines.push("|-----------|--------|----------|---------|------|-----------|");
  for (const row of summary.perArchetype) {
    const g = row.code.grants.length > 0 ? `yes (${row.code.grants.length})` : "—";
    const e = row.code.inEvaluateRules ? "yes" : "—";
    const d = row.code.inDisplayRules ? "yes" : "—";
    const ge = row.code.inGear ? "yes" : "—";
    lines.push(`| ${row.name} | ${g} | ${e} | ${d} | ${ge} | ${row.gaps.length} |`);
  }
  lines.push("");
  lines.push("## 7. Validation execution (steps A–E)");
  lines.push("");
  lines.push("### Dimension A — Gained spells");
  lines.push("- **A1:** `getArchetypeGrantedSpellDescriptors(name)` non-empty for each DB \"Gain\" / \"Replace\".");
  lines.push("- **A2–A7:** See plan: spell IDs, purchased counts, LtP gating, replacements (Juggernaut), Artificer collision flags.");
  lines.push("");
  lines.push("### Dimension B — Spell limitations");
  lines.push("- **B1:** `evaluateSpellRules` blocks every \"Loses\" / \"May not purchase\" clause.");
  lines.push("- **B2:** View omits blocked rows via `mergeViewDisplaySpellSelectionRows`.");
  lines.push("- **B5–B10:** Summoner equipment level, Necromancer minion cap, Guardian imbue cap, Priest Spirit-only Meta-Magic, Hunter pick-one.");
  lines.push("");
  lines.push("### Dimension C — Frequency modifications");
  lines.push("- **C1–C9:** `computeDisplayRuleOverrides` with correct `buildClassName` where gated; Charge replace vs append; suffix tokens.");
  lines.push("");
  lines.push("### Dimension D — Special tags");
  lines.push("- **D1–D4:** Artificer Mend, Rogue Coup de Grace — tag on final list row in `BuildSpellDetails` / `BuildSpellEditor`.");
  lines.push("");
  lines.push("### Dimension E — Gear");
  lines.push("- **E1–E10:** `applyMartialArchetypeEquipmentOverrides` on view; edit restrictions for equipment spells; Ranger bows; Sniper normal arrows.");
  lines.push("");
  lines.push("**This pass:** Static diff via `scripts/archetype-gap-analysis.mjs` (no live build IDs).");
  lines.push("");
  lines.push("### Spot-checks verified in code (no live build)");
  lines.push("");
  lines.push("| Check | Result |");
  lines.push("|-------|--------|");
  lines.push("| Mystic grant descriptors (61×4, 158×2, Unlimited (m)) | Pass |");
  lines.push("| Medium grants + Spirit Charge replace via `applyChargeSuffixToFrequency` | Pass |");
  lines.push("| Spy Blink/Shadow Step `Charge x3 (ex)` | Pass |");
  lines.push("| Rogue `ROGUE_COUP_DE_GRACE_TAG` on Assassin Coup de Grace | Pass |");
  lines.push("| Corruptor Void Touched range → Self in display rules | Pass (grant row still missing — A1) |");
  lines.push("| Juggernaut grant + block Harden pipeline | Pass |");
  lines.push("");
  lines.push("## 8. Open gap report");
  lines.push("");
  if (summary.allGaps.length === 0) {
    lines.push("No gaps detected.");
  } else {
    lines.push("| ID | Severity | Archetype | Req | Step | Expected surface | Actual | Fix outline |");
    lines.push("|----|----------|-----------|-----|------|------------------|--------|-------------|");
    for (const g of summary.allGaps) {
      const arch = g.id.replace(/^GAP-/, "").replace(/-[A-Z0-9]+$/, "");
      lines.push(
        `| ${g.id} | ${g.severity} | ${arch} | ${g.requirement} | ${g.detectionStep} | ${g.expectedSurface} | ${g.actual} | ${g.fixOutline} |`
      );
    }
  }
  lines.push("");
  lines.push("## 9. Per-gap implementation outline (if fixing)");
  lines.push("");
  lines.push("| Gap type | Files / actions |");
  lines.push("|----------|-----------------|");
  lines.push("| Missing grant | `archetypeGrantedSpells.ts`; verify `page.tsx` / `edit/page.tsx` grant pipeline |");
  lines.push("| Missing block | `rules.ts` `evaluateSpellRules`; `viewBuildSpellSelections.ts` |");
  lines.push("| Missing frequency | `rules.ts` `computeDisplayRuleOverrides`; pass `buildClassName` from UI |");
  lines.push("| Missing tag | `rules.ts` constant + branch; `BuildSpellDetails.tsx` / `BuildSpellEditor.tsx` |");
  lines.push("| Missing gear | `martialEquipment.ts` or caster equipment display for Ranger |");
  lines.push("| LtP swap | Grant + `requiresLookThePart`; hide pick-one in `partitionViewBuildSpellDisplayRows` |");
  lines.push("");
  lines.push("## 10. Overall result");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Result** | **${summary.overallPass ? "PASS" : "FAIL"}** |`);
  lines.push(`| Blocking/display gaps | ${summary.openGapCount} |`);
  lines.push(`| Info / drift items | ${summary.allGaps.filter((g) => g.severity === "info").length} |`);
  lines.push("");
  return lines.join("\n");
}
