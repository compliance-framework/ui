import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
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
  return mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(WorkflowImportPanel)),
    }),
  );
}

async function selectFiles(
  wrapper: ReturnType<typeof mountPanel>,
  files: File[],
) {
  const input = wrapper.find<HTMLInputElement>('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  });
  await input.trigger('change');
}

const submit = async (wrapper: ReturnType<typeof mountPanel>) => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('WorkflowImportPanel', () => {
  beforeEach(() => {
    mockImportWorkflows.mockReset();
  });

  it('asks for a file before importing', async () => {
    const wrapper = mountPanel();
    expect(wrapper.text()).toContain('SOC 2 CCF workflow seed files');
    await submit(wrapper);
    expect(wrapper.text()).toContain('Choose at least one workflow JSON file.');
    expect(mockImportWorkflows).not.toHaveBeenCalled();
  });

  it('selects files and submits them to the import composable', async () => {
    mockImportWorkflows.mockResolvedValue(makeResponse());
    const wrapper = mountPanel();
    const files = [
      new File(['[]'], 'one.json', { type: 'application/json' }),
      new File(['[]'], 'two.json', { type: 'application/json' }),
    ];

    await selectFiles(wrapper, files);
    await submit(wrapper);

    expect(mockImportWorkflows).toHaveBeenCalledWith(files);
    expect(wrapper.text()).toContain('one.json');
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

    expect(wrapper.text()).toContain('Choose at most 10 files per import.');
    await submit(wrapper);
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
    await submit(wrapper);
    expect(mockImportWorkflows).not.toHaveBeenCalled();
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
    await submit(wrapper);

    expect(wrapper.text()).toContain('1 of 1 file processed');
    expect(wrapper.text()).toContain('1 definition created');
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
    await submit(wrapper);

    expect(wrapper.text()).toContain('1 of 2 files processed with failures');
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
        summary: makeSummary({ definitionsCreated: 2, failed: 1 }),
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
    await submit(wrapper);

    expect(wrapper.text()).toContain('1 of 1 file processed with failures');
    expect(wrapper.text()).toContain('2 definitions created, 1 failed');
    expect(wrapper.text()).toContain('imported 2 definition(s), 1 failed');
  });

  it('renders a parsed file with only failed definitions as failed', async () => {
    mockImportWorkflows.mockResolvedValue(
      makeResponse({
        totalFiles: 1,
        successfulFiles: 1,
        failedFiles: 0,
        summary: makeSummary({ failed: 1 }),
        results: [
          {
            filename: 'deleted-definition.json',
            success: true,
            message:
              'Workflow definition was previously deleted and cannot be re-imported.',
            summary: makeSummary({ failed: 1 }),
          },
        ],
      }),
    );
    const wrapper = mountPanel();

    await selectFiles(wrapper, [
      new File(['[]'], 'deleted-definition.json', {
        type: 'application/json',
      }),
    ]);
    await submit(wrapper);

    expect(wrapper.text()).toContain(
      'Import failed; no workflow records were imported',
    );
    expect(wrapper.text()).not.toContain('1 of 1 file processed');
    expect(wrapper.text()).not.toContain('1 of 1 file processed with failures');
    expect(wrapper.text()).toContain('Failed');
    expect(wrapper.text()).toContain('deleted-definition.json');
    expect(wrapper.text()).toContain(
      'Workflow definition was previously deleted and cannot be re-imported.',
    );
  });

  it('renders page-level api errors and 413 limit messages', async () => {
    mockImportWorkflows.mockRejectedValueOnce(new Error('no files provided'));
    const wrapper = mountPanel();

    await selectFiles(wrapper, [
      new File(['[]'], 'one.json', { type: 'application/json' }),
    ]);
    await submit(wrapper);

    expect(wrapper.text()).toContain('no files provided');

    mockImportWorkflows.mockRejectedValueOnce(
      new Error('The selected workflow files are too large or too many files.'),
    );
    await submit(wrapper);

    expect(wrapper.text()).toContain('too large or too many files');
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
    await submit(wrapper);

    expect(wrapper.text()).toContain('Definitions updated');
    expect(wrapper.text()).toContain('21');
    expect(wrapper.text()).toContain('Definitions created');
    expect(wrapper.text()).toContain('0');
  });
});
