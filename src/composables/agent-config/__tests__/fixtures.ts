// Fixtures for agent remote configuration (LLD U0.6). Shapes are exactly what
// useAgentConfigApi returns, i.e. AFTER the camelcase interceptor: envelope keys camelCase,
// config documents (overlay/base/effective/remote-config) verbatim snake_case.
//
// Test data for the specs (the `?fixtures` demo mode was removed, R90).

import type {
  AgentConfigRevision,
  AgentConfigRevisionSummary,
  AgentInstanceDetail,
  AgentInstanceSummary,
  ConfigDoc,
  ConfigErrorBody,
  ConfigPreview,
  InstancesMeta,
  OverlayDoc,
  RemoteConfigDoc,
} from '@/types/agent-config';
import { clone, mergePatch } from '@/utils/agent-config/merge-patch';

export const FIXTURE_AGENT_ID = '5b1c8a2e-0000-4000-8000-00000000a9e1';

export const SSH_SOURCE =
  'ghcr.io/compliance-framework/plugin-local-ssh:v1.2.0';
export const SSH_POLICIES =
  'ghcr.io/compliance-framework/plugin-local-ssh-policies:v1.0.0';
export const UBUNTU_SOURCE =
  'ghcr.io/compliance-framework/plugin-ubuntu-packages:v0.4.0';
export const UBUNTU_POLICIES =
  'ghcr.io/compliance-framework/plugin-ubuntu-policies:v0.2.0';
/** The policy bundle overlay r7 swaps local-ssh to. */
export const SSH_POLICIES_NEXT =
  'ghcr.io/compliance-framework/plugin-local-ssh-policies:v1.1.0';

export const instanceIds = {
  a: '0f5e2c1a-0000-4000-8000-00000000000a',
  b: '0f5e2c1a-0000-4000-8000-00000000000b',
  c: '0f5e2c1a-0000-4000-8000-00000000000c',
  d: '0f5e2c1a-0000-4000-8000-00000000000d',
  e: '0f5e2c1a-0000-4000-8000-00000000000e',
  f: '0f5e2c1a-0000-4000-8000-00000000000f',
  g: '0f5e2c1a-0000-4000-8000-000000000010',
} as const;

export const remoteConfigSafe: RemoteConfigDoc = {
  mode: 'apply_safe',
  poll_interval: '60s',
  trusted_sources: ['ghcr.io/compliance-framework/*'],
  overridable_config_flags: ['local-ssh:port', 'timeout'],
  allow_local_sources: false,
};

export const baseConfig: ConfigDoc = {
  daemon: true,
  verbosity: 0,
  api: {
    url: 'https://ccf.example.com',
    auth: { client_id: 'agent-ssh-client' },
  },
  remote_config: remoteConfigSafe,
  agent_evidence: {
    enabled: true,
    emit_on_run_completion: true,
    interval: '1h',
  },
  plugins: {
    'local-ssh': {
      source: SSH_SOURCE,
      schedule: '*/5 * * * *',
      policies: [SSH_POLICIES],
      config: {
        host: 'localhost',
        port: '22',
        password: '${env:SSH_PASSWORD}',
      },
      labels: { env: 'prod' },
      policy_data: { max_auth_tries: 4 },
    },
    'ubuntu-packages': {
      source: UBUNTU_SOURCE,
      schedule: '0 * * * *',
      policies: [UBUNTU_POLICIES],
      protocol_version: 2,
    },
  },
};

export const overlayRev7: OverlayDoc = {
  verbosity: 1,
  plugins: {
    'local-ssh': {
      schedule: '*/15 * * * *',
      policies: [SSH_POLICIES_NEXT],
      config: { port: '2222' },
      policy_data: { max_auth_tries: 3 },
    },
  },
};

export const overlayRev6: OverlayDoc = {
  verbosity: 1,
  plugins: { 'local-ssh': { schedule: '*/15 * * * *' } },
};

export const configRev0: AgentConfigRevision = {
  agentId: FIXTURE_AGENT_ID,
  revision: 0,
  overlay: {},
  overlaySize: 2,
  comment: null,
  createdBy: null,
  createdAt: null,
  revertOf: null,
};

