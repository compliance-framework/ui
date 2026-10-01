// Plugin compatibility with inline policies (design §13.4 R76/R79). A plugin evaluates
// policies with the policy-manager it embeds, so what it can do with an inline bundle depends
// on the agent library it was built with. Each instance reports that per plugin
// (`plugins[].lib-version`, `plugins[].inline-policies`).
//
// The agent is authoritative (agent#95 cmd/compat.go pluginCompatibility): it rejects a
// revision whose overlay gives an inline bundle to, changes an inline bundle used by, or
// changes the source of a plugin whose library is too old (plugin-lib-inline-unsupported).
// An unknown library version (local or replaced build) and inline bundles that come from the
// agent's own file only warn (R34). This module mirrors that rule so the UI can disable the
// actions and block Review & save before the agent rejects the revision.

import type {
  ConfigDoc,
  InlinePolicySupport,
  OverlayDoc,
  PluginDoc,
  PluginReport,
} from '@/types/agent-config';
import { isPlainObject, mergePatch } from './merge-patch';
import { diffConfigs } from './config-diff';
import { parsePointer, pointer } from './json-pointer';
import { inlineBundleName } from './validation';

/** pluginlib.MinInlinePolicy (agent#95): the first agent library that honours policy_id. */
export const MIN_INLINE_POLICY_LIB = 'v0.8.0';

/** The agent's plugin-lib-inline-unsupported message (R79). */
export function inlineUnsupportedText(plugin: string, lib: string): string {
  return `plugin ${plugin} (agent lib ${lib || 'unknown'}) doesn't support inline policies; upgrade the plugin to a build on agent ≥ ${MIN_INLINE_POLICY_LIB}`;
}

/** The warning for a plugin whose agent library version is unknown (R79). */
export function inlineUnknownText(plugin: string): string {
  return `plugin ${plugin}: its agent library version is unknown (a local or replaced build, or no build info), so the agent cannot tell whether it supports inline policies; plugins built on agent < ${MIN_INLINE_POLICY_LIB} ignore policy_id`;
}

/** One instance as the gate sees it. */
export interface CompatInstance {
  instanceId: string;
  hostname: string | null;
  /** The instance's file config (null = not loaded). */
  base: ConfigDoc | null;
  plugins?: PluginReport[] | null;
}

export interface PluginSupport {
  support: InlinePolicySupport;
  /** The reported agent library version ('' = unknown). */
  lib: string;
}

function isSupport(v: unknown): v is InlinePolicySupport {
  return v === 'supported' || v === 'unsupported' || v === 'unknown';
}

/**
 * What instance reports say about plugin `name` running source `source` (its effective source
 * in the draft), or null when nothing is known (an older agent, or a build no plugin of the
 * instance runs). The plugin's own report counts only while it still runs that source; a draft
 * that changes the source is judged by another plugin running the new build, if any.
 */
export function pluginSupport(
  plugins: PluginReport[] | null | undefined,
  name: string,
  source: string | null | undefined,
): PluginSupport | null {
  if (!plugins?.length) return null;
  const own = plugins.find((p) => p.name === name);
  if (
    own &&
    isSupport(own.inlinePolicies) &&
    (!source || !own.source || own.source === source)
  ) {
    return { support: own.inlinePolicies, lib: own.libVersion ?? '' };
  }
  if (source) {
    const same = plugins.find(
      (p) => p.source === source && isSupport(p.inlinePolicies),
    );
    if (same)
      return {
        support: same.inlinePolicies as InlinePolicySupport,
        lib: same.libVersion ?? '',
      };
  }
  return null;
}

function pluginOf(doc: ConfigDoc, name: string): PluginDoc | null {
  const p = doc.plugins?.[name];
  return isPlainObject(p) ? (p as PluginDoc) : null;
}

/** The plugin's inline entries whose bundle exists in `doc`. */
function inlineEntries(doc: ConfigDoc, name: string): string[] {
  const p = pluginOf(doc, name);
  const bundles = doc.policy_bundles ?? {};
  return (Array.isArray(p?.policies) ? p.policies : []).filter((e) => {
    const b = typeof e === 'string' ? inlineBundleName(e) : null;
    return !!b && isPlainObject(bundles[b]);
  });
}

/**
 * The agent's touchedByOverlay (cmd/config.go): `ptr` and one of the `touched` pointers are
 * equal or one is a segment-wise prefix of the other.
 */
function touchedAt(ptr: string, touched: string[]): boolean {
  const p = parsePointer(ptr);
  return touched.some((o) => {
    const t = parsePointer(o);
    const n = Math.min(p.length, t.length);
    return p.slice(0, n).every((tok, i) => tok === t[i]);
  });
}

export interface InlineGateIssue {
  plugin: string;
  instanceId: string;
  hostname: string | null;
  support: InlinePolicySupport;
  lib: string;
  /** The inline bundles the plugin would load. */
  bundles: string[];
  /** The overlay introduces it (an error on the agent: Review & save is blocked). */
  blocking: boolean;
  message: string;
}

