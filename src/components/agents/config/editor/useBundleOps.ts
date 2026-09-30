// Policy-bundle operations → overlay writes (LLD U4.2, R17). `B` is the bundle in the
// effective draft (file bundle merged with the overlay); `baseB` the file-defined bundle.

import { computed } from 'vue';
import type { PolicyBundleDoc } from '@/types/agent-config';
import { pointer } from '@/utils/agent-config/json-pointer';
import { isPlainObject } from '@/utils/agent-config/merge-patch';
import { NAME_RE, isInlineSource } from '@/utils/agent-config/validation';
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

export function regoSkeleton(pkg: string): string {
  return `package ${pkg}\n\nimport rego.v1\n`;
}

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
  function effectivePolicies(plugin: string): string[] {
    const p = draft.effectiveDraft.value.plugins?.[plugin];
    return isPlainObject(p) && Array.isArray(p.policies)
      ? [...(p.policies as string[])]
      : [];
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
  function createBundle(
    name: string,
    opts: { extends?: string; usedBy?: string[] },
  ) {
    const doc: PolicyBundleDoc = opts.extends
      ? { extends: opts.extends }
      : {
          modules: {
            'main.rego': regoSkeleton(`compliance_framework.${snake(name)}`),
          },
        };
    draft.set(pointer('policy_bundles', name), doc);
    for (const p of opts.usedBy ?? []) wire(p, name, true);
  }

  /** extends S, plus (optionally) the R22 swap of S → inline:<name> at the same index. */
  function customizeBundle(
    plugin: string,
    source: string,
    name: string,
    swap: boolean,
  ) {
    draft.set(pointer('policy_bundles', name), { extends: source });
    if (swap) {
      const cur = effectivePolicies(plugin);
      const idx = cur.indexOf(source);
      if (idx >= 0) {
        cur[idx] = `inline:${name}`;
        draft.set(pointer('plugins', plugin, 'policies'), cur);
      }
    }
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
    const baseDel = fileBundle(b)?.delete;
    const ptr = pointer('policy_bundles', b, 'delete');
    if (next.length === 0 && !(Array.isArray(baseDel) && baseDel.length))
      draft.unset(ptr);
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
    customizeBundle,
    deleteBundle,
    resetBundle,
    setModule,
    restoreModule,
    revertToVendor,
    deleteVendorFile,
    undeleteFile,
    setData,
    nonInlineSources: (plugin: string) =>
      effectivePolicies(plugin).filter((s) => !isInlineSource(s)),
    validName: (n: string) => NAME_RE.test(n) && !takenNames.value.has(n),
  };
}

export type BundleOps = ReturnType<typeof useBundleOps>;
