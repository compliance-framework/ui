import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Ref } from 'vue';
import EvidencePlaybackSections from '../EvidencePlaybackSections.vue';
import type { EvidencePlayback } from '@/types/evidence-playback';

const { refs, execute, artifactGet, toastAdd } = vi.hoisted(() => ({
  refs: {} as {
    playback: Ref<EvidencePlayback | undefined>;
    loading: Ref<boolean>;
    error: Ref<unknown>;
  },
  execute: vi.fn(),
  artifactGet: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  refs.playback = ref(undefined);
  refs.loading = ref(false);
  refs.error = ref(null);
  return {
    useDataApi: () => ({
      data: refs.playback,
      isLoading: refs.loading,
      error: refs.error,
      execute,
    }),
    useAuthenticatedInstance: () => ({ get: artifactGet }),
  };
});

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAdd }),
}));

// Lines 7 to 10 are the violation rule.
const policySource = `package compliance_framework.ports

import data.ccf_libs.helpers

title := "Only approved ports are open"

violation contains {"id": "unapproved-port", "title": "Port 8080 is not approved"} if {
	some port in input.open_ports
	not helpers.approved(port)
}`;

function playbackFixture(
  overrides: Partial<EvidencePlayback> = {},
): EvidencePlayback {
  return {
    available: true,
    package: 'compliance_framework.ports',
    evaluatedAt: '2026-09-30T10:00:00Z',
    artifacts: {
      bundle: {
        digest: 'sha256:' + 'b'.repeat(64),
        mediaType: 'application/vnd.ccf.policy-bundle.v1+tar',
        sizeBytes: 4096,
      },
      input: {
        digest: 'sha256:' + 'i'.repeat(64),
        mediaType: 'application/json',
        sizeBytes: 2048,
      },
      policyData: {
        digest: 'sha256:' + 'd'.repeat(64),
        mediaType: 'application/json',
        sizeBytes: 15,
      },
    },
    policyFiles: [
      {
        path: 'lib/helpers.rego',
        source: 'package ccf_libs.helpers',
        containsPackage: false,
      },
      { path: 'policy.rego', source: policySource, containsPackage: true },
    ],
    policyDataJson: '{\n  "extra": true\n}',
    bundleDataJson: '{\n  "config": {}\n}',
    inputJson: '{\n  "open_ports": [22, 8080]\n}',
    inputTruncated: false,
    recorded: { status: 'not-satisfied', violationIds: ['unapproved-port'] },
    replay: {
      status: 'not-satisfied',
      title: 'Only approved ports are open',
      violations: [
        {
          id: 'unapproved-port',
          title: 'Port 8080 is not approved',
          description: 'Close it',
          remarks: 'Opened for a migration',
          rules: [{ file: 'policy.rego', startLine: 7, endLine: 10 }],
        },
      ],
      rawJson: '{\n  "violation": []\n}',
    },
    comparison: {
      statusMatches: true,
      missingViolationIds: [],
      newViolationIds: [],
      unidentifiedViolations: 0,
    },
    prints: ['policy.rego:7: port 8080'],
    errors: [],
    ...overrides,
  };
}

function satisfiedFixture(
  overrides: Partial<EvidencePlayback> = {},
): EvidencePlayback {
  const fixture = playbackFixture();
  return playbackFixture({
    recorded: { status: 'satisfied', violationIds: [] },
    replay: { ...fixture.replay!, status: 'satisfied', violations: [] },
    ...overrides,
  });
}

