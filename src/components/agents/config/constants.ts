// Display vocabulary for agent remote configuration. Codes come from the API
// (pkg/agentconfig: classify.go, wire.go, errors.go). An unknown code renders verbatim in
// monospace, so a new server code never breaks the UI.

export const VERBOSITY_OPTIONS = [
  { value: 0, label: 'Info' },
  { value: 1, label: 'Debug' },
  { value: 2, label: 'Trace' },
] as const;

export function verbosityLabel(v: unknown): string {
  const opt = VERBOSITY_OPTIONS.find((o) => o.value === v);
  if (opt) return opt.label;
  return v === undefined || v === null
    ? 'Info (default)'
    : `Custom (${String(v)})`;
}

// ---- Mode texts (design §6.1) ----

export const MODE_TEXT = {
  report: 'This agent is not accepting remote configuration.',
  apply_safe:
    "Accepts policy, schedule and flag changes. New sources need `apply_all` or a `trusted_sources` entry. Plugin config keys need a matching `overridable_config_flags` entry in the agent's file.",
  apply_all: 'Applies all changes except locked keys.',
} as const;

export const NOT_REPORTED_TEXT =
  'No configuration reported yet. The agent may be offline, running a version without remote configuration support, or have `remote_config.mode: off`.';

export const LOCKED_LEGEND =
  '`api`, `daemon` and `remote_config` are set locally on the agent host and cannot be changed from CCF.';

/** R57: overlays are readable by every agent:read holder. */
export const OVERLAY_SECRETS_NOTICE =
  'Overlays are stored as written and are readable by everyone who can view agents. Do not type secrets here: use a ${env:NAME} placeholder in a plugin config value, which the agent resolves on its own host.';

// ---- Classify reasons (API A1.6, classify.go) ----

export const CHANGE_REASON_LABELS: Record<string, string> = {
  'locked-key': 'Locked key (set locally only)',
  logging: 'Logging setting',
  'data-only': 'Data only',
  'reduces-scope': 'Reduces scope',
  'already-used': 'Source already used by this agent',
  'trusted-source': 'Trusted source',
  'untrusted-source': 'Untrusted source',
  'local-source-not-allowed': 'Local sources are not allowed on this host',
  'new-local-source': 'New local source',
  'overridable-config-flag': 'Overridable config key',
  'config-not-overridable': 'Config key not overridable',
  'new-env-reference': 'Reads a new host environment variable',
  'forbidden-env-reference': 'Forbidden environment variable',
};

// ---- Apply reasons (R10, R42, wire.go Reasons) ----

export const APPLY_REASON_LABELS: Record<string, string> = {
  'unsafe-changes':
    'The revision contains changes this host only applies in apply_all',
  'forbidden-changes': 'The revision contains a forbidden change',
  'invalid-config':
    'The config was invalid; the agent kept its last-known-good configuration',
  'download-failed': 'A plugin or policy bundle could not be downloaded',
  'env-missing':
    'A ${env:…} placeholder names a variable that is not set on the host',
  'cache-corrupt': "The agent's local config cache was corrupt",
  internal: 'Internal agent error',
  'unknown-field': 'The overlay has a field this agent does not know',
  'invalid-type': 'A value has the wrong type',
  'unsupported-by-agent':
    'The overlay uses a feature this agent version does not support',
};

// ---- FieldError codes (R43, errors.go) ----

export const FIELD_ERROR_CODE_LABELS: Record<string, string> = {
  'unknown-field': 'Unknown field',
  'invalid-type': 'Invalid type',
  'invalid-value': 'Invalid value',
  'locked-key': 'Locked key',
  size: 'Too large',
  pattern: 'Invalid name',
  cron: 'Invalid schedule',
  duration: 'Invalid duration',
  source: 'Invalid source',
  'env-location': 'Placeholder not allowed here',
  'forbidden-env': 'Forbidden variable',
  'env-missing': 'Variable not set',
  'masked-value': 'Masked value',
  required: 'Required',
  parse: 'Parse error',
};

// ---- Preview will-apply reasons ----

export const WILL_APPLY_REASON_LABELS: Record<string, string> = {
  'mode-off': 'Remote configuration is off on this host',
  'mode-report':
    'Report-only mode: this host does not apply remote configuration',
  'unsafe-changes': 'Needs apply_all for some changes',
  'forbidden-changes': 'Contains a forbidden change (rejected in every mode)',
  'invalid-config': 'The resulting config is invalid for this host',
};

/** Label for a code, or null when unknown (callers then render the raw code in monospace). */
export function labelFor(
  labels: Record<string, string>,
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  return Object.prototype.hasOwnProperty.call(labels, code)
    ? labels[code]
    : null;
}
