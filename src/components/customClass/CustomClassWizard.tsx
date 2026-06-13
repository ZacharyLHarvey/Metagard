"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import CasterAbilityEditor from "@/components/customClass/CasterAbilityEditor";
import MartialAbilityEditor from "@/components/customClass/MartialAbilityEditor";
import { isLookThePartRule } from "@/lib/customClass/types";
import MartialChoiceGroupsEditor from "@/components/customClass/MartialChoiceGroupsEditor";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import type {
  CustomClassRow,
  CustomClassSpellRuleRow,
  CustomClassType,
  CustomClassWizardPayload,
  WizardRuleDraft,
} from "@/lib/customClass/types";
import { validateCustomClassPayload, validateWizardTab } from "@/lib/customClass/validation";

type Props = {
  mode: "create" | "edit";
  classId?: number;
  initial?: CustomClassRow;
  initialRules?: CustomClassSpellRuleRow[];
};

function newClientKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rulesToDrafts(rules: CustomClassSpellRuleRow[]): WizardRuleDraft[] {
  return rules.map((r) => ({
    ...r,
    clientKey: newClientKey(),
  }));
}

function draftsToPayloadRules(rules: WizardRuleDraft[]): CustomClassSpellRuleRow[] {
  return rules
    .filter((r) => r.spell_id > 0)
    .map(({ clientKey: _ck, spell_name: _sn, id: _id, custom_class_id: _cc, ...rest }) => rest);
}

const MARTIAL_STEPS = ["Basics", "Equipment", "Abilities", "Choice Groups", "Review"];
const CASTER_STEPS = ["Basics", "Equipment", "Spells", "Review"];