export const configRev7: AgentConfigRevision = {
  agentId: FIXTURE_AGENT_ID,
  revision: 7,
  overlay: overlayRev7,
  overlaySize: JSON.stringify(overlayRev7).length,
  comment: 'tighten ssh',
  createdBy: 'alice@example.com',
  createdAt: '2026-09-29T08:00:00Z',
  revertOf: null,
};

export const configRev6: AgentConfigRevision = {
  agentId: FIXTURE_AGENT_ID,
  revision: 6,
  overlay: overlayRev6,
  overlaySize: JSON.stringify(overlayRev6).length,
  comment: 'slower ssh schedule',
  createdBy: 'bob@example.com',
  createdAt: '2026-09-25T08:00:00Z',
  revertOf: null,
};

function summary(
  id: string,
  hostname: string,
  over: Partial<AgentInstanceSummary>,
): AgentInstanceSummary {
  return {
    instanceId: id,
    hostname,
    agentVersion: 'v0.9.0',
    mode: 'apply_safe',
    firstSeenAt: '2026-09-01T00:00:00Z',
    lastSeenAt: '2026-09-30T09:59:00Z',
    reportedAt: '2026-09-30T09:58:00Z',
    stale: false,
    appliedRevision: 7,
    attemptedRevision: 7,
    status: 'applied',
    reason: null,
    error: null,
    syncStatus: 'in-sync',
    effectiveDigest: 'sha256:1111',
    heartbeatConfigRevision: 7,
    reportStale: false,
    remoteConfig: remoteConfigSafe,
    unsafe: [],
    daemon: true,
    truncated: false,
    warnings: [],
    ...over,
  };
}

export const instancesMixed: {
  items: AgentInstanceSummary[];
  meta: InstancesMeta;
} = {
  items: [
    summary(instanceIds.a, 'ip-a', {
      warnings: [
        {
          path: '/plugins/nightly-audit/schedule',
          code: 'invalid-value',
          message: 'invalid cron schedule "every night"; the plugin is skipped',
        },
      ],
    }),
    summary(instanceIds.b, 'ip-b', {
      status: 'rejected',
      reason: 'unsafe-changes',
      appliedRevision: 6,
      attemptedRevision: 7,
      syncStatus: 'out-of-sync',
      heartbeatConfigRevision: 6,
      unsafe: [
        {
          path: '/plugins/local-ssh/config/password',
          safety: 'unsafe',
          reason: 'config-not-overridable',
        },
      ],
    }),
    summary(instanceIds.c, 'ip-c', {
      mode: 'report',
      status: 'not-applicable',
      syncStatus: 'not-applicable',
      appliedRevision: 0,
      attemptedRevision: null,
      heartbeatConfigRevision: 0,
      remoteConfig: { ...remoteConfigSafe, mode: 'report' },
    }),
    summary(instanceIds.f, 'ip-f', {
      status: 'pending',
      appliedRevision: 6,
      attemptedRevision: 6,
      syncStatus: 'out-of-sync',
      heartbeatConfigRevision: 6,
    }),
    summary(instanceIds.g, 'ip-g', { daemon: false, truncated: true }),
    summary(instanceIds.d, 'ip-d', {
      mode: 'apply_all',
      stale: true,
      lastSeenAt: '2026-09-28T09:00:00Z',
      reportedAt: '2026-09-28T09:00:00Z',
      remoteConfig: {
        ...remoteConfigSafe,
        mode: 'apply_all',
        allow_local_sources: true,
      },
    }),
    summary(instanceIds.e, 'ip-e', {
      mode: '',
      status: 'unknown',
      syncStatus: 'unknown',
      reportedAt: null,
      appliedRevision: null,
      attemptedRevision: null,
      heartbeatConfigRevision: 0,
      effectiveDigest: null,
      remoteConfig: null,
    }),
  ],
  meta: {
    desiredRevision: 7,
    page: 1,
    limit: 25,
    total: 7,
    totalPages: 1,
    counts: {
      total: 7,
      fresh: 6,
      stale: 1,
      inSync: 3,
      outOfSync: 2,
      pending: 1,
      rejected: 1,
      failed: 0,
      unknown: 1,
    },
  },
};

function redact(doc: ConfigDoc): ConfigDoc {
  const out = clone(doc);
  if (out.api?.auth) delete out.api.auth.client_secret;
  return out;
}