/**
 * R79 problems of `overlay` on each instance: every enabled plugin that would load an inline
 * bundle and whose library is not known to support inline policies. Blocking (the agent
 * rejects the revision) when the library is too old AND the overlay brought the plugin and
 * its inline policies together: it changed the plugin's source, gave it an inline entry its
 * file does not have, or changed one of its inline bundles. Otherwise a warning.
 *
 * "Changed" is per instance and relative to that instance's file, as on the agent
 * (cmd/reconciler.go overlayTouched = DiffJSON(file, file ⊕ overlay), matched segment-wise by
 * touchedByOverlay): an overlay that re-states the file's value changes nothing there.
 */
export function inlineGateIssues(
  overlay: OverlayDoc,
  instances: CompatInstance[],
): InlineGateIssue[] {
  const out: InlineGateIssue[] = [];
  for (const inst of instances) {
    if (!inst.plugins?.length) continue;
    const base = inst.base ?? {};
    const eff = mergePatch<ConfigDoc>(base, overlay);
    let touched: string[] | null = null;
    const changed = (ptr: string) =>
      touchedAt(ptr, (touched ??= diffConfigs(base, eff).map((d) => d.path)));
    for (const name of Object.keys(eff.plugins ?? {}).sort()) {
      const plugin = pluginOf(eff, name);
      if (!plugin || plugin.enabled === false) continue;
      const entries = inlineEntries(eff, name);
      if (!entries.length) continue;
      const s = pluginSupport(inst.plugins, name, plugin.source);
      if (!s || s.support === 'supported') continue;
      const bundles = entries.map((e) => inlineBundleName(e)!);
      const fileEntries = pluginOf(base, name)?.policies ?? [];
      const introduced =
        changed(pointer('plugins', name, 'source')) ||
        entries.some((e) => !fileEntries.includes(e)) ||
        bundles.some((b) => changed(pointer('policy_bundles', b)));
      out.push({
        plugin: name,
        instanceId: inst.instanceId,
        hostname: inst.hostname,
        support: s.support,
        lib: s.lib,
        bundles,
        blocking: s.support === 'unsupported' && introduced,
        message:
          s.support === 'unsupported'
            ? inlineUnsupportedText(name, s.lib)
            : inlineUnknownText(name),
      });
    }
  }
  return out;
}

/**
 * Why plugin `name` must not be given inline policies (R79: an instance reports the build it
 * would run under `overlay` as unsupported), or null.
 */
export function inlineBlockedReason(
  name: string,
  instances: CompatInstance[],
  overlay: OverlayDoc,
): string | null {
  for (const inst of instances) {
    const source = pluginOf(
      mergePatch<ConfigDoc>(inst.base ?? {}, overlay),
      name,
    )?.source;
    const s = pluginSupport(inst.plugins, name, source);
    if (s?.support === 'unsupported') return inlineUnsupportedText(name, s.lib);
  }
  return null;
}

/** A warning for plugin `name` when an instance cannot tell its inline support, or null. */
export function inlineUnknownReason(
  name: string,
  instances: CompatInstance[],
  overlay: OverlayDoc,
): string | null {
  for (const inst of instances) {
    const source = pluginOf(
      mergePatch<ConfigDoc>(inst.base ?? {}, overlay),
      name,
    )?.source;
    if (pluginSupport(inst.plugins, name, source)?.support === 'unknown')
      return inlineUnknownText(name);
  }
  return null;
}

/** One plugin's inline support across instances (review: per-instance divergence). */
export interface SupportRow {
  plugin: string;
  instances: {
    instanceId: string;
    hostname: string | null;
    support: InlinePolicySupport | null;
    lib: string;
  }[];
  /** The instances disagree. */
  divergent: boolean;
}

/**
 * Inline support of every plugin that would load an inline bundle under `overlay` on any of
 * `instances`, per instance (null = not reported).
 */
export function inlineSupportRows(
  overlay: OverlayDoc,
  instances: CompatInstance[],
): SupportRow[] {
  const names = new Set<string>();
  const effs = instances.map((inst) =>
    mergePatch<ConfigDoc>(inst.base ?? {}, overlay),
  );
  effs.forEach((eff) => {
    for (const name of Object.keys(eff.plugins ?? {})) {
      const p = pluginOf(eff, name);
      if (p && p.enabled !== false && inlineEntries(eff, name).length)
        names.add(name);
    }
  });
  return Array.from(names)
    .sort()
    .map((plugin) => {
      const rows = instances.map((inst, i) => {
        const s = pluginSupport(
          inst.plugins,
          plugin,
          pluginOf(effs[i], plugin)?.source,
        );
        return {
          instanceId: inst.instanceId,
          hostname: inst.hostname,
          support: s?.support ?? null,
          lib: s?.lib ?? '',
        };
      });
      const kinds = new Set(rows.map((r) => r.support));
      return { plugin, instances: rows, divergent: kinds.size > 1 };
    });
}
