import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { Ref } from 'vue';
import EvidencePlaybackTab from '../EvidencePlaybackTab.vue';
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
        sizeBytes: 26,
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
      {
        path: 'policy.rego',
        source: 'package compliance_framework.ports',
        containsPackage: true,
      },
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

function mountTab() {
  return mount(EvidencePlaybackTab, {
    props: { evidenceId: 'evidence-1' },
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

describe('EvidencePlaybackTab', () => {
  beforeEach(() => {
    refs.playback.value = playbackFixture();
    refs.loading.value = false;
    refs.error.value = null;
    execute.mockReset().mockResolvedValue(undefined);
    artifactGet.mockReset();
    toastAdd.mockReset();
  });

  it('loads the playback for the evidence', async () => {
    mountTab();
    await flushPromises();
    expect(execute).toHaveBeenCalledWith('/api/evidence/evidence-1/playback');
  });

  it('shows a matching replay with what the evaluation was made of', async () => {
    const wrapper = mountTab();
    await flushPromises();

    expect(wrapper.find('[data-test="playback-matches"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="playback-differs"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="playback-result"]').text()).toContain(
      'compliance_framework.ports',
    );

    const violations = wrapper.find('[data-test="playback-violations"]').text();
    expect(violations).toContain('unapproved-port');
    expect(violations).toContain('Port 8080 is not approved');
    expect(violations).toContain('recorded');

    const policy = wrapper.find('[data-test="playback-policy"]');
    expect(policy.find('[data-test="playback-policy-path"]').text()).toBe(
      'policy.rego',
    );
    expect(policy.text()).toContain('package compliance_framework.ports');
    expect(policy.text()).not.toContain('lib/helpers.rego');
    expect(policy.text()).not.toContain('package ccf_libs.helpers');

    expect(wrapper.find('[data-test="playback-config"]').text()).toContain(
      '"extra": true',
    );
    expect(wrapper.find('[data-test="playback-input"]').text()).toContain(
      '8080',
    );
    expect(wrapper.find('[data-test="playback-output"]').text()).toContain(
      'policy.rego:7: port 8080',
    );
  });

  it('flags a replay that differs from the recorded result', async () => {
    refs.playback.value = playbackFixture({
      recorded: { status: 'satisfied', violationIds: ['retired-check'] },
      comparison: {
        statusMatches: false,
        missingViolationIds: ['retired-check'],
        newViolationIds: ['unapproved-port'],
        unidentifiedViolations: 1,
      },
    });
    const wrapper = mountTab();
    await flushPromises();

    const differs = wrapper.find('[data-test="playback-differs"]');
    expect(differs.exists()).toBe(true);
    expect(differs.text()).toContain(
      'recorded as satisfied, but replays as not-satisfied',
    );
    expect(differs.text()).toContain(
      'Recorded, but not found by the replay: retired-check',
    );
    expect(differs.text()).toContain(
      'Found by the replay, but not recorded: unapproved-port',
    );
    expect(wrapper.text()).toContain('1 replayed violation has no ID');
    expect(wrapper.find('[data-test="playback-violations"]').text()).toContain(
      'new',
    );
  });

  it('explains when the evidence cannot be played back', async () => {
    refs.playback.value = playbackFixture({
      available: false,
      reason: 'This evidence was recorded without policy artifacts.',
      replay: null,
      comparison: null,
    });
    const wrapper = mountTab();
    await flushPromises();

    expect(wrapper.find('[data-test="playback-unavailable"]').text()).toContain(
      'recorded without policy artifacts',
    );
    expect(wrapper.find('[data-test="playback-result"]').exists()).toBe(false);
  });

  it('shows why the replay could not run, and still shows the artifacts', async () => {
    refs.playback.value = playbackFixture({
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
    });
    const wrapper = mountTab();
    await flushPromises();

    const errors = wrapper.find('[data-test="playback-errors"]').text();
    expect(errors).toContain('rego_type_error');
    expect(errors).toContain('policy.rego:5');
    expect(wrapper.find('[data-test="playback-violations"]').text()).toContain(
      'Recorded violation IDs: unapproved-port',
    );
    expect(wrapper.find('[data-test="playback-policy"]').exists()).toBe(true);
  });

  it('says when the policy file for the evidence cannot be identified', async () => {
    refs.playback.value = playbackFixture({
      policyFiles: playbackFixture().policyFiles.map((file) => ({
        ...file,
        containsPackage: false,
      })),
      replay: null,
      comparison: null,
    });
    const wrapper = mountTab();
    await flushPromises();

    const policy = wrapper.find('[data-test="playback-policy"]');
    expect(policy.text()).toContain(
      'The policy file for compliance_framework.ports could not be identified',
    );
    expect(policy.text()).not.toContain('package compliance_framework.ports');
    expect(policy.text()).not.toContain('package ccf_libs.helpers');
  });

  it('says when no policy data was configured', async () => {
    refs.playback.value = playbackFixture({
      policyDataJson: null,
      artifacts: { ...playbackFixture().artifacts!, policyData: null },
    });
    const wrapper = mountTab();
    await flushPromises();
    expect(wrapper.find('[data-test="playback-config"]').text()).toContain(
      'No policy data was configured',
    );
  });

  it('downloads the full input from its artifact when the shown input is truncated', async () => {
    refs.playback.value = playbackFixture({
      inputTruncated: true,
      inputJson: '{"open',
    });
    artifactGet.mockResolvedValue({ data: '{"open_ports":[22,8080]}' });
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:input');
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const wrapper = mountTab();
    await flushPromises();

    expect(
      wrapper.find('[data-test="playback-input-truncated"]').exists(),
    ).toBe(true);
    await wrapper
      .find('[data-test="playback-download-input"]')
      .trigger('click');
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

  it('shows an error when the playback cannot be loaded', async () => {
    refs.playback.value = undefined;
    refs.error.value = { message: 'Request failed with status code 500' };
    const wrapper = mountTab();
    await flushPromises();
    expect(wrapper.text()).toContain('Could not load the playback');
    expect(wrapper.text()).toContain('status code 500');
  });
});