export function detailFor(
  s: AgentInstanceSummary,
  overlay: OverlayDoc,
): AgentInstanceDetail {
  if (s.reportedAt == null) {
    return { ...s, base: null, effective: null };
  }
  const base = clone(baseConfig);
  base.remote_config = clone(s.remoteConfig ?? remoteConfigSafe);
  return {
    ...s,
    base,
    effective: redact(mergePatch<ConfigDoc>(base, overlay)),
  };
}

export const instanceDetailA: AgentInstanceDetail = detailFor(
  instancesMixed.items[0],
  overlayRev7,
);

export const previewMixed: ConfigPreview = {
  desiredRevision: 7,
  standalone: false,
  overlayErrors: [
    {
      path: '/plugins/local-ssh/labels/team',
      code: 'invalid-type',
      message: 'must be a string',
    },
  ],
  instances: [
    {
      instanceId: instanceIds.a,
      hostname: 'ip-a',
      mode: 'apply_safe',
      stale: false,
      validated: true,
      effective: mergePatch<ConfigDoc>(baseConfig, overlayRev7),
      errors: [],
      warnings: [
        {
          path: '/plugins/nightly-audit/schedule',
          code: 'cron',
          message: 'invalid cron schedule in the host file',
        },
      ],
      changes: [
        {
          path: '/plugins/local-ssh/schedule',
          safety: 'safe',
          reason: 'logging',
        },
        {
          path: '/plugins/local-ssh/config/port',
          safety: 'safe',
          reason: 'overridable-config-flag',
        },
        {
          path: '/plugins/local-ssh/source',
          safety: 'unsafe',
          reason: 'untrusted-source',
          value: 'docker.io/evil/ssh:latest',
        },
      ],
      willApply: false,
      willApplyReason: 'unsafe-changes',
    },
    {
      instanceId: instanceIds.d,
      hostname: 'ip-d',
      mode: 'apply_all',
      stale: true,
      validated: true,
      effective: mergePatch<ConfigDoc>(baseConfig, overlayRev7),
      errors: [
        {
          path: '/plugins/local-ssh/schedule',
          code: 'cron',
          message: 'invalid cron schedule',
        },
      ],
      warnings: [],
      changes: [],
      willApply: false,
      willApplyReason: 'invalid-config',
    },
    {
      instanceId: instanceIds.c,
      hostname: 'ip-c',
      mode: 'report',
      stale: false,
      validated: false,
      effective: mergePatch<ConfigDoc>(baseConfig, overlayRev7),
      errors: [
        {
          path: '/plugins/local-ssh/policies/0',
          code: 'source',
          message: 'policy source is empty',
        },
      ],
      warnings: [],
      changes: [],
      willApply: false,
      willApplyReason: 'mode-report',
    },
  ],
};

export const previewStandalone: ConfigPreview = {
  desiredRevision: 0,
  standalone: true,
  overlayErrors: [],
  instances: [],
};

export const revisionsPage1: {
  items: AgentConfigRevisionSummary[];
  total: number;
  totalPages: number;
} = {
  items: [7, 6, 5, 4, 3, 2, 1].map((rev) => ({
    agentId: FIXTURE_AGENT_ID,
    revision: rev,
    overlaySize: 100 + rev,
    comment: rev === 5 ? null : `change ${rev}`,
    createdBy: rev % 2 ? 'alice@example.com' : 'bob@example.com',
    createdAt: `2026-09-${String(20 + rev).padStart(2, '0')}T08:00:00Z`,
    revertOf: rev === 4 ? 2 : null,
  })),
  total: 7,
  totalPages: 1,
};

// ---- Raw (uncamelized) error bodies, as the API sends them ----

export const error409: { errors: ConfigErrorBody } = {
  errors: { body: 'configuration revision conflict', 'current-revision': 8 },
};

export const error422: { errors: ConfigErrorBody } = {
  errors: {
    body: 'configuration overlay is invalid',
    overlay: [
      { path: '/api', code: 'locked-key', message: 'api is set locally only' },
    ],
    instances: [
      {
        'instance-id': instanceIds.a,
        hostname: 'ip-a',
        errors: [
          {
            path: '/plugins/x/schedule',
            code: 'cron',
            message: 'invalid cron',
          },
        ],
        warnings: [
          { path: '/plugins/y/schedule', code: 'cron', message: 'file cron' },
        ],
      },
    ],
  },
};

export const error428: { errors: ConfigErrorBody } = {
  errors: { body: 'If-Match header with the current revision is required' },
};
