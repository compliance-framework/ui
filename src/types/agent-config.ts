// Agent remote configuration: wire types for the admin config routes
// (compliance-framework/api internal/api/handler/agent_config.go, API LLD A1/A4.4).
//
// Two casing regimes live side by side here, on purpose:
//   * Envelope and report fields are kebab-case on the wire and camelCased by the axios
//     interceptor, like every other API response (so they are camelCase below).
//   * The config DOCUMENTS (`overlay`, `base`, `effective`, `remote-config`) are opaque and
//     returned verbatim in snake_case (R15). They are protected from camelCasing with stop
//     paths (useAgentConfigApi STOP_PATHS), so their TS types keep the file's snake_case keys.

// ---- Opaque config documents (snake_case, verbatim; API A1.2) ----

export type AgentConfigMode = 'off' | 'report' | 'apply_safe' | 'apply_all';

export interface PluginDoc {
  enabled?: boolean | null;
  /** R56: File value = key omitted; Auto = null (delete → agent auto-detects); 0 is never sent. */
  protocol_version?: 1 | 2 | null;
  schedule?: string | null;
  source?: string | null;
  policies?: string[] | null;
  /** Strings only (R27). */
  config?: Record<string, string | null> | null;
  labels?: Record<string, string | null> | null;
  policy_data?: Record<string, unknown> | null;
  policy_behavior?: Record<string, string[] | null> | null;
}

/** Normalized `remote_config` file block (R10, R29 defaults). */
export interface RemoteConfigDoc {
  mode?: AgentConfigMode;
  /** Default "60s". */
  poll_interval?: string;
  /** Default []. */
  trusted_sources?: string[];
  /** Default []. */
  overridable_config_flags?: string[];
  /** Default false. */
  allow_local_sources?: boolean;
}

/** Base / effective config (redacted, unresolved `${env:}` placeholders). */
export interface ConfigDoc {
  daemon?: boolean;
  verbosity?: number;
  api?: { url?: string; auth?: { client_id?: string; client_secret?: string } };
  remote_config?: RemoteConfigDoc;
  agent_evidence?: {
    enabled?: boolean;
    emit_on_run_completion?: boolean;
    interval?: string;
  } | null;
  plugins?: Record<string, PluginDoc | null>;
}

/** JSON Merge Patch (RFC 7396) over ConfigDoc minus the locked keys. `null` deletes. */
export type OverlayDoc = Omit<ConfigDoc, 'api' | 'daemon' | 'remote_config'> &
  Record<string, unknown>;

export const LOCKED_KEYS = ['api', 'daemon', 'remote_config'] as const;

/** R25: the API's MaskedValue. Rejected on write. */
export const REDACTED_MASK = '••••';

// ---- Revisions (API agentConfigRevisionResponse) ----

export interface AgentConfigRevision {
  agentId: string;
  /** 0 = never saved. */
  revision: number;
  /** Opaque (stop path). Omitted in lists. */
  overlay?: OverlayDoc;
  overlaySize: number;
  comment: string | null;
  /** null for revision 0. */
  createdBy: string | null;
  /** null for revision 0. */
  createdAt: string | null;
  revertOf: number | null;
}

export type AgentConfigRevisionSummary = Omit<AgentConfigRevision, 'overlay'>;

/** 201 → created: true; 200 (semantically unchanged, R14) → created: false. */
export interface SaveResult {
  revision: AgentConfigRevision;
  created: boolean;
}

// ---- Classification and errors (API A1.4, A1.6) ----

export type ChangeSafety = 'safe' | 'unsafe' | 'forbidden';

/** A classified change; `path` is an RFC 6901 pointer (R5). */
export interface ConfigChange {
  path: string;
  safety: ChangeSafety;
  reason: string;
  value?: string;
}

/** `path` is an RFC 6901 pointer ("" = root); `code` per R43. */
export interface FieldError {
  path: string;
  message: string;
  code?: string;
}

// ---- Instances (API agentInstanceSummary / agentInstanceDetail, R10) ----

export type InstanceStatus =
  | 'applied'
  | 'rejected'
  | 'failed'
  | 'pending'
  | 'not-applicable'
  | 'unknown';

export type SyncStatus =
  | 'in-sync'
  | 'out-of-sync'
  | 'not-applicable'
  | 'unknown';

export interface PolicyFileReport {
  path: string;
  sha256: string;
  package?: string;
}

export interface PolicyBundleReport {
  /** OCI ref or local path. */
  source: string;
  /** "tree:sha256:…" (R10). */
  digest: string;
  files: PolicyFileReport[];
  /**
   * The uploaded artifact of this tree ("sha256:<hex>" of the canonical tar). Empty/absent
   * when the upload failed or the agent is older; kept when `files` was dropped to fit the
   * report.
   */
  artifactDigest?: string;
}

