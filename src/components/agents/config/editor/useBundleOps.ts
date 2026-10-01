// Policy-bundle operations → overlay writes (LLD U4.2, R17). `B` is the bundle in the
// effective draft (file bundle merged with the overlay); `baseB` the file-defined bundle.

import { computed } from 'vue';
import type { ConfigDoc, PolicyBundleDoc } from '@/types/agent-config';
import { pointer } from '@/utils/agent-config/json-pointer';
import { isPlainObject, mergePatch } from '@/utils/agent-config/merge-patch';
import { NAME_RE, isInlineSource } from '@/utils/agent-config/validation';
import { usedSources } from '@/utils/agent-config/policy-files';
import { moduleTemplate } from '@/utils/agent-config/rego-template';
import { useEditor } from './useEditor';

/** Name sanitisation for "Customize a bundle": lowercase, [^a-z0-9_-] → '-', ≤ 63 chars. */
export function sanitizeBundleName(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .slice(0, 63);
  return s || 'bundle';
}

/** Appends -2, -3, … until the name is free (and still ≤ 63 chars). */
export function uniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const suffix = `-${i}`;
    const candidate = `${base.slice(0, 63 - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function snake(s: string): string {
  return s.replace(/[^A-Za-z0-9_]/g, '_');
}

/** A default bundle name for a copy of `source`: "<last path segment>-custom". */
export function bundleNameForSource(
  source: string,
  taken: Set<string>,
): string {
  const last =
    source
      .replace(/[:@][^/]*$/, '')
      .split('/')
      .filter(Boolean)
      .pop() ?? 'bundle';
  return uniqueName(sanitizeBundleName(`${last}-custom`), taken);
}

/** How "Assign to plugins" wires an extends bundle (R66). */
export type AssignMode = 'replace' | 'alongside';

export function useBundleOps() {
  const { draft, ctx } = useEditor();

  const bundles = computed<Record<string, PolicyBundleDoc>>(() => {
    const out: Record<string, PolicyBundleDoc> = {};
    for (const [k, v] of Object.entries(
      draft.effectiveDraft.value.policy_bundles ?? {},
    )) {
      if (isPlainObject(v)) out[k] = v as PolicyBundleDoc;
    }
    return out;
  });
  const pluginNames = computed(() =>
    Object.keys(draft.effectiveDraft.value.plugins ?? {}).filter((p) =>
      isPlainObject(draft.effectiveDraft.value.plugins?.[p]),
    ),
  );
  const takenNames = computed(() => {
    const names = new Set(Object.keys(bundles.value));
    for (const b of ctx.bases.value)
      Object.keys(b.policy_bundles ?? {}).forEach((n) => names.add(n));
    return names;
  });

  function fileBundle(name: string): PolicyBundleDoc | null {
    const b = ctx.placeholderBase.value?.policy_bundles?.[name];
    return isPlainObject(b) ? (b as PolicyBundleDoc) : null;
  }
  function overlayBundle(name: string): PolicyBundleDoc | null {
    const b = (
      draft.overlay.value.policy_bundles as Record<string, unknown> | undefined
    )?.[name];
    return isPlainObject(b) ? (b as PolicyBundleDoc) : null;
  }
  function policiesIn(doc: ConfigDoc | null | undefined, plugin: string) {
    const p = doc?.plugins?.[plugin];
    return isPlainObject(p) && Array.isArray(p.policies)
      ? [...(p.policies as string[])]
      : [];
  }
  function effectivePolicies(plugin: string): string[] {
    return policiesIn(draft.effectiveDraft.value, plugin);
  }
  function usedBy(name: string): string[] {
    return pluginNames.value.filter((p) =>
      effectivePolicies(p).includes(`inline:${name}`),
    );
  }

  // ---- Wiring (whole-array writes) ----
  function wire(plugin: string, name: string, on: boolean) {
    const ref = `inline:${name}`;
    const cur = effectivePolicies(plugin);
    if (on && !cur.includes(ref))
      draft.set(pointer('plugins', plugin, 'policies'), [...cur, ref]);
    if (!on && cur.includes(ref)) {
      draft.set(
        pointer('plugins', plugin, 'policies'),
        cur.filter((x) => x !== ref),
      );
    }
  }

  // ---- Bundles ----
  /** A new bundle: extends `source` (nothing overridden yet) or one template module. */
  function createBundle(name: string, opts: { extends?: string } = {}) {
    const doc: PolicyBundleDoc = opts.extends
      ? { extends: opts.extends }
      : {
          modules: {
            'main.rego': moduleTemplate(`compliance_framework.${snake(name)}`),
          },
        };
    draft.set(pointer('policy_bundles', name), doc);
  }

  /** The source bundle `name` extends in the draft, or null. */
  function extendsOf(name: string): string | null {
    const ext = bundles.value[name]?.extends;
    return typeof ext === 'string' && ext ? ext : null;
  }

  /**
   * R66: wire inline:<name> into `plugin`. For a bundle that extends S and a plugin that loads
   * S, "replace" swaps S for inline:<name> at the same index (R22, allowed for policy-only
   * users) so the vendor packages are not evaluated twice; "alongside" appends.
   */
  function assign(plugin: string, name: string, mode: AssignMode = 'replace') {
    const ref = `inline:${name}`;
    const cur = effectivePolicies(plugin);
    if (cur.includes(ref)) return;
    const ext = extendsOf(name);
    const idx = ext ? cur.indexOf(ext) : -1;
    if (mode === 'replace' && idx >= 0) cur[idx] = ref;
    else cur.push(ref);
    draft.set(pointer('plugins', plugin, 'policies'), cur);
  }

  /**
   * The source unassigning inline:<name> from `plugin` puts back, or null. Only an undone R66
   * swap restores: the plugin's saved list (file + saved overlay) or file list had the
   * extended source S where the bundle now sits. A bundle that was appended (the plugin never
   * loaded S) is just removed; restoring S would add a source the plugin never ran.
   */
  function restoredSource(plugin: string, name: string): string | null {
    const cur = effectivePolicies(plugin);
    const idx = cur.indexOf(`inline:${name}`);
    const ext = extendsOf(name);
    if (idx < 0 || !ext || cur.includes(ext)) return null;
    const bases = [ctx.placeholderBase.value, ...ctx.bases.value].filter(
      (b): b is ConfigDoc => !!b,
    );
    const swapped = bases.some(
      (base) =>
        policiesIn(base, plugin)[idx] === ext ||
        policiesIn(mergePatch<ConfigDoc>(base, draft.original.value), plugin)[
          idx
        ] === ext,
    );
    return swapped ? ext : null;
  }

  /** Unwire inline:<name>; a swapped bundle gives its place back to the source it extends. */
  function unassign(plugin: string, name: string) {
    const ref = `inline:${name}`;
    const cur = effectivePolicies(plugin);
    const idx = cur.indexOf(ref);
    if (idx < 0) return;
    const restore = restoredSource(plugin, name);
    if (restore) cur[idx] = restore;
    else cur.splice(idx, 1);
    draft.set(pointer('plugins', plugin, 'policies'), cur);
  }

  function deleteBundle(name: string) {
    for (const p of usedBy(name)) wire(p, name, false);
    draft.makeAbsent(pointer('policy_bundles', name));
  }

  function resetBundle(name: string) {
    draft.unset(pointer('policy_bundles', name));
  }

  // ---- Files ----
  const mod = (b: string, path: string) =>
    pointer('policy_bundles', b, 'modules', path);

  function setModule(b: string, path: string, text: string) {
    draft.set(mod(b, path), text);
  }
  /** Undo an overlay override / overlay-added file (the file-defined or vendor file applies). */
  function restoreModule(b: string, path: string) {
    draft.unset(mod(b, path));
  }
  /** null: delete the effective module (vendor file shows through / file module dropped). */
  function revertToVendor(b: string, path: string) {
    draft.remove(mod(b, path));
  }
  function deleteVendorFile(b: string, path: string) {
    const B = bundles.value[b] ?? {};
    const next = Array.from(new Set([...(B.delete ?? []), path]));
    draft.set(pointer('policy_bundles', b, 'delete'), next);
    // A path in both delete and modules is an error (API A1.9).
    if (typeof B.modules?.[path] === 'string') draft.makeAbsent(mod(b, path));
  }
  function undeleteFile(b: string, path: string) {
    const B = bundles.value[b] ?? {};
    const next = (B.delete ?? []).filter((p) => p !== path);
    // Omitting the key would bring back a file-defined delete list on ANY instance whose
    // file has one; write [] then.
    const fileDeletes = [ctx.placeholderBase.value, ...ctx.bases.value].some(
      (base) => {
        const del = (
          base?.policy_bundles?.[b] as PolicyBundleDoc | null | undefined
        )?.delete;
        return Array.isArray(del) && del.length > 0;
      },
    );
    const ptr = pointer('policy_bundles', b, 'delete');
    if (next.length === 0 && !fileDeletes) draft.unset(ptr);
    else draft.set(ptr, next);
  }
  function setData(b: string, data: Record<string, unknown>) {
    draft.set(pointer('policy_bundles', b, 'data'), data);
  }

  return {
    bundles,
    pluginNames,
    takenNames,
    fileBundle,
    overlayBundle,
    effectivePolicies,
    usedBy,
    wire,
    createBundle,
    extendsOf,
    assign,
    unassign,
    restoredSource,
    deleteBundle,
    resetBundle,
    setModule,
    restoreModule,
    revertToVendor,
    deleteVendorFile,
    undeleteFile,
    setData,
    /** Sources every known base already uses (R58: allowed `extends` for policy-only users). */
    usedSourcesEverywhere: computed(() => {
      // Same bases as the API's PolicyOnlyChange (R58): the validation set.
      const set = ctx.validationBases?.value ?? ctx.bases.value;
      const bases = set.length ? set : [{}];
      const sets = bases.map((base) => usedSources(base));
      return new Set(
        [...sets[0]].filter((src) => sets.every((set) => set.has(src))),
      );
    }),
    nonInlineSources: (plugin: string) =>
      effectivePolicies(plugin).filter((s) => !isInlineSource(s)),
    /** Non-inline policy sources the draft's plugins load → the plugins loading each. */
    sourceUsage: computed(() => {
      const out = new Map<string, string[]>();
      for (const p of pluginNames.value) {
        for (const src of effectivePolicies(p)) {
          if (isInlineSource(src)) continue;
          out.set(src, [...(out.get(src) ?? []), p]);
        }
      }
      return out;
    }),
    validName: (n: string) => NAME_RE.test(n) && !takenNames.value.has(n),
  };
}

export type BundleOps = ReturnType<typeof useBundleOps>;
