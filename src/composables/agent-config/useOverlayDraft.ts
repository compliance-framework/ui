// The editor draft (LLD U2.2): ONE overlay document is the single source of truth; the YAML
// text is derived on form→yaml switches and parsed back (debounced) while typing in YAML.
//
// Draft semantics: clearing a field omits the key (the file value applies again); there is no
// automatic normalisation of overlay values equal to the base, because bases differ between
// instances and dropping a key could silently un-pin it elsewhere (the API's R14 no-op check
// covers accidental "no change" saves).

import { computed, ref, shallowRef, type Ref } from 'vue';
import type {
  AgentConfigRevision,
  ConfigDoc,
  OverlayDoc,
} from '@/types/agent-config';
import { clone, deepEqual, mergePatch } from '@/utils/agent-config/merge-patch';
import {
  makeAbsent as makeAbsentOp,
  nullAt,
  setAt,
  unsetAt,
} from '@/utils/agent-config/overlay-ops';
import { parseYaml, toYaml, type YamlError } from '@/utils/agent-config/yaml';
import {
  coerceStringMaps,
  validateOverlayClientSide,
  type ValidationContext,
} from '@/utils/agent-config/validation';

export const YAML_DEBOUNCE_MS = 300;

export interface OverlayDraftOptions {
  /** Every known instance base, for validation (new plugins, new ${env:} refs, bundles). */
  bases?: Ref<ConfigDoc[]>;
  validationContext?: Ref<ValidationContext>;
}

export function useOverlayDraft(
  initial: AgentConfigRevision,
  base: Ref<ConfigDoc | null>,
  options: OverlayDraftOptions = {},
) {
  const baseRevision = ref(initial.revision);
  const original = shallowRef<OverlayDoc>(clone(initial.overlay ?? {}));
  const overlay = shallowRef<OverlayDoc>(clone(initial.overlay ?? {}));
  const yamlText = ref(toYaml(overlay.value));
  const yamlError = ref<YamlError | null>(null);
  /** Pointers whose scalar values were converted to strings from YAML (R27). */
  const coerced = ref<string[]>([]);
  const mode = ref<'form' | 'yaml'>('form');
  let yamlTimer: ReturnType<typeof setTimeout> | null = null;

  const isDirty = computed(() => !deepEqual(overlay.value, original.value));
  const effectiveDraft = computed(() =>
    mergePatch<ConfigDoc>(base.value ?? {}, overlay.value),
  );
  const clientIssues = computed(() =>
    validateOverlayClientSide(
      overlay.value,
      options.bases?.value ?? (base.value ? [base.value] : []),
      options.validationContext?.value ?? {},
    ),
  );

  function set(ptr: string, v: unknown): void {
    overlay.value = setAt(overlay.value, ptr, v);
  }
  /** "Reset to file": omit the key. */
  function unset(ptr: string): void {
    overlay.value = unsetAt(overlay.value, ptr);
  }
  /** Explicit null: delete from the effective config (agent default applies, R56). */
  function remove(ptr: string): void {
    overlay.value = nullAt(overlay.value, ptr);
  }
  /** null if the base has the key, else omit. */
  function makeAbsent(ptr: string): void {
    overlay.value = makeAbsentOp(overlay.value, base.value ?? {}, ptr);
  }

  function parseNow(text: string): boolean {
    const res = parseYaml(text);
    if (!res.ok) {
      yamlError.value = res.error;
      return false;
    }
    const c = coerceStringMaps(res.value as OverlayDoc);
    yamlError.value = null;
    coerced.value = c.coerced;
    overlay.value = c.overlay;
    return true;
  }

  function flushYaml(): boolean {
    if (yamlTimer) {
      clearTimeout(yamlTimer);
      yamlTimer = null;
      return parseNow(yamlText.value);
    }
    return yamlError.value === null;
  }

  /** form→yaml regenerates the text; yaml→form parses it and stays on YAML when it fails. */
  function setMode(next: 'form' | 'yaml'): boolean {
    if (next === mode.value) return true;
    if (next === 'yaml') {
      yamlText.value = toYaml(overlay.value);
      yamlError.value = null;
      coerced.value = [];
      mode.value = 'yaml';
      return true;
    }
    if (!flushYaml() || yamlError.value) return false;
    mode.value = 'form';
    return true;
  }

  function onYamlInput(text: string): void {
    yamlText.value = text;
    if (yamlTimer) clearTimeout(yamlTimer);
    yamlTimer = setTimeout(() => {
      yamlTimer = null;
      parseNow(text);
    }, YAML_DEBOUNCE_MS);
  }

  /** 409 handling: adopt `latest` as the base revision, keeping or discarding the draft. */
  function rebase(latest: AgentConfigRevision, keepDraft: boolean): void {
    baseRevision.value = latest.revision;
    original.value = clone(latest.overlay ?? {});
    if (!keepDraft) {
      overlay.value = clone(latest.overlay ?? {});
      yamlText.value = toYaml(overlay.value);
      yamlError.value = null;
      coerced.value = [];
    }
  }

  /** "Clear overlay" → {}. */
  function replaceAll(next: OverlayDoc): void {
    overlay.value = clone(next);
    yamlText.value = toYaml(overlay.value);
    yamlError.value = null;
    coerced.value = [];
  }

  function dispose(): void {
    if (yamlTimer) clearTimeout(yamlTimer);
    yamlTimer = null;
  }

  return {
    baseRevision,
    original,
    overlay,
    yamlText,
    yamlError,
    coerced,
    mode,
    isDirty,
    effectiveDraft,
    clientIssues,
    set,
    unset,
    remove,
    makeAbsent,
    setMode,
    onYamlInput,
    flushYaml,
    rebase,
    replaceAll,
    dispose,
  };
}

export type OverlayDraft = ReturnType<typeof useOverlayDraft>;