function mountSections(extraProps: { policySource?: string } = {}) {
  return mount(EvidencePlaybackSections, {
    props: { evidenceId: 'evidence-1', ...extraProps },
    attachTo: document.body,
    global: {
      stubs: {
        PageCard: { template: '<section><slot /></section>' },
        Message: { template: '<div class="message"><slot /></div>' },
        SecondaryButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
}

const sections = ['violations', 'policy', 'config', 'input', 'output'];

function toggle(wrapper: VueWrapper, section: string) {
  return wrapper.find(`[data-test="playback-${section}-toggle"]`);
}

function isOpen(wrapper: VueWrapper, section: string) {
  return toggle(wrapper, section).attributes('aria-expanded') === 'true';
}

async function expand(wrapper: VueWrapper, section: string) {
  await toggle(wrapper, section).trigger('click');
}

function highlightedLines(wrapper: VueWrapper, file = 'policy.rego') {
  const region = wrapper.find(`[aria-label="Source of ${file}"]`);
  return region
    .findAll('[data-violation-line="true"]')
    .map((line) => Number(line.find('span').text()));
}

describe('EvidencePlaybackSections', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;
  let wrapper: VueWrapper | undefined;

  beforeEach(() => {
    refs.playback.value = undefined;
    refs.loading.value = false;
    refs.error.value = null;
    execute.mockReset().mockImplementation(async () => {
      refs.playback.value = pending;
    });
    artifactGet.mockReset();
    toastAdd.mockReset();
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView =
      scrollIntoView as unknown as Element['scrollIntoView'];
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  // What the next load returns. Set before mounting.
  let pending: EvidencePlayback | undefined;

  async function load(
    fixture: EvidencePlayback | undefined,
    extraProps: { policySource?: string } = {},
  ) {
    pending = fixture;
    wrapper = mountSections(extraProps);
    await flushPromises();
    return wrapper;
  }

  it('loads the policy evaluation for the evidence', async () => {
    await load(satisfiedFixture());
    expect(execute).toHaveBeenCalledWith('/api/evidence/evidence-1/playback');
  });

  it('starts with every section collapsed when nothing was violated', async () => {
    const w = await load(satisfiedFixture());

    expect(sections.filter((section) => isOpen(w, section))).toEqual([]);
    expect(w.text()).not.toContain('package compliance_framework.ports');
    expect(w.text()).not.toContain('"extra": true');
    expect(w.text()).not.toContain('open_ports');
    expect(w.find('[data-test="playback-violations-summary"]').text()).toBe(
      'None',
    );
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('expands and collapses a section when its header is clicked', async () => {
    const w = await load(satisfiedFixture());

    await expand(w, 'config');
    expect(isOpen(w, 'config')).toBe(true);
    expect(w.find('[data-test="playback-config"]').text()).toContain(
      '"extra": true',
    );

    await expand(w, 'input');
    expect(w.find('[data-test="playback-input"]').text()).toContain('8080');

    await expand(w, 'output');
    expect(w.find('[data-test="playback-output"]').text()).toContain(
      'policy.rego:7: port 8080',
    );

    await expand(w, 'violations');
    expect(w.find('[data-test="playback-violations"]').text()).toContain(
      'No violations: the policy was satisfied',
    );

    await expand(w, 'config');
    expect(isOpen(w, 'config')).toBe(false);
    expect(w.text()).not.toContain('"extra": true');
  });

  it('opens the violations in full and highlights the rule behind them', async () => {
    const w = await load(playbackFixture());

    expect(isOpen(w, 'violations')).toBe(true);
    expect(isOpen(w, 'policy')).toBe(true);
    expect(sections.filter((section) => isOpen(w, section))).toEqual([
      'violations',
      'policy',
    ]);

    const violation = w.find('[data-test="playback-violation"]').text();
    expect(violation).toContain('Port 8080 is not approved');
    expect(violation).toContain('unapproved-port');
    expect(violation).toContain('Close it');
    expect(violation).toContain('Opened for a migration');
    expect(violation).toContain('recorded');
    expect(w.find('[data-test="playback-show-rule"]').text()).toBe(
      'policy.rego, lines 7–10',
    );
    expect(w.find('[data-test="playback-violations-summary"]').text()).toBe(
      '1 violation',
    );

    expect(highlightedLines(w)).toEqual([7, 8, 9, 10]);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    const scrolledTo = scrollIntoView.mock.contexts[0] as HTMLElement;
    expect(scrolledTo.dataset.rule).toBe('policy.rego:7');
  });

  it('shows only the policy that produced the evidence', async () => {
    const w = await load(playbackFixture());
    const policy = w.find('[data-test="playback-policy"]');

    expect(
      policy.findAll('[data-test="playback-policy-path"]').map((p) => p.text()),
    ).toEqual(['policy.rego']);
    expect(policy.text()).not.toContain('package ccf_libs.helpers');
  });

  it('scrolls to a rule when the user asks to see it', async () => {
    const w = await load(playbackFixture());
    await expand(w, 'policy');
    expect(isOpen(w, 'policy')).toBe(false);
    scrollIntoView.mockClear();

    await w.find('[data-test="playback-show-rule"]').trigger('click');
    await flushPromises();

    expect(isOpen(w, 'policy')).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect((scrollIntoView.mock.contexts[0] as HTMLElement).dataset.rule).toBe(
      'policy.rego:7',
    );
  });

  it('shows another file of the package when a rule behind a violation is in it', async () => {
    const fixture = playbackFixture();
    const w = await load(
      playbackFixture({
        policyFiles: [
          ...fixture.policyFiles,
          {
            path: 'extra.rego',
            source:
              'package compliance_framework.ports\n\nviolation contains {"id": "ssh"} if input.ssh',
            containsPackage: false,
          },
        ],
        replay: {
          ...fixture.replay!,
          violations: [
            ...fixture.replay!.violations,
            {
              id: 'ssh',
              rules: [{ file: 'extra.rego', startLine: 3, endLine: 3 }],
            },
          ],
        },
      }),
    );

    expect(
      w.findAll('[data-test="playback-policy-path"]').map((p) => p.text()),
    ).toEqual(['policy.rego', 'extra.rego']);
    expect(highlightedLines(w, 'extra.rego')).toEqual([3]);
    expect(w.text()).toContain('extra.rego, line 3');
  });

  it('says when the rule behind a violation could not be located', async () => {
    const fixture = playbackFixture();
    const w = await load(
      playbackFixture({
        replay: {
          ...fixture.replay!,
          violations: [{ id: 'unapproved-port' }],
        },
      }),
    );

    expect(w.find('[data-test="playback-violation"]').text()).toContain(
      'Could not be located',
    );
    expect(highlightedLines(w)).toEqual([]);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('flags a replay that differs from the recorded result', async () => {
    const w = await load(
      playbackFixture({
        recorded: { status: 'satisfied', violationIds: ['retired-check'] },
        comparison: {
          statusMatches: false,
          missingViolationIds: ['retired-check'],
          newViolationIds: ['unapproved-port'],
          unidentifiedViolations: 0,
        },
      }),
    );

    const differs = w.find('[data-test="playback-differs"]').text();
    expect(differs).toContain(
      'recorded as satisfied, but replays as not-satisfied',
    );
    expect(differs).toContain('Recorded, but not found by the replay:');
    expect(differs).toContain('retired-check');
    expect(differs).toContain('Found by the replay, but not recorded:');
    expect(w.find('[data-test="playback-violation"]').text()).toContain('new');
  });

  it('explains when the evidence cannot be played back', async () => {
    const w = await load(
      playbackFixture({
        available: false,
        reason: 'This evidence was recorded without policy artifacts.',
        replay: null,
        comparison: null,
      }),
    );

    expect(w.find('[data-test="playback-unavailable"]').text()).toContain(
      'recorded without policy artifacts',
    );
    expect(w.find('[data-test="playback-violations"]').exists()).toBe(false);
  });

  it('reports why the replay could not run', async () => {
    const w = await load(
      playbackFixture({
        replay: null,
        comparison: null,
        errors: [
          {
            code: 'rego_type_error',
            message: 'undefined function http.send',
            file: 'policy.rego',
            row: 5,
          },
        ],
      }),
    );

    expect(isOpen(w, 'output')).toBe(false);
    expect(w.find('[data-test="playback-output"]').text()).toContain('1 error');
    await expand(w, 'output');
    const errors = w.find('[data-test="playback-errors"]').text();
    expect(errors).toContain('rego_type_error');
    expect(errors).toContain('policy.rego:5');

    await expand(w, 'violations');
    expect(w.find('[data-test="playback-violations"]').text()).toContain(
      'Recorded violation IDs: unapproved-port',
    );
  });

  it('says when the policy file for the evidence cannot be identified', async () => {
    const w = await load(
      satisfiedFixture({
        policyFiles: playbackFixture().policyFiles.map((file) => ({
          ...file,
          containsPackage: false,
        })),
      }),
    );
    await expand(w, 'policy');

    const policy = w.find('[data-test="playback-policy"]').text();
    expect(policy).toContain(
      'The policy file for compliance_framework.ports could not be identified',
    );
    expect(policy).not.toContain('package ccf_libs.helpers');
  });

  it('reports the policy source the agent recorded', async () => {
    const source =
      'ghcr.io/compliance-framework/plugin-apt-versions-policies:v0.4.0';
    const w = await load(satisfiedFixture(), { policySource: source });
    await expand(w, 'policy');

    expect(w.find('[data-test="playback-policy-source"]').text()).toBe(source);
  });

  it('says when the policy source was not recorded', async () => {
    const w = await load(satisfiedFixture());
    await expand(w, 'policy');

    expect(w.find('[data-test="playback-policy-source"]').text()).toBe(
      'Not recorded',
    );
  });

  it('says when no policy data was configured', async () => {
    const w = await load(
      satisfiedFixture({
        policyDataJson: null,
        artifacts: { ...playbackFixture().artifacts!, policyData: null },
      }),
    );

    expect(w.find('[data-test="playback-config"]').text()).toContain('None');
    await expand(w, 'config');
    expect(w.find('[data-test="playback-config"]').text()).toContain(
      'No policy data was configured',
    );
  });

  it('downloads the full input from its artifact when the shown input is truncated', async () => {
    artifactGet.mockResolvedValue({ data: '{"open_ports":[22,8080]}' });
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:input');
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const w = await load(
      satisfiedFixture({ inputTruncated: true, inputJson: '{"open' }),
    );

    expect(w.find('[data-test="playback-input"]').text()).toContain('2.0 KiB');
    await expand(w, 'input');
    expect(w.find('[data-test="playback-input-truncated"]').exists()).toBe(
      true,
    );
    await w.find('[data-test="playback-download-input"]').trigger('click');
    await flushPromises();

    expect(artifactGet).toHaveBeenCalledWith(
      `/api/artifacts/sha256:${'i'.repeat(64)}`,
      { responseType: 'text' },
    );
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(blob);
    });
    expect(text).toBe('{"open_ports":[22,8080]}');
    expect(click).toHaveBeenCalled();

    createObjectURL.mockRestore();
    click.mockRestore();
  });

  it('shows an error when the policy evaluation cannot be loaded', async () => {
    execute.mockImplementation(async () => {
      refs.error.value = { message: 'Request failed with status code 500' };
      throw new Error('500');
    });
    wrapper = mountSections();
    await flushPromises();

    expect(wrapper.text()).toContain('Could not load the policy evaluation');
    expect(wrapper.text()).toContain('status code 500');
  });
});
