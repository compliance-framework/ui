import { describe, expect, it } from 'vitest';
import {
  APPLY_REASON_LABELS,
  CHANGE_REASON_LABELS,
  FIELD_ERROR_CODE_LABELS,
  WILL_APPLY_REASON_LABELS,
  labelFor,
} from '../constants';
import {
  permissionTooltip,
  RESOURCES,
  ACTIONS,
  MANIFEST_ROLES,
} from '@/constants/permissions';

// Vocabulary from compliance-framework/api pkg/agentconfig (classify.go, wire.go, errors.go).
const CHANGE_REASONS = [
  'locked-key',
  'logging',
  'data-only',
  'reduces-scope',
  'already-used',
  'trusted-source',
  'untrusted-source',
  'local-source-not-allowed',
  'new-local-source',
  'overridable-config-flag',
  'config-not-overridable',
  'new-env-reference',
  'forbidden-env-reference',
];
const APPLY_REASONS = [
  'unsafe-changes',
  'forbidden-changes',
  'invalid-config',
  'invalid-type',
  'unknown-field',
  'download-failed',
  'env-missing',
  'unsupported-by-agent',
  'cache-corrupt',
  'internal',
];
const FIELD_CODES = [
  'unknown-field',
  'invalid-type',
  'invalid-value',
  'locked-key',
  'size',
  'pattern',
  'cron',
  'duration',
  'source',
  'env-location',
  'forbidden-env',
  'env-missing',
  'masked-value',
  'required',
  'parse',
];
const WILL_APPLY = [
  'mode-off',
  'mode-report',
  'unsafe-changes',
  'forbidden-changes',
  'invalid-config',
];

describe('agent config labels', () => {
  it.each([
    ['change reasons', CHANGE_REASONS, CHANGE_REASON_LABELS],
    ['apply reasons', APPLY_REASONS, APPLY_REASON_LABELS],
    ['field error codes', FIELD_CODES, FIELD_ERROR_CODE_LABELS],
    ['will-apply reasons', WILL_APPLY, WILL_APPLY_REASON_LABELS],
  ])('labels exactly the API %s', (_, codes, labels) => {
    for (const code of codes) expect(labelFor(labels, code)).toBeTruthy();
    expect(Object.keys(labels).sort()).toEqual([...codes].sort());
  });

  it('unknown codes have no label (rendered verbatim)', () => {
    expect(labelFor(APPLY_REASON_LABELS, 'brand-new-code')).toBeNull();
    expect(labelFor(APPLY_REASON_LABELS, null)).toBeNull();
  });

  it('agent permission constants', () => {
    expect(permissionTooltip(RESOURCES.AGENT, ACTIONS.CONFIGURE)).toBe(
      "You don't have permission to configure agents.",
    );
    expect(MANIFEST_ROLES.map((r) => r.name)).not.toContain('policy-author');
    expect(Object.values(ACTIONS)).not.toContain('configure-policy');
  });
});
