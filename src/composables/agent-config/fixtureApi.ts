// In-memory AgentConfigApi for fixture mode (LLD U0.6): enabled explicitly only
// (VITE_AGENT_CONFIG_FIXTURES=true or ?fixtures=agent-config). It never kicks in as a fallback
// on errors: showing fake config for a real agent would mislead the user.
//
// Behaviour: each save increments the revision; an identical overlay returns created:false;
// a stale If-Match throws `conflict`; locked keys and "••••" values throw `invalid`.

import type {
  AgentConfigRevision,
  AgentConfigRevisionSummary,
  ConfigChange,
  ConfigDoc,
  ConfigPreview,
  FieldError,
  InstancePreview,
  OverlayDoc,
  SaveResult,
} from '@/types/agent-config';
import { LOCKED_KEYS, REDACTED_MASK } from '@/types/agent-config';
import {
  clone,
  deepEqual,
  isPlainObject,
  mergePatch,
} from '@/utils/agent-config/merge-patch';
import { diffConfigs } from '@/utils/agent-config/config-diff';
import { sourceTrusted } from '@/utils/agent-config/glob';
import { AgentConfigApiError, type AgentConfigApi } from './api-types';
import {
  FIXTURE_ARTIFACT_SOURCES,
  configRev6,
  configRev7,
  detailFor,
  instanceDetailA,
  instanceIds,
  instancesMixed,
} from './fixtures';

interface FixtureState {
  /** revisions[i].revision === i + 1 */
  revisions: AgentConfigRevision[];
}

const states = new Map<string, FixtureState>();

function seed(agentId: string): FixtureState {
  const revisions: AgentConfigRevision[] = [];
  for (let rev = 1; rev <= 5; rev++) {
    const overlay: OverlayDoc =
      rev === 1 ? { verbosity: 1 } : { verbosity: rev % 2 };
    revisions.push({
      agentId,
      revision: rev,
      overlay,
      overlaySize: JSON.stringify(overlay).length,
      comment: `fixture change ${rev}`,
      createdBy: rev % 2 ? 'alice@example.com' : 'bob@example.com',
      createdAt: `2026-09-${String(10 + rev).padStart(2, '0')}T08:00:00Z`,
      revertOf: null,
    });
  }
  revisions.push({ ...clone(configRev6), agentId });
  revisions.push({ ...clone(configRev7), agentId });
  return { revisions };
}

function stateFor(agentId: string): FixtureState {
  let s = states.get(agentId);
  if (!s) {
    s = seed(agentId);
    states.set(agentId, s);
  }
  return s;
}

/** Test hook: forget all in-memory fixture state. */
export function resetFixtureState(): void {
  states.clear();
}

function current(s: FixtureState): AgentConfigRevision {
  const last = s.revisions[s.revisions.length - 1];
  if (!last) {
    return {
      agentId: '',
      revision: 0,
      overlay: {},
      overlaySize: 2,
      comment: null,
      createdBy: null,
      createdAt: null,
      revertOf: null,
    };
  }
  return last;
}

function overlayErrors(overlay: OverlayDoc): FieldError[] {
  const errors: FieldError[] = [];
  for (const key of LOCKED_KEYS) {
    if (key in overlay) {
      errors.push({
        path: `/${key}`,
        code: 'locked-key',
        message: `${key} is set locally only`,
      });
    }
  }
  const walk = (ptr: string, v: unknown) => {
    if (v === REDACTED_MASK) {
      errors.push({
        path: ptr,
        code: 'masked-value',
        message: 'masked value submitted',
      });
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => walk(`${ptr}/${i}`, x));
    } else if (isPlainObject(v)) {
      for (const [k, x] of Object.entries(v)) walk(`${ptr}/${k}`, x);
    }
  };
  walk('', overlay);
  return errors;
}

function save(
  agentId: string,
  overlay: OverlayDoc,
  ifMatch: number,
  comment: string | undefined,
  revertOf: number | null,
): SaveResult {
  const s = stateFor(agentId);
  const cur = current(s);
  if (ifMatch !== cur.revision) {
    throw new AgentConfigApiError({
      kind: 'conflict',
      status: 409,
      message: 'configuration revision conflict',
      currentRevision: cur.revision,
      body: {
        body: 'configuration revision conflict',
        'current-revision': cur.revision,
      },
    });
  }
  const errs = overlayErrors(overlay);
  if (errs.length) {
    throw new AgentConfigApiError({
      kind: 'invalid',
      status: 422,
      message: 'configuration overlay is invalid',
      body: {
        body: 'configuration overlay is invalid',
        overlay: errs,
        instances: [],
        'policy-errors': [],
      },
    });
  }
  if (deepEqual(overlay, cur.overlay ?? {})) {
    return { revision: clone(cur), created: false };
  }
  const next: AgentConfigRevision = {
    agentId,
    revision: cur.revision + 1,
    overlay: clone(overlay),
    overlaySize: JSON.stringify(overlay).length,
    comment: comment?.trim() || null,
    createdBy: 'fixture@example.com',
    createdAt: new Date().toISOString(),
    revertOf,
  };
  s.revisions.push(next);
  return { revision: clone(next), created: true };
}

