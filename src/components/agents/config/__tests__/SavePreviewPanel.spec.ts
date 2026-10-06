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
import PrimeDialog from 'primevue/dialog';
import SavePreviewPanel from '../editor/SavePreviewPanel.vue';
import DiffRows from '../editor/DiffRows.vue';
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

  it('R59 file warnings do not block', () => {
    const p = clean([
      inst({
        warnings: [{ path: '/plugins/y/schedule', message: 'file cron' }],
      }),
    ]);
    const w = mountPanel(p);
    expect(saveButton(w).attributes('disabled')).toBeUndefined();
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

  it('disables Back while saving', () => {
    const w = mountPanel(clean([inst({})]), { saving: true });
    expect(
      w.find('[data-test="review-back"]').attributes('disabled'),
    ).toBeDefined();
    expect(saveButton(w).attributes('disabled')).toBeDefined();
  });

  it('reports its nested diff dialog opening and closing (Esc gate)', async () => {
    const w = mountPanel(clean([inst({})]));
    const row = { path: '/x', kind: 'changed', before: 'a', after: 'b' };
    w.findComponent(DiffRows).vm.$emit('open-diff', row);
    await w.vm.$nextTick();
    expect(w.emitted('childOpen')).toEqual([[true]]);
    const diff = w
      .findAllComponents(PrimeDialog)
      .find((d) => d.props('header') === '/x')!;
    diff.vm.$emit('update:visible', false);
    await w.vm.$nextTick();
    expect(w.emitted('childOpen')).toEqual([[true], [false]]);
  });
});

describe('review rows for policy_data arrays', () => {
  it('shows a whole-array write as element-level rows', () => {
    const w = mountPanel(clean([inst({})]), {
      currentOverlay: {
        plugins: { 'local-ssh': { policy_data: { users: ['a', 'b'] } } },
      },
      draftOverlay: {
        plugins: { 'local-ssh': { policy_data: { users: ['a', 'B', 'c'] } } },
      },
    });
    const paths = w
      .findAll('[data-test="diff-rows"] tr[data-path]')
      .map((r) => r.attributes('data-path'));
    expect(paths).toContain('/plugins/local-ssh/policy_data/users/1');
    expect(paths).toContain('/plugins/local-ssh/policy_data/users/2');
    expect(paths).not.toContain('/plugins/local-ssh/policy_data/users');
  });
});

describe('instances the preview did not include', () => {
  // What the API sends when it bounds the preview (configPreviewResponse).
  const bounded: ConfigPreview = {
    ...clean([inst({})]),
    omittedInstances: 60,
  };
  const omittedId = 'ffffffff-0000-4000-8000-0000000000ff';

  it('says how many instances were left out of the preview', () => {
    const w = mountPanel(bounded, { draftOverlay: { verbosity: 2 } });
    const summary = w.find('[data-test="apply-summary"]').text();
    expect(summary).toContain('1 of 1 instances will apply');
    expect(w.find('[data-test="omitted-instances"]').text()).toContain(
      '60 more instances were not previewed; a save still validates against them',
    );
  });

  it('says nothing when the preview covers every instance', () => {
    const w = mountPanel(clean([inst({})]));
    expect(w.find('[data-test="apply-summary"]').exists()).toBe(true);
    expect(w.find('[data-test="omitted-instances"]').exists()).toBe(false);
  });

  it('shows a 422 error for an instance that is not in the preview', () => {
    const w = mountPanel(bounded, {
      draftOverlay: { verbosity: 2 },
      saveErrors: {
        body: 'invalid',
        instances: [
          {
            'instance-id': omittedId,
            hostname: 'ip-omitted',
            errors: [{ path: '/verbosity', message: 'BOOM-not-allowed' }],
          },
          {
            'instance-id': instanceIds.a,
            hostname: 'ip-a',
            errors: [{ path: '/verbosity', message: 'in-its-panel' }],
          },
        ],
      },
    });
    // Save is blocked by that error...
    expect(saveButton(w).attributes('disabled')).toBeDefined();
    // ...so the user must be able to see it, with the host it is about.
    const other = w.find(`[data-test="other-instance-${omittedId}"]`);
    expect(other.exists()).toBe(true);
    expect(other.text()).toContain('ip-omitted');
    expect(other.text()).toContain('BOOM-not-allowed');
    // A previewed instance's errors stay in its own panel only.
    expect(w.findAll('[data-test="other-instance-error"]')).toHaveLength(1);
    expect(
      w.find(`[data-test="instance-panel-${instanceIds.a}"]`).text(),
    ).toContain('in-its-panel');
  });
});
