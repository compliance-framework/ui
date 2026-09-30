import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type {
  AgentInstanceSummary,
  ConfigPreview,
  PolicyError,
} from '@/types/agent-config';
import { instancesMixed } from '@/composables/agent-config/fixtures';
import { moduleDiagnostics } from '../editor/policyDiagnostics';
import { ADMIN, globalWith, piniaWith } from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));

import RegoModuleEditor from '../editor/RegoModuleEditor.vue';

const pe = (over: Partial<PolicyError>): PolicyError => ({
  bundle: 'b',
  path: 'a.rego',
  row: 1,
  col: 1,
  message: 'm',
  severity: 'error',
  ...over,
});
const preview = (errors: PolicyError[]): ConfigPreview => ({
  desiredRevision: 7,
  standalone: false,
  overlayErrors: [],
  policyErrors: errors,
  instances: [],
});
const rejected: AgentInstanceSummary = {
  ...instancesMixed.items[0],
  status: 'rejected',
  reason: 'policy-errors',
  attemptedRevision: 7,
  policyErrors: [pe({ message: 'from report', row: 3 })],
};

describe('moduleDiagnostics (U4.5)', () => {
  const report = (instance: AgentInstanceSummary | null, unchanged = true) => ({
    instance,
    desiredRevision: 7,
    unchanged: () => unchanged,
  });

  it('filters by bundle and module-relative path and dedupes', () => {
    const d = moduleDiagnostics(
      'b',
      'a.rego',
      preview([
        pe({}),
        pe({ bundle: 'other' }),
        pe({ path: 'x.rego' }),
        pe({}),
      ]),
      [pe({}), pe({ message: 'from save', row: 2 })],
      report(null),
    );
    expect(d.map((x) => x.message)).toEqual(['m', 'from save']);
  });

  it('uses report errors only for a policy-errors rejection of the desired revision with unchanged text', () => {
    expect(
      moduleDiagnostics('b', 'a.rego', null, [], report(rejected)).map(
        (x) => x.message,
      ),
    ).toEqual(['from report']);
    // Stale after an edit.
    expect(
      moduleDiagnostics('b', 'a.rego', null, [], report(rejected, false)),
    ).toEqual([]);
    // An older attempt, or a different reason, is ignored.
    expect(
      moduleDiagnostics(
        'b',
        'a.rego',
        null,
        [],
        report({ ...rejected, attemptedRevision: 6 }),
      ),
    ).toEqual([]);
    expect(
      moduleDiagnostics(
        'b',
        'a.rego',
        null,
        [],
        report({ ...rejected, reason: 'unsafe-changes' }),
      ),
    ).toEqual([]);
  });
});

describe('RegoModuleEditor', () => {
  it('maps positioned problems to editor diagnostics (errors and warnings) and lists the rest', () => {
    const wrapper = mount(RegoModuleEditor, {
      props: {
        bundle: 'b',
        path: 'a.rego',
        modelValue: 'package a\n',
        diagnostics: [
          pe({ row: 1, col: 2, message: 'err', severity: 'error' }),
          pe({ row: 2, message: 'warn', severity: 'warning' }),
          pe({
            row: undefined,
            col: undefined,
            message: 'vendor test failed',
            severity: 'warning',
          }),
        ],
      },
      global: globalWith(piniaWith(ADMIN)),
    });
    const diags = JSON.parse(
      wrapper.find('.code-editor-stub').attributes('data-diagnostics')!,
    );
    expect(diags).toEqual([
      { row: 1, col: 2, message: 'err', severity: 'error' },
      { row: 2, col: 1, message: 'warn', severity: 'warning' },
    ]);
    expect(wrapper.find('.code-editor-stub').attributes('data-language')).toBe(
      'rego',
    );
    expect(wrapper.text()).toContain('vendor test failed');
    expect(wrapper.find('[data-test="module-size"]').text()).toContain('10 B');
  });
});