function classify(base: ConfigDoc, overlay: OverlayDoc): ConfigChange[] {
  const effective = mergePatch<ConfigDoc>(base, overlay);
  const trusted = base.remote_config?.trusted_sources ?? [];
  return diffConfigs(base, effective).map((d) => {
    if (d.path.endsWith('/source') && typeof d.after === 'string') {
      const ok = sourceTrusted(trusted, d.after);
      return {
        path: d.path,
        safety: ok ? 'safe' : 'unsafe',
        reason: ok ? 'trusted-source' : 'untrusted-source',
        value: d.after,
      } as ConfigChange;
    }
    return {
      path: d.path,
      safety: 'safe',
      reason: 'data-only',
    } as ConfigChange;
  });
}

export function createFixtureApi(): AgentConfigApi {
  const delay = <T>(v: T) =>
    new Promise<T>((r) => setTimeout(() => r(clone(v)), 50));
  return {
    fixtures: true,
    async getConfig(agentId) {
      return delay(current(stateFor(agentId)));
    },
    async putConfig(agentId, body, rev) {
      return delay(save(agentId, body.overlay, rev, body.comment, null));
    },
    async preview(agentId, overlay) {
      const s = stateFor(agentId);
      const oErrs = overlayErrors(overlay);
      const instances: InstancePreview[] = instancesMixed.items
        .filter((i) => i.reportedAt != null)
        .map((i) => {
          const base = detailFor(i, {}).base ?? {};
          const changes = classify(base, overlay);
          const mode = i.mode;
          const unsafe = changes.some((c) => c.safety !== 'safe');
          let willApplyReason: string | undefined;
          if (mode === 'off') willApplyReason = 'mode-off';
          else if (mode === 'report') willApplyReason = 'mode-report';
          else if (unsafe && mode !== 'apply_all')
            willApplyReason = 'unsafe-changes';
          if (oErrs.length) willApplyReason = 'invalid-config';
          return {
            instanceId: i.instanceId,
            hostname: i.hostname,
            mode,
            stale: i.stale,
            validated:
              !i.stale && (mode === 'apply_safe' || mode === 'apply_all'),
            effective: mergePatch<ConfigDoc>(base, overlay),
            errors: [],
            warnings: i.warnings ?? [],
            changes,
            willApply: !willApplyReason,
            willApplyReason,
          };
        });
      const preview: ConfigPreview = {
        desiredRevision: current(s).revision,
        standalone: instances.every((i) => !i.validated),
        overlayErrors: oErrs,
        policyErrors: [],
        instances,
      };
      return delay(preview);
    },
    async listRevisions(agentId, page, limit) {
      const all = [...stateFor(agentId).revisions].reverse();
      const items = all.slice((page - 1) * limit, page * limit).map((r) => {
        const summary: Partial<AgentConfigRevision> = { ...r };
        delete summary.overlay;
        delete summary.bundlesFirstSeen;
        return summary as AgentConfigRevisionSummary;
      });
      return delay({
        items,
        total: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / limit)),
      });
    },
    async getRevision(agentId, rev) {
      const found = stateFor(agentId).revisions.find((r) => r.revision === rev);
      if (!found) {
        throw new AgentConfigApiError({
          kind: 'other',
          status: 404,
          message: 'revision not found',
        });
      }
      return delay(found);
    },
    async revert(agentId, rev, ifMatchRevision, comment) {
      const target = stateFor(agentId).revisions.find(
        (r) => r.revision === rev,
      );
      if (!target) {
        throw new AgentConfigApiError({
          kind: 'other',
          status: 404,
          message: 'revision not found',
        });
      }
      return delay(
        save(agentId, target.overlay ?? {}, ifMatchRevision, comment, rev),
      );
    },
    async listInstances(agentId) {
      const desired = current(stateFor(agentId)).revision;
      return delay({
        items: instancesMixed.items,
        meta: { ...instancesMixed.meta, desiredRevision: desired },
      });
    },
    async getInstance(agentId, instanceId) {
      const s = stateFor(agentId);
      const summary = instancesMixed.items.find(
        (i) => i.instanceId === instanceId,
      );
      if (!summary) {
        throw new AgentConfigApiError({
          kind: 'other',
          status: 404,
          message: 'instance not found',
        });
      }
      if (instanceId === instanceIds.a) return delay(instanceDetailA);
      const applied = s.revisions.find(
        (r) => r.revision === summary.appliedRevision,
      );
      return delay(detailFor(summary, applied?.overlay ?? {}));
    },
    async listArtifactFiles(digest) {
      const files = FIXTURE_ARTIFACT_SOURCES[digest];
      if (!files) throw artifactNotFound(digest);
      return delay({
        digest,
        treeDigest: `tree:${digest}`,
        files: Object.entries(files)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([path, source]) => ({
            path,
            sha256: '0'.repeat(64),
            size: source.length,
            package: fixturePackage(source),
          })),
      });
    },
    async getArtifactFile(digest, path) {
      const source = FIXTURE_ARTIFACT_SOURCES[digest]?.[path];
      if (source === undefined) throw artifactNotFound(digest, path);
      return delay({
        path,
        sha256: '0'.repeat(64),
        package: fixturePackage(source),
        source,
      });
    },
  };
}

function artifactNotFound(digest: string, path?: string): AgentConfigApiError {
  return new AgentConfigApiError({
    kind: 'other',
    status: 404,
    message: path
      ? `artifact ${digest} has no file "${path}"`
      : `artifact ${digest} not found`,
  });
}

function fixturePackage(source: string): string | undefined {
  return /^package\s+([\w.]+)/m.exec(source)?.[1];
}
