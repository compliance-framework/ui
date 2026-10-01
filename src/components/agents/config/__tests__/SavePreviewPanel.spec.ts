import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { ConfigPreview, InstancePreview } from '@/types/agent-config';
import {
  detailFor,
  error422,
  instanceIds,
  instancesMixed,
  previewMixed,
  previewStandalone,
} from '@/composables/agent-config/__tests__/fixtures';
import SavePreviewPanel from '../editor/SavePreviewPanel.vue';
import { safetyForRow } from '../editor/review';
import { globalWith, piniaWith, ADMIN } from './helpers';

// The async CodeMirror wrappers are replaced by synchronous stubs.
vi.mock('@/components/code-editor', () => import('./codeEditorMock'));

const details = new Map(
  instancesMixed.items
    .filter((i) => i.reportedAt)
    .map((i) => [i.instanceId, detailFor(i, {})]),
);

function mountPanel(
  preview: ConfigPreview,
  extra: Record<string, unknown> = {},
) {
  return mount(SavePreviewPanel, {
    props: {
      preview,
      instanceDetails: details,
      currentOverlay: {},
      draftOverlay: { plugins: { 'local-ssh': { schedule: '@hourly' } } },
      baseRevision: 7,
      ...extra,
    },
    global: globalWith(piniaWith(ADMIN)),
  });
}

const inst = (over: Partial<InstancePreview>): InstancePreview => ({
  instanceId: instanceIds.a,
  hostname: 'ip-a',
  mode: 'apply_safe',
  stale: false,
  validated: true,
  effective: null,
  errors: [],
  warnings: [],
  changes: [],
  willApply: true,
  ...over,
});
const clean = (instances: InstancePreview[]): ConfigPreview => ({
  desiredRevision: 7,
  standalone: false,
  overlayErrors: [],
  policyErrors: [],
  instances,
});
const saveButton = (w: ReturnType<typeof mount>) =>
  w.find('[data-test="save-config"]');

describe('SavePreviewPanel (U2.5)', () => {
  it('summarises will-apply with willApplyReason labels and offending changes', () => {
    const w = mountPanel(previewMixed);
    expect(w.find('[data-test="apply-summary"]').text()).toContain(
      '0 of 3 instances will apply',
    );
    const lines = w.findAll('[data-test="not-applying"]').map((l) => l.text());
    expect(lines[0]).toContain('Needs apply_all for some changes');
    expect(lines[0]).toContain('/plugins/local-ssh/source');
    expect(lines[0]).toContain('Untrusted source');
    expect(lines[2]).toContain('Report-only mode');
  });

  it('tags rows by the most specific change prefix', () => {
    const changes = [
      { path: '/plugins/a', safety: 'unsafe' as const, reason: 'x' },
      {
        path: '/plugins/a/schedule',
        safety: 'safe' as const,
        reason: 'logging',
      },
    ];
    expect(safetyForRow('/plugins/a/schedule', changes)).toBe('safe');
    expect(safetyForRow('/plugins/a/config/k', changes)).toBe('unsafe');
    expect(safetyForRow('/verbosity', changes)).toBe('no-effect');
    expect(
      safetyForRow('/plugins', [
        { path: '/plugins/b/source', safety: 'forbidden', reason: 'y' },
      ]),
    ).toBe('forbidden');
  });

  it('blocks saving on overlay errors / error policy errors / validated instance errors only', () => {
    // previewMixed: overlay error + validated ip-d error → blocked.
    expect(
      saveButton(mountPanel(previewMixed)).attributes('disabled'),
    ).toBeDefined();

    // Errors only on a non-validated instance → warnings, not blocking.
    const nonValidated = clean([
      inst({
        validated: false,
        mode: 'report',
        errors: [{ path: '/x', message: 'bad' }],
      }),
    ]);
    const w = mountPanel(nonValidated);
    expect(saveButton(w).attributes('disabled')).toBeUndefined();
    expect(w.find('[data-test="instance-error-nonblocking"]').text()).toContain(
      'Not validated on save',
    );

    const validated = clean([
      inst({ errors: [{ path: '/x', message: 'bad' }] }),
    ]);
    expect(
      saveButton(mountPanel(validated)).attributes('disabled'),
    ).toBeDefined();
  });

  it('warnings (policy warnings, R59 file warnings) do not block', () => {
    const p = clean([
      inst({
        warnings: [{ path: '/plugins/y/schedule', message: 'file cron' }],
      }),
    ]);
    p.policyErrors = [
      { bundle: 'b', path: 'a.rego', message: 'warn', severity: 'warning' },
    ];
    const w = mountPanel(p);
    expect(saveButton(w).attributes('disabled')).toBeUndefined();
    expect(w.find('[data-test="policy-warning"]').exists()).toBe(true);
    expect(w.find('[data-test="instance-warnings"]').text()).toContain(
      'does not block',
    );
    expect(saveButton(w).text()).toBe('Save as r8');
  });

  it('shows the standalone banner and an overlay diff', () => {
    const w = mountPanel(previewStandalone);
    expect(w.find('[data-test="standalone"]').exists()).toBe(true);
    expect(w.find('[data-test="apply-summary"]').exists()).toBe(false);
    expect(w.find('[data-test="diff-rows"]').text()).toContain('/plugins');
  });

  it('diffs merge(base, current) vs merge(base, draft) per instance with safety tags', () => {
    const p = clean([
      inst({
        changes: [
          {
            path: '/plugins/local-ssh/schedule',
            safety: 'safe',
            reason: 'logging',
          },
        ],
      }),
    ]);
    const w = mountPanel(p);
    const row = w.find('[data-path="/plugins/local-ssh/schedule"]');
    expect(row.text()).toContain('*/5 * * * *');
    expect(row.text()).toContain('@hourly');
    expect(row.find('[data-safety="safe"]').exists()).toBe(true);
  });

  it('falls back to the change list when the base is unavailable', () => {
    const p = clean([
      inst({
        instanceId: 'unknown-id',
        changes: [{ path: '/v', safety: 'safe', reason: 'logging' }],
      }),
    ]);
    expect(mountPanel(p).find('[data-test="changes-fallback"]').exists()).toBe(
      true,
    );
  });

  it('treats errors as blocking on non-stale instances when validated is absent (older API)', () => {
    const p = clean([
      inst({ validated: undefined, errors: [{ path: '/x', message: 'bad' }] }),
    ]);
    const w = mountPanel(p);
    expect(saveButton(w).attributes('disabled')).toBeDefined();
    expect(w.find('[data-test="legacy-validation"]').exists()).toBe(true);
  });

  it('maps a 422 body onto the lists and instance panels', () => {
    const w = mountPanel(clean([inst({})]), { saveErrors: error422.errors });
    expect(w.find('[data-test="overlay-error"]').text()).toContain('/api');
    expect(w.find('[data-test="policy-error"]').text()).toContain(
      'max_auth_tries.rego:3:1',
    );
    expect(
      w.find(`[data-test="instance-panel-${instanceIds.a}"]`).text(),
    ).toContain('invalid cron');
    expect(saveButton(w).attributes('disabled')).toBeDefined();
  });

  it('emits save with the comment', async () => {
    const w = mountPanel(clean([inst({})]));
    await w.find('[data-test="save-comment"]').setValue('why');
    await saveButton(w).trigger('click');
    expect(w.emitted('save')?.[0]).toEqual(['why']);
  });
});
