import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import WorkflowImportPanel from '../WorkflowImportPanel.vue';
import type { WorkflowImportData } from '@/composables/workflows/useWorkflowImport';

const { mockImportWorkflows } = vi.hoisted(() => ({
  mockImportWorkflows: vi.fn(),
}));

vi.mock('@/composables/workflows/useWorkflowImport', () => ({
  useWorkflowImport: () => ({
    importWorkflows: mockImportWorkflows,
  }),
}));

function makeSummary(overrides = {}) {
  return {
    definitionsCreated: 0,
    definitionsUpdated: 0,
    steps: 0,
    dependencies: 0,
    controlRelationships: 0,
    instances: 0,
    roleAssignments: 0,
    failed: 0,
    skipped: 0,
    ...overrides,
  };
}

function makeResponse(
  overrides: Partial<WorkflowImportData> = {},
): WorkflowImportData {
  return {
    totalFiles: 1,
    successfulFiles: 1,
    failedFiles: 0,
    summary: makeSummary({ definitionsCreated: 1 }),
    results: [
      {
        filename: 'soc2_workflows.json',
        success: true,
        message: 'imported 1 definition(s)',
        summary: makeSummary({ definitionsCreated: 1 }),
      },
    ],
    ...overrides,
  };
}

function mountPanel() {
  return mount(WorkflowImportPanel, {
    global: {
      stubs: {
        PageCard: { template: '<section><slot /></section>' },
        PrimaryButton: {
          props: ['disabled'],
          template:
            '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        SecondaryButton: {
          props: ['disabled'],
          template:
            '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        Button: {
          props: ['disabled'],
          template:
            '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        Badge: { template: '<span><slot /></span>' },
        Message: { template: '<div><slot /></div>' },
      },
    },
  });
}

async function selectFiles(
  wrapper: ReturnType<typeof mountPanel>,
  files: File[],
) {
  const input = wrapper.find<HTMLInputElement>(
    '[data-testid="workflow-file-input"]',
  );
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  });
  await input.trigger('change');
}

