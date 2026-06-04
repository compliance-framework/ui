import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkflowImport } from '../useWorkflowImport';

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    post: mockPost,
  }),
}));

function summary(overrides = {}) {
  return {
    definitions_created: 0,
    definitions_updated: 0,
    steps: 0,
    dependencies: 0,
    control_relationships: 0,
    instances: 0,
    role_assignments: 0,
    failed: 0,
    skipped: 0,
    ...overrides,
  };
}

describe('useWorkflowImport', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('posts selected files as repeated multipart files fields', async () => {
    mockPost.mockResolvedValue({
      data: {
        data: {
          totalFiles: 2,
          successfulFiles: 2,
          failedFiles: 0,
          summary: {
            definitionsCreated: 2,
            definitionsUpdated: 0,
            steps: 4,
            dependencies: 0,
            controlRelationships: 0,
            instances: 2,
            roleAssignments: 2,
            failed: 0,
            skipped: 0,
          },
          results: [],
        },
      },
    });

    const files = [
      new File(['[]'], 'one.json', { type: 'application/json' }),
      new File(['[]'], 'two.json', { type: 'application/json' }),
    ];

    await useWorkflowImport().importWorkflows(files);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/workflows/import',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );

    const formData = mockPost.mock.calls[0][1] as FormData;
    expect(formData.getAll('files')).toEqual(files);
  });

  it('normalizes all-failed 400 import result bodies', async () => {
    mockPost.mockRejectedValue({
      response: {
        status: 400,
        data: {
          data: {
            total_files: 1,
            successful_files: 0,
            failed_files: 1,
            summary: summary(),
            results: [
              {
                filename: 'broken.json',
                success: false,
                message: 'Failed to parse JSON: invalid character',
                summary: summary(),
              },
            ],
          },
        },
      },
      message: 'Request failed',
    });

    const result = await useWorkflowImport().importWorkflows([
      new File(['}'], 'broken.json', { type: 'application/json' }),
    ]);

    expect(result.totalFiles).toBe(1);
    expect(result.successfulFiles).toBe(0);
    expect(result.failedFiles).toBe(1);
    expect(result.results[0].filename).toBe('broken.json');
    expect(result.results[0].success).toBe(false);
  });

  it('maps 413 responses to the upload limit message', async () => {
    mockPost.mockRejectedValue({
      response: { status: 413, data: { message: 'Payload too large' } },
      message: 'Request failed',
    });

    await expect(
      useWorkflowImport().importWorkflows([
        new File(['[]'], 'large.json', { type: 'application/json' }),
      ]),
    ).rejects.toThrow('too large or too many files');
  });

  it('extracts api error messages when no files are processed', async () => {
    mockPost.mockRejectedValue({
      response: { status: 400, data: { message: 'no files provided' } },
      message: 'Request failed',
    });

    await expect(useWorkflowImport().importWorkflows([])).rejects.toThrow(
      'no files provided',
    );
  });
});