export default function CustomClassWizard({ mode, classId, initial, initialRules = [] }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [classType, setClassType] = useState<CustomClassType>(initial?.class_type ?? "martial");
  const [armor, setArmor] = useState(initial?.armor ?? "");
  const [shields, setShields] = useState(initial?.shields ?? "");
  const [weapons, setWeapons] = useState(
    initial?.weapons ?? (initial?.class_type === "caster" ? "Dagger, Magic Staff" : "")
  );
  const [rules, setRules] = useState<WizardRuleDraft[]>(() => rulesToDrafts(initialRules));
  const [lookThePartIncluded, setLookThePartIncluded] = useState(() =>
    initialRules.some((r) => r.source_type === "look_the_part" || r.is_look_the_part)
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(0);

  const steps = classType === "martial" ? MARTIAL_STEPS : CASTER_STEPS;
  const reviewStep = steps.length - 1;

  const tabValidation = useMemo(
    () =>
      validateWizardTab(step, {
        name,
        classType,
        rules: draftsToPayloadRules(rules),
        lookThePartIncluded,
      }),
    [step, name, classType, rules, lookThePartIncluded]
  );

  function handleClassTypeChange(next: CustomClassType) {
    if (next === classType) return;
    if (rules.length > 0) {
      const ok = window.confirm(
        "Changing class type will clear all abilities/spells. Continue?"
      );
      if (!ok) return;
      setRules([]);
      setLookThePartIncluded(false);
    }
    setClassType(next);
    if (next === "caster" && !weapons.trim()) {
      setWeapons("Dagger, Magic Staff");
    }
    if (step > 0) setStep(0);
    setMaxStepReached(0);
  }

  function goToStep(index: number) {
    if (index <= maxStepReached || index <= step) {
      setStep(index);
      setError("");
    }
  }

  function continueNext() {
    const validation = validateWizardTab(step, {
      name,
      classType,
      rules: draftsToPayloadRules(rules),
      lookThePartIncluded,
    });
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setError("");
    const next = Math.min(step + 1, reviewStep);
    setStep(next);
    setMaxStepReached((m) => Math.max(m, next));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    const payload: CustomClassWizardPayload = {
      name: name.trim(),
      description: description.trim() || null,
      class_type: classType,
      armor: armor.trim() || null,
      shields: shields.trim() || null,
      weapons: weapons.trim() || null,
      rules: draftsToPayloadRules(rules),
    };
    const validation = validateCustomClassPayload(payload);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setBusy(true);
    setError("");
    const res =
      mode === "create"
        ? await fetch("/api/custom-classes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/custom-classes/${classId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
    setBusy(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to save");
      return;
    }

    if (mode === "create") {
      const data = (await res.json()) as { id?: number };
      router.push(data.id ? `/custom-classes/${data.id}` : "/custom-classes");
    } else {
      router.push(`/custom-classes/${classId}`);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-neutral-800 pb-4">
        {steps.map((label, index) => {
          const clickable = index <= maxStepReached || index <= step;
          const active = index === step;
          return (
            <button
              key={label}
              type="button"
              disabled={!clickable}
              onClick={() => goToStep(index)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                active
                  ? "border-blue-500 bg-blue-600/20 text-blue-300"
                  : clickable
                    ? "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                    : "border-neutral-800 text-neutral-600 cursor-not-allowed"
              }`}
            >
              {index + 1}. {label}
            </button>
          );
        })}
      </nav>

      {step === 0 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Name</label>
            <input
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded min-h-28"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <p className="block text-sm text-neutral-400 mb-2">Class type</p>
            <SegmentedToggle
              name="Class type"
              value={classType}
              options={[
                { value: "martial", label: "Martial" },
                { value: "caster", label: "Caster" },
              ]}
              onChange={handleClassTypeChange}
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Armor</label>
            <input
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
              value={armor}
              onChange={(e) => setArmor(e.target.value)}
              placeholder={classType === "martial" ? "e.g. 4pts" : "Optional for casters"}
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Shields</label>
            <input
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
              value={shields}
              onChange={(e) => setShields(e.target.value)}
              placeholder={classType === "martial" ? "e.g. Large, Medium, Small, None" : ""}
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Weapons</label>
            <input
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
              value={weapons}
              onChange={(e) => setWeapons(e.target.value)}
              placeholder={
                classType === "caster" ? "Dagger, Magic Staff" : "e.g. All Melee, Javelins"
              }
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        classType === "martial" ? (
          <MartialAbilityEditor
            rules={rules}
            onChange={setRules}
            lookThePartIncluded={lookThePartIncluded}
            onLookThePartIncludedChange={setLookThePartIncluded}
          />
        ) : (
          <CasterAbilityEditor rules={rules} onChange={setRules} />
        )
      ) : null}

      {step === 3 && classType === "martial" ? (
        <MartialChoiceGroupsEditor rules={rules} onChange={setRules} />
      ) : null}

      {step === reviewStep ? (
        <div className="space-y-4">
          <div className="border border-neutral-800 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">Basics</h3>
            <p className="text-sm">
              <span className="text-neutral-400">Name:</span> {name.trim() || "—"}
            </p>
            <p className="text-sm">
              <span className="text-neutral-400">Type:</span>{" "}
              {classType === "martial" ? "Martial" : "Caster"}
            </p>
            {description ? (
              <p className="text-sm text-neutral-300 whitespace-pre-wrap">{description}</p>
            ) : null}
          </div>
          <div className="border border-neutral-800 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">Equipment</h3>
            <p className="text-sm">Armor: {armor || "—"}</p>
            <p className="text-sm">Shields: {shields || "—"}</p>
            <p className="text-sm">Weapons: {weapons || "—"}</p>
          </div>
          <div className="border border-neutral-800 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">{classType === "martial" ? "Abilities" : "Spells"}</h3>
            {classType === "martial" ? (
              <p className="text-sm text-neutral-300">
                Look the Part:{" "}
                {lookThePartIncluded
                  ? `${rules.filter(isLookThePartRule).filter((r) => r.spell_id > 0).length} LtP ability(ies)`
                  : "Not included"}
              </p>
            ) : null}
            <ul className="text-sm text-neutral-300">
              {[1, 2, 3, 4, 5, 6].map((lvl) => (
                <li key={lvl}>
                  Level {lvl}:{" "}
                  {rules.filter((r) => r.spell_level === lvl && !isLookThePartRule(r) && r.spell_id > 0)
                    .length}{" "}
                  defined
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-neutral-500">
            Custom classes do not use official archetype grant spells or archetype equipment
            overrides—only what you define here applies when players build with this class.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!tabValidation.ok && step < reviewStep ? (
        <p className="text-xs text-amber-400/90">{tabValidation.message}</p>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="px-4 py-2 border border-neutral-700 rounded hover:bg-neutral-800"
          >
            Back
          </button>
        ) : null}
        {step < reviewStep ? (
          <button
            type="button"
            onClick={continueNext}
            disabled={!tabValidation.ok}
            className="px-4 py-2 bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
          >
            {busy ? "Saving…" : mode === "create" ? "Create Custom Class" : "Save Custom Class"}
          </button>
        )}
      </div>
    </div>
  );
}