/** R76: one plugin of an instance and the agent library its binary was built with. */
export interface PluginReport {
  /** The plugin's key under `plugins`. */
  name: string;
  /** The configured source. */
  source?: string;
  /** github.com/compliance-framework/agent version from the binary's build info ('' = unknown). */
  libVersion?: string;
}

export interface AgentInstanceSummary {
  /** Agent-side instance UUID (path param of the detail route). */
  instanceId: string;
  hostname: string | null;
  agentVersion: string | null;
  /** '' = never reported. */
  mode: AgentConfigMode | '';
  firstSeenAt: string;
  lastSeenAt: string;
  reportedAt: string | null;
  /** Server-computed (R14); the UI never recomputes it. */
  stale: boolean;
  /** null = file only. */
  appliedRevision: number | null;
  attemptedRevision: number | null;
  /** pending/unknown are server-derived (R10). */
  status: InstanceStatus;
  /** Apply reason vocabulary (constants.ts APPLY_REASON_LABELS). */
  reason: string | null;
  error: string | null;
  syncStatus: SyncStatus;
  effectiveDigest: string | null;
  heartbeatConfigRevision: number | null;
  /** Heartbeat digest ≠ reported digest. */
  reportStale: boolean;
  /** snake_case inside (stop path). Absent when never reported. */
  remoteConfig?: RemoteConfigDoc | null;
  unsafe: ConfigChange[];
  /** R10; false = one-shot run (pruned after 24 h, R37). */
  daemon?: boolean | null;
  /** R10; the report was cut to fit 4 MiB. */
  truncated?: boolean;
  /** R41: tolerated file-origin problems (e.g. a bad cron → plugin skipped). */
  warnings?: FieldError[];
  /** R76: the reported plugins and their agent library. Empty/absent from older agents. */
  plugins?: PluginReport[] | null;
}

export interface AgentInstanceDetail extends AgentInstanceSummary {
  /** Opaque (stop path). */
  base: ConfigDoc | null;
  /** Opaque (stop path). */
  effective: ConfigDoc | null;
  policyBundles: PolicyBundleReport[];
}

export interface InstanceCounts {
  total: number;
  fresh: number;
  stale: number;
  inSync: number;
  outOfSync: number;
  /** API extra (not in the LLD): server-derived pending instances. */
  pending?: number;
  rejected: number;
  failed: number;
  /** API extra (not in the LLD): heartbeat-only instances. */
  unknown?: number;
}

export interface InstancesMeta {
  desiredRevision: number;
  counts: InstanceCounts;
}

// ---- Preview (API configPreviewResponse) ----

/** agentconfig.DiffEntry; unused by the UI (R16), values opaque (stop paths). */
export interface PreviewDiffEntry {
  path: string;
  op: 'add' | 'remove' | 'replace' | string;
  from?: unknown;
  to?: unknown;
}

export type WillApplyReason =
  | 'mode-off'
  | 'mode-report'
  | 'unsafe-changes'
  | 'forbidden-changes'
  | 'invalid-config';

export interface InstancePreview {
  instanceId: string;
  hostname: string | null;
  mode: AgentConfigMode | '';
  stale: boolean;
  /** R48: this instance's base is in the PUT validation set; only its errors block a save. */
  validated?: boolean;
  /** Opaque (stop path) = Redact(Merge(base, overlay)). */
  effective: ConfigDoc | null;
  /** Optional; the UI does not use it (R16). */
  diffVsCurrent?: PreviewDiffEntry[];
  /** R59: errors the overlay introduces. */
  errors: FieldError[];
  /** R59: problems already in the host file (Merge(base, {})). Never block. */
  warnings?: FieldError[];
  /** Classified against the instance BASE. */
  changes: ConfigChange[];
  willApply: boolean;
  willApplyReason?: WillApplyReason | string;
}

export interface ConfigPreview {
  desiredRevision: number;
  /** R14: no base available; only overlay-level checks ran. */
  standalone: boolean;
  overlayErrors: FieldError[];
  instances: InstancePreview[];
}

export interface SaveConfigRequest {
  overlay: OverlayDoc;
  comment?: string;
}

/** One validated instance in a 422 body (raw kebab keys). */
export interface ConfigErrorInstance {
  'instance-id': string;
  hostname?: string | null;
  errors: FieldError[];
  /** R59: file-origin problems; never block. */
  warnings?: FieldError[];
}

/**
 * Error bodies are NOT camelCased: the camelcase interceptor only runs on success
 * (composables/axios/index.ts). Keys are read raw (R6).
 */
export interface ConfigErrorBody {
  body: string;
  overlay?: FieldError[];
  instances?: ConfigErrorInstance[];
  'current-revision'?: number;
}
