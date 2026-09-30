// Inline policy bundles (LLD U4): the per-file state table and the advisory policy-only
// check (API agentconfig.PolicyOnlyChange, D18 + R22 + R58).

import type {
  ConfigDoc,
  OverlayDoc,
  PluginDoc,
  PolicyBundleDoc,
  PolicyBundleReport,
  PolicyFileReport,
} from '@/types/agent-config';
import { deepEqual, isPlainObject, mergePatch } from './merge-patch';
import { parsePointer } from './json-pointer';
import { inlineBundleName, isInlineSource } from './validation';

// ---------------------------------------------------------------------------------------
// File states (U4.3)
// ---------------------------------------------------------------------------------------

export type FileState =
  | 'inherited'
  | 'overridden'
  | 'deleted'
  | 'added'
  | 'delete-missing'
  | 'set'
  | 'conflict'
  /** A file-defined module the overlay dropped with null (not a vendor path). */
  | 'dropped';

export type FileAction =
  | 'override'
  | 'delete'
  | 'edit'
  | 'restore'
  | 'revert-to-vendor'
  | 'drop-file-module'
  | 'undelete';

export interface FileRow {
  path: string;
  state: FileState;
  /** The vendor file, when the vendor list is known and has this path. */
  vendor?: PolicyFileReport;
  /** The module text comes from the overlay (drives the provenance dot). */
  inOverlay: boolean;
  /** The module text comes from the agent's file bundle. */
  inFile: boolean;
  isTest: boolean;
  actions: FileAction[];
}

/**
 * Vendor file list for bundle `name` from an instance report (U4.3):
 *  1. the `inline:<name>` entry's `extends.files` (R10);
 *  2. otherwise an entry whose source is the bundle's `extends` (still used directly);
 *  3. otherwise null (unknown: no report yet, or truncated).
 */
export function vendorFilesFor(
  name: string,
  bundle: PolicyBundleDoc | null | undefined,
  reports: PolicyBundleReport[] | null | undefined,
): PolicyFileReport[] | null {
  if (!reports) return null;
  const inline = reports.find((r) => r.source === `inline:${name}`);
  if (inline?.extends?.files) return inline.extends.files;
  const ext = bundle?.extends;
  if (typeof ext === 'string' && ext) {
    const direct = reports.find((r) => r.source === ext);
    if (direct) return direct.files ?? [];
  }
  return null;
}

/**
 * The file table for one bundle.
 * @param vendorFiles the vendor list (null = unknown)
 * @param fileBundle the bundle as defined in the agent's file (base), if any
 * @param overlayBundle the bundle as written in the overlay, if any
 */
