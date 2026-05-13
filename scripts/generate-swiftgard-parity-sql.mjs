/**
 * Generates SQL to align Supabase with https://github.com/Hopper2021/amtgard-sappy-spellbook
 * (same ruleset as https://swiftgard.com/) from src/appConstants.js on the given branch.
 *
 * Usage (writes a file by default — works on Windows without shell redirects):
 *   node scripts/generate-swiftgard-parity-sql.mjs
 *   node scripts/generate-swiftgard-parity-sql.mjs --out supabase/policies/generated_swiftgard_parity.sql
 * Pipe to stdout only:
 *   node scripts/generate-swiftgard-parity-sql.mjs --stdout-only > my.sql
 *
 * Review the output, then run it in the Supabase SQL editor (or psql).
 *
 * Ambiguities / safe defaults are printed as SQL comments at the top of the output.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_OUT = join(ROOT, "supabase", "policies", "generated_swiftgard_parity.sql");
const CACHE_DIR = join(__dirname, ".cache");
const DEFAULT_URL =
  "https://raw.githubusercontent.com/Hopper2021/amtgard-sappy-spellbook/main/src/appConstants.js";

function qIdent(s) {
  return `"${String(s).replace(/"/g, '""')}"`;
}

function qStr(s) {
  if (s === null || s === undefined) return "null";
  return `'${String(s).replace(/'/g, "''")}'`;
}

function qJsonb(obj) {
  if (obj === null || obj === undefined) return "null";
  const raw = JSON.stringify(obj);
  return `'${raw.replace(/'/g, "''")}'::jsonb`;
}

function pushCasterRules(className, book, out) {
  if (!book?.levels) return;
  for (const tier of book.levels) {
    const L = tier.level;
    for (const s of tier.spells ?? []) {
      out.push({
        class_name: className,
        spell_id: s.id,
        spell_level: L,
        cost: s.cost != null ? s.cost : 0,
        max_count: s.max ?? null,
        frequency: s.frequency ?? null,
        restricted: Boolean(s.restricted),
        source_type: "level_spell",
        option_group: null,
        is_look_the_part: false,
      });
    }
  }
}

const MARTIAL_KEY_TO_SOURCE = {
  base: "base",
  pickTwoOfThree: "pick_two_of_three",
  pickOne: "pick_one",
  optionalPickOne: "optional_pick_one",
};

function pushRuleRow(out, className, spellLevel, entry, sourceType, optionGroup, isLtp) {
  if (!entry || typeof entry.id !== "number") return;
  out.push({
    class_name: className,
    spell_id: entry.id,
    spell_level: spellLevel,
    cost: entry.cost != null ? entry.cost : 0,
    max_count: entry.max ?? entry.max_count ?? null,
    frequency: entry.frequency ?? null,
    restricted: Boolean(entry.restricted),
    source_type: sourceType,
    option_group: optionGroup,
    is_look_the_part: isLtp,
  });
}

function emitMartialArray(className, spellLevel, sourceType, optionGroup, isLtp, items, out) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item && typeof item.id === "number" && Array.isArray(item.pickOne)) {
      // Parent row (e.g. Hunter archetype) must exist in class_spell_rules so the catalog
      // and nested option_group "80:pickOne" can resolve to a selected catalog_rule id.
      pushRuleRow(out, className, spellLevel, item, sourceType, optionGroup, isLtp);
      for (const child of item.pickOne) {
        pushRuleRow(
          out,
          className,
          spellLevel,
          child,
          "optional_pick_one_nested_pickOne",
          `${item.id}:pickOne`,
          isLtp
        );
      }
      continue;
    }
    pushRuleRow(out, className, spellLevel, item, sourceType, optionGroup, isLtp);
  }
}

function flattenMartialList(className, list, out) {
  for (const s of list.lookThePartSpells ?? []) {
    pushRuleRow(out, className, 1, s, "look_the_part", null, true);
  }
  for (const tier of list.levels ?? []) {
    const L = tier.level;
    for (const block of tier.spells ?? []) {
      for (const [key, arr] of Object.entries(block)) {
        const st = MARTIAL_KEY_TO_SOURCE[key];
        if (!st) continue;
        emitMartialArray(className, L, st, null, false, arr, out);
      }
    }
  }
}

/** UTF-8 smart quotes mis-decoded as Greek/currency (e.g. "Song of X" incants in upstream data). */
function normalizeCorruptedCurlyQuotes(s) {
  if (s == null || s === undefined) return s;
  return String(s).replace(/ΓÇ£/g, '"').replace(/ΓÇ¥/g, '"');
}

function spellInsertValues(spell) {
  const fix = normalizeCorruptedCurlyQuotes;
  return `(${spell.id}, ${qStr(spell.name)}, ${qStr(spell.type)}, ${qStr(spell.school)}, ${qStr(
    spell.range
  )}, ${qStr(fix(spell.materials))}, ${qStr(fix(spell.incantation))}, ${qStr(fix(spell.effect))}, ${qStr(
    fix(spell.limitation)
  )}, ${qStr(fix(spell.note))})`;
}