describe('WorkflowImportPanel', () => {
  beforeEach(() => {
    mockImportWorkflows.mockReset();
  });

  it('renders the workflow import panel with disabled submit initially', () => {
    const wrapper = mountPanel();

    expect(wrapper.text()).toContain('Import workflows');
    expect(wrapper.text()).toContain(
      'Upload SOC 2 CCF workflow seed JSON files',
    );
    expect(
      wrapper
        .find('[data-testid="workflow-import-submit"]')
        .attributes('disabled'),
    ).toBeDefined();
  });

  it('selects files and submits them to the import composable', async () => {
    mockImportWorkflows.mockResolvedValue(makeResponse());
    const wrapper = mountPanel();
    const files = [
      new File(['[]'], 'one.json', { type: 'application/json' }),
      new File(['[]'], 'two.json', { type: 'application/json' }),
    ];

    await selectFiles(wrapper, files);
    await wrapper
      .find('[data-testid="workflow-import-submit"]')
      .trigger('click');
    await flushPromises();

    expect(mockImportWorkflows).toHaveBeenCalledWith(files);
    expect(wrapper.text()).toContain('Selected 2 file(s)');
  });

  it('blocks submit when more than 10 files are selected', async () => {
    const wrapper = mountPanel();
    const files = Array.from(
      { length: 11 },
      (_, index) =>
        new File(['[]'], `workflow-${index}.json`, {
          type: 'application/json',
        }),
    );

    await selectFiles(wrapper, files);

    expect(wrapper.text()).toContain('Select at most 10 files per import.');
    expect(
      wrapper
        .find('[data-testid="workflow-import-submit"]')
        .attributes('disabled'),
    ).toBeDefined();
    expect(mockImportWorkflows).not.toHaveBeenCalled();
  });

  it('blocks submit when any selected file is over 5 MB', async () => {
    const wrapper = mountPanel();
    const largeFile = new File(
      [new ArrayBuffer(5 * 1024 * 1024 + 1)],
      'large.json',
      { type: 'application/json' },
    );

    await selectFiles(wrapper, [largeFile]);

    expect(wrapper.text()).toContain('Each file must be 5 MB or smaller');
    expect(wrapper.text()).toContain('large.json');
    expect(
      wrapper
        .find('[data-testid="workflow-import-submit"]')
        .attributes('disabled'),
    ).toBeDefined();
  });

  it('renders a 200 all-success aggregate and file row', async () => {
    mockImportWorkflows.mockResolvedValue(
      makeResponse({
        totalFiles: 1,
        successfulFiles: 1,
        failedFiles: 0,
        summary: makeSummary({
          definitionsCreated: 21,
          steps: 105,
          roleAssignments: 21,
        }),
      }),
    );
    const wrapper = mountPanel();

    await selectFiles(wrapper, [
      new File(['[]'], 'soc2_workflows.json', { type: 'application/json' }),
    ]);
    await wrapper
      .find('[data-testid="workflow-import-submit"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('1 of 1 file(s) processed successfully');
    expect(wrapper.text()).toContain('soc2_workflows.json');
    expect(wrapper.text()).toContain('Definitions created');
    expect(wrapper.text()).toContain('21');
    expect(wrapper.text()).toContain('Steps');
    expect(wrapper.text()).toContain('105');
  });

  it('renders a partial success with the failed file visibly marked', async () => {
    mockImportWorkflows.mockResolvedValue(
      makeResponse({
        totalFiles: 2,
        successfulFiles: 1,
        failedFiles: 1,
        results: [
          {
            filename: 'good.json',
            success: true,
            message: 'imported 1 definition(s)',
            summary: makeSummary({ definitionsCreated: 1 }),
          },
          {
            filename: 'broken.json',
            success: false,
            message: 'Failed to parse JSON: invalid character',
            summary: makeSummary(),
          },
        ],
      }),
    );
    const wrapper = mountPanel();

    await selectFiles(wrapper, [
      new File(['[]'], 'good.json', { type: 'application/json' }),
      new File(['}'], 'broken.json', { type: 'application/json' }),
    ]);
    await wrapper
      .find('[data-testid="workflow-import-submit"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('1 of 2 file(s) processed with failures');
    expect(wrapper.text()).toContain('Failed');
    expect(wrapper.text()).toContain('broken.json');
    expect(wrapper.text()).toContain('Failed to parse JSON: invalid character');
  });

  it('shows the message for a processed file whose summary has failed items', async () => {
    mockImportWorkflows.mockResolvedValue(
      makeResponse({
        totalFiles: 1,
        successfulFiles: 1,
        failedFiles: 0,
        summary: makeSummary({ failed: 1 }),
        results: [
          {
            filename: 'mixed.json',
            success: true,
            message: 'imported 2 definition(s), 1 failed',
            summary: makeSummary({ definitionsCreated: 2, failed: 1 }),
          },
        ],
      }),
    );
    const wrapper = mountPanel();

    await selectFiles(wrapper, [
      new File(['[]'], 'mixed.json', { type: 'application/json' }),
    ]);
    await wrapper
      .find('[data-testid="workflow-import-submit"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('1 of 1 file(s) processed with failures');
    expect(wrapper.text()).not.toContain(
      '1 of 1 file(s) processed successfully',
    );
    expect(wrapper.text()).toContain('Processed with failures');
    expect(wrapper.text()).toContain('imported 2 definition(s), 1 failed');
  });

  it('renders page-level api errors and 413 limit messages', async () => {
    mockImportWorkflows.mockRejectedValueOnce(new Error('no files provided'));
    const wrapper = mountPanel();

    await selectFiles(wrapper, [
      new File(['[]'], 'one.json', { type: 'application/json' }),
    ]);
    await wrapper
      .find('[data-testid="workflow-import-submit"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="workflow-error"]').text()).toContain(
      'no files provided',
    );

    mockImportWorkflows.mockRejectedValueOnce(
      new Error('The selected workflow files are too large or too many files.'),
    );
    await wrapper
      .find('[data-testid="workflow-import-submit"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="workflow-error"]').text()).toContain(
      'too large or too many files',
    );
  });

  it('renders re-import updates as updated definitions', async () => {
    mockImportWorkflows.mockResolvedValue(
      makeResponse({
        summary: makeSummary({
          definitionsCreated: 0,
          definitionsUpdated: 21,
        }),
        results: [
          {
            filename: 'soc2_workflows.json',
            success: true,
            message: 'imported 21 definition(s)',
            summary: makeSummary({
              definitionsCreated: 0,
              definitionsUpdated: 21,
            }),
          },
        ],
      }),
    );
    const wrapper = mountPanel();

    await selectFiles(wrapper, [
      new File(['[]'], 'soc2_workflows.json', { type: 'application/json' }),
    ]);
    await wrapper
      .find('[data-testid="workflow-import-submit"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Definitions updated');
    expect(wrapper.text()).toContain('21');
    expect(wrapper.text()).toContain('Definitions created');
    expect(wrapper.text()).toContain('0');
  });
});