export function bundleFileStates(
  vendorFiles: PolicyFileReport[] | null,
  fileBundle: PolicyBundleDoc | null | undefined,
  overlayBundle: PolicyBundleDoc | null | undefined,
): FileRow[] {
  const effective = mergePatch<PolicyBundleDoc>(
    isPlainObject(fileBundle) ? fileBundle : {},
    isPlainObject(overlayBundle) ? overlayBundle : {},
  );
  const modules = (effective.modules ?? {}) as Record<string, string>;
  const del = new Set(Array.isArray(effective.delete) ? effective.delete : []);
  const vendor = new Map((vendorFiles ?? []).map((f) => [f.path, f]));
  const known = vendorFiles !== null;
  const overlayModules = (
    isPlainObject(overlayBundle) && isPlainObject(overlayBundle.modules)
      ? overlayBundle.modules
      : {}
  ) as Record<string, string | null>;
  const fileModules = (
    isPlainObject(fileBundle) && isPlainObject(fileBundle.modules)
      ? fileBundle.modules
      : {}
  ) as Record<string, string | null>;

  const paths = new Set<string>([
    ...vendor.keys(),
    ...Object.keys(modules),
    ...del,
  ]);
  // A file-defined module the overlay nulled, not otherwise visible.
  for (const [p, v] of Object.entries(overlayModules)) {
    if (v === null && typeof fileModules[p] === 'string') paths.add(p);
  }

  const rows: FileRow[] = [];
  for (const path of Array.from(paths).sort()) {
    const hasMod = typeof modules[path] === 'string';
    const isDel = del.has(path);
    const inOverlay = typeof overlayModules[path] === 'string';
    const inFile = typeof fileModules[path] === 'string';
    const overlayNulled = overlayModules[path] === null;
    const vendorFile = vendor.get(path);
    const vendorHas = known ? !!vendorFile : null;

    const moduleActions = (): FileAction[] => {
      const a: FileAction[] = ['edit'];
      if (inOverlay) a.push('restore');
      else if (inFile)
        a.push(vendorHas ? 'revert-to-vendor' : 'drop-file-module');
      return a;
    };

    let state: FileState;
    let actions: FileAction[];
    if (hasMod && isDel) {
      state = 'conflict';
      actions = [
        ...(inOverlay ? (['restore'] as FileAction[]) : []),
        'undelete',
      ];
    } else if (!hasMod && !isDel && overlayNulled && !vendorHas) {
      state = 'dropped';
      actions = ['restore'];
    } else if (vendorHas === null) {
      if (hasMod) {
        state = 'set';
        actions = moduleActions();
      } else {
        state = 'deleted';
        actions = ['undelete'];
      }
    } else if (vendorHas) {
      if (!hasMod && !isDel) {
        state = 'inherited';
        actions = ['override', 'delete'];
        if (overlayNulled) actions.push('restore');
      } else if (hasMod) {
        state = 'overridden';
        actions = [...moduleActions(), 'delete'];
      } else {
        state = 'deleted';
        actions = ['undelete'];
      }
    } else if (hasMod) {
      state = 'added';
      actions = moduleActions();
    } else {
      state = 'delete-missing';
      actions = ['undelete'];
    }
    rows.push({
      path,
      state,
      vendor: vendorFile,
      inOverlay,
      inFile,
      isTest: path.endsWith('_test.rego'),
      actions,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------------------
// Policy-only check (U4.7) — mirrors agentconfig.PolicyOnlyChange. ADVISORY: it only enables
// or disables Save; the API decides.
// ---------------------------------------------------------------------------------------

function leafDiffPaths(
  path: string,
  a: unknown,
  b: unknown,
  hasA: boolean,
  hasB: boolean,
  out: string[],
): void {
  let objA = isPlainObject(a) ? a : null;
  let objB = isPlainObject(b) ? b : null;
  if (objA && !hasB) objB = {};
  else if (objB && !hasA) objA = {};
  if (objA && objB) {
    const keys = Array.from(
      new Set([...Object.keys(objA), ...Object.keys(objB)]),
    ).sort();
    for (const k of keys) {
      const inA = Object.prototype.hasOwnProperty.call(objA, k);
      const inB = Object.prototype.hasOwnProperty.call(objB, k);
      leafDiffPaths(
        `${path}/${k.replace(/~/g, '~0').replace(/\//g, '~1')}`,
        objA[k],
        objB[k],
        inA,
        inB,
        out,
      );
    }
    return;
  }
  if (hasA !== hasB || !deepEqual(a, b)) out.push(path);
}

/** Paths configure-policy may change: /policy_bundles/** or exactly /plugins/<p>/policies. */
function policyLeaf(p: string): { ok: boolean; plugin: string } {
  if (p === '/policy_bundles' || p.startsWith('/policy_bundles/')) {
    return { ok: true, plugin: '' };
  }
  const t = parsePointer(p);
  if (t.length === 3 && t[0] === 'plugins' && t[2] === 'policies') {
    return { ok: true, plugin: t[1] };
  }
  return { ok: false, plugin: '' };
}

/** The first changed leaf outside what configure-policy may touch, or null. */
export function firstNonPolicyPath(
  current: OverlayDoc,
  next: OverlayDoc,
): string | null {
  const paths: string[] = [];
  leafDiffPaths('', current, next, true, true, paths);
  return paths.find((p) => !policyLeaf(p).ok) ?? null;
}

function plugins(c: ConfigDoc): Record<string, PluginDoc> {
  const out: Record<string, PluginDoc> = {};
  for (const [k, v] of Object.entries(c.plugins ?? {})) {
    if (isPlainObject(v)) out[k] = v as PluginDoc;
  }
  return out;
}

function bundles(c: ConfigDoc): Record<string, PolicyBundleDoc> {
  const out: Record<string, PolicyBundleDoc> = {};
  for (const [k, v] of Object.entries(c.policy_bundles ?? {})) {
    if (isPlainObject(v)) out[k] = v as PolicyBundleDoc;
  }
  return out;
}

function nonInline(entries: string[]): string[] {
  return entries.filter((e) => !isInlineSource(e));
}

function bundleExtends(
  bs: Record<string, PolicyBundleDoc>,
  inlineEntry: string,
  source: string,
): boolean {
  const name = inlineBundleName(inlineEntry);
  if (!name) return false;
  const b = bs[name];
  return !!b && typeof b.extends === 'string' && b.extends === source;
}

/** Sources a base already uses: plugin sources, non-inline policy entries, bundle extends. */
export function usedSources(base: ConfigDoc): Set<string> {
  const used = new Set<string>();
  for (const p of Object.values(plugins(base))) {
    if (typeof p.source === 'string' && p.source) used.add(p.source);
    for (const e of p.policies ?? []) if (!isInlineSource(e)) used.add(e);
  }
  for (const b of Object.values(bundles(base))) {
    if (typeof b.extends === 'string') used.add(b.extends);
  }
  return used;
}

function policiesChangeAllowed(
  f: string[],
  t: string[],
  fromBundles: Record<string, PolicyBundleDoc>,
  toBundles: Record<string, PolicyBundleDoc>,
  swapped: Map<string, string>,
): boolean {
  if (deepEqual(nonInline(f), nonInline(t))) return true;
  if (f.length !== t.length) return false;
  const accepted = new Map<string, string>();
  for (let i = 0; i < f.length; i++) {
    const a = f[i];
    const b = t[i];
    if (a === b) continue;
    if (isInlineSource(a) && isInlineSource(b)) continue;
    if (
      !isInlineSource(a) &&
      isInlineSource(b) &&
      bundleExtends(toBundles, b, a)
    ) {
      accepted.set(inlineBundleName(b)!, a);
      continue;
    }
    if (
      isInlineSource(a) &&
      !isInlineSource(b) &&
      bundleExtends(fromBundles, a, b)
    )
      continue;
    return false;
  }
  for (const [k, v] of accepted) swapped.set(k, v);
  return true;
}

/** R58: a new or changed extends must name an already-used source or the swapped one. */
function extendsChangeAllowed(
  fromBundles: Record<string, PolicyBundleDoc>,
  toBundles: Record<string, PolicyBundleDoc>,
  used: Set<string>,
  swapped: Map<string, string>,
): boolean {
  for (const [name, tb] of Object.entries(toBundles)) {
    if (typeof tb.extends !== 'string') continue;
    const fb = fromBundles[name];
    if (fb && typeof fb.extends === 'string' && fb.extends === tb.extends)
      continue;
    if (swapped.get(name) === tb.extends || used.has(tb.extends)) continue;
    return false;
  }
  return true;
}

/**
 * Whether going from overlay `current` to `next` only touches what agent:configure-policy
 * may change. `bases` are the known instance bases; none means a single empty base.
 */
export function isPolicyOnlyChange(
  bases: ConfigDoc[],
  current: OverlayDoc,
  next: OverlayDoc,
): boolean {
  const paths: string[] = [];
  leafDiffPaths('', current, next, true, true, paths);
  const touched: string[] = [];
  for (const p of paths) {
    const leaf = policyLeaf(p);
    if (!leaf.ok) return false;
    if (leaf.plugin && !touched.includes(leaf.plugin))
      touched.push(leaf.plugin);
  }
  for (const base of bases.length ? bases : [{}]) {
    const from = mergePatch<ConfigDoc>(base, current);
    const to = mergePatch<ConfigDoc>(base, next);
    const fp = plugins(from);
    const tp = plugins(to);
    // An empty "plugins.x: {}" has no leaves yet still adds a plugin.
    const fromNames = Object.keys(from.plugins ?? {}).sort();
    const toNames = Object.keys(to.plugins ?? {}).sort();
    if (!deepEqual(fromNames, toNames)) return false;
    const swapped = new Map<string, string>();
    for (const name of touched) {
      if (!tp[name]) {
        if (fp[name]) return false;
        continue;
      }
      if (!fp[name]) return false;
      if (
        !policiesChangeAllowed(
          fp[name].policies ?? [],
          tp[name].policies ?? [],
          bundles(from),
          bundles(to),
          swapped,
        )
      ) {
        return false;
      }
    }
    if (
      !extendsChangeAllowed(
        bundles(from),
        bundles(to),
        usedSources(base),
        swapped,
      )
    ) {
      return false;
    }
  }
  return true;
}

/** Whether a configure-policy-only user may make a change, and why not (R61). */
export interface PolicyOnlyGate {
  allowed: boolean;
  /** Tooltip for a disabled control; '' when allowed. */
  reason: string;
}

/** R22/R58 refusals (policy lists, extends) have no single non-policy path to name. */
export const POLICY_ONLY_GENERIC_REASON =
  'Needs agent:configure: this changes plugin policy lists or extends beyond what your role allows';

/**
 * R61: the gate for a configure-policy-only user moving the overlay from `current` to
 * `target` (Revert, Clear overlay). Same rule as the API (isPolicyOnlyChange over the
 * validation bases); advisory, the API decides.
 */
export function policyOnlyGate(
  bases: ConfigDoc[],
  current: OverlayDoc,
  target: OverlayDoc,
): PolicyOnlyGate {
  if (isPolicyOnlyChange(bases, current, target)) {
    return { allowed: true, reason: '' };
  }
  const path = firstNonPolicyPath(current, target);
  return {
    allowed: false,
    reason: path
      ? `Needs agent:configure: this changes ${path}`
      : POLICY_ONLY_GENERIC_REASON,
  };
}