function parseArgs(argv) {
  let url = DEFAULT_URL;
  let outPath = DEFAULT_OUT;
  let stdoutOnly = false;
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--out" && argv[i + 1]) {
      const p = argv[i + 1];
      outPath = isAbsolute(p) ? p : join(ROOT, p);
      i += 1;
    } else if (a === "--stdout-only") {
      stdoutOnly = true;
    } else if (a.startsWith("http://") || a.startsWith("https://")) {
      url = a;
    }
  }
  return { url, outPath, stdoutOnly };
}

async function main() {
  const { url, outPath, stdoutOnly } = parseArgs(process.argv);
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, "appConstants.mjs");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  const text = await res.text();
  await writeFile(cachePath, text, "utf8");

  const mod = await import(`${pathToFileURL(cachePath).href}?t=${Date.now()}`);

  const lines = [];
  lines.push(`-- Generated by scripts/generate-swiftgard-parity-sql.mjs`);
  lines.push(`-- Source: ${url}`);
  lines.push(`-- Timestamp (UTC): ${new Date().toISOString()}`);
  lines.push(`begin;`);
  lines.push(``);
  lines.push(
    `-- AMBIGUITY: Subclass / archetype bonus lists (e.g. INFERNAL_SPELLS, SILVER_TONGUE_SWIFT) are not`,
    `-- flattened here. Swiftgard applies some of those client-side when a subclass is active.`,
    `-- To model them in Supabase, add rows to class_spell_rules with a dedicated source_type and teach`,
    `-- the app to surface them when the user selects the matching archetype.`
  );
  lines.push(``);
  lines.push(
    `-- SPELLS: Upsert canonical spell text. Adjust column list if your public.spells table differs.`
  );
  lines.push(
    `insert into public.spells (id, name, type, school, range, materials, incantation, effect, limitation, note)`
  );
  lines.push(`values`);
  lines.push(mod.ALL_SPELLS.map(spellInsertValues).join(",\n"));
  lines.push(`on conflict (id) do update set`);
  lines.push(
    `  name = excluded.name, type = excluded.type, school = excluded.school, range = excluded.range,`,
    `  materials = excluded.materials, incantation = excluded.incantation, effect = excluded.effect,`,
    `  limitation = excluded.limitation, note = excluded.note;`
  );
  lines.push(``);
  lines.push(
    `-- CLASSES: Idempotent without needing a unique constraint on name.`,
    `-- If your table uses different column names, adjust this block.`
  );
  for (const n of mod.ALL_CLASSES) {
    lines.push(
      `insert into public.classes (name) select ${qStr(n)} where not exists (select 1 from public.classes c where c.name = ${qStr(
        n
      )});`
    );
  }
  lines.push(``);
  lines.push(
    `-- CLASS SPELL RULES: Full replace. WARNING: deletes all rows in public.class_spell_rules.`,
    `-- Safe if this table is only used as Swiftgard-derived catalog (no custom FKs from other tables).`
  );
  lines.push(`delete from public.class_spell_rules;`);
  lines.push(``);

  const rules = [];
  pushCasterRules("Bard", mod.BARD_SPELLS, rules);
  pushCasterRules("Healer", mod.HEALER_SPELLS, rules);
  pushCasterRules("Wizard", mod.WIZARD_SPELLS, rules);
  pushCasterRules("Druid", mod.DRUID_SPELLS, rules);

  for (const [className, list] of Object.entries(mod.MARTIAL_CLASS_SPELL_LISTS)) {
    flattenMartialList(className, list, rules);
  }

  lines.push(
    `insert into public.class_spell_rules (class_name, spell_id, spell_level, cost, max_count, frequency, restricted, source_type, option_group, is_look_the_part)`
  );
  lines.push(`values`);
  lines.push(
    rules
      .map(
        (r) =>
          `  (${qStr(r.class_name)}, ${r.spell_id}, ${r.spell_level}, ${r.cost}, ${
            r.max_count == null ? "null" : r.max_count
          }, ${qJsonb(r.frequency)}, ${r.restricted}, ${qStr(r.source_type)}, ${
            r.option_group == null ? "null" : qStr(r.option_group)
          }, ${r.is_look_the_part})`
      )
      .join(",\n")
  );
  lines.push(`;`);
  lines.push(``);
  lines.push(`commit;`);

  const body = `${lines.join("\n")}\n`;
  if (stdoutOnly) {
    process.stdout.write(body);
  } else {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, body, "utf8");
    console.error(`Wrote ${outPath} (${body.length} bytes)`);
  }

  // Sanity: counts should match upstream expectations roughly
  const errPath = join(CACHE_DIR, "parity-meta.txt");
  await writeFile(
    errPath,
    `spells=${mod.ALL_SPELLS.length}\nclasses=${mod.ALL_CLASSES.length}\nrules=${rules.length}\n`,
    "utf8"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
