import { useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail, getErrorStatus } from '@/utils/httpErrors';

const WORKFLOW_IMPORT_URL = '/api/workflows/import';

export interface WorkflowImportSummary {
  definitionsCreated: number;
  definitionsUpdated: number;
  steps: number;
  dependencies: number;
  controlRelationships: number;
  instances: number;
  roleAssignments: number;
  failed: number;
  skipped: number;
}

export interface WorkflowImportFileResult {
  filename: string;
  success: boolean;
  message: string;
  summary: WorkflowImportSummary;
}

export interface WorkflowImportData {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  summary: WorkflowImportSummary;
  results: WorkflowImportFileResult[];
}

type WorkflowImportResponse = {
  data?: unknown;
};

function hasWorkflowImportData(body: unknown): body is WorkflowImportResponse {
  return (
    !!body &&
    typeof body === 'object' &&
    'data' in body &&
    !!(body as WorkflowImportResponse).data &&
    Array.isArray(
      ((body as WorkflowImportResponse).data as { results?: unknown[] })
        ?.results,
    )
  );
}

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function normalizeSummary(raw: Record<string, unknown>): WorkflowImportSummary {
  return {
    definitionsCreated: numberValue(
      raw.definitionsCreated ?? raw.definitions_created,
    ),
    definitionsUpdated: numberValue(
      raw.definitionsUpdated ?? raw.definitions_updated,
    ),
    steps: numberValue(raw.steps),
    dependencies: numberValue(raw.dependencies),
    controlRelationships: numberValue(
      raw.controlRelationships ?? raw.control_relationships,
    ),
    instances: numberValue(raw.instances),
    roleAssignments: numberValue(raw.roleAssignments ?? raw.role_assignments),
    failed: numberValue(raw.failed),
    skipped: numberValue(raw.skipped),
  };
}

function normalizeImportData(raw: unknown): WorkflowImportData {
  const data = raw as Record<string, unknown>;
  const results = Array.isArray(data.results) ? data.results : [];

  return {
    totalFiles: numberValue(data.totalFiles ?? data.total_files),
    successfulFiles: numberValue(data.successfulFiles ?? data.successful_files),
    failedFiles: numberValue(data.failedFiles ?? data.failed_files),
    summary: normalizeSummary((data.summary as Record<string, unknown>) ?? {}),
    results: results.map((result) => {
      const rawResult = result as Record<string, unknown>;
      return {
        filename: String(rawResult.filename ?? ''),
        success: rawResult.success === true,
        message: String(rawResult.message ?? ''),
        summary: normalizeSummary(
          (rawResult.summary as Record<string, unknown>) ?? {},
        ),
      };
    }),
  };
}

export function useWorkflowImport() {
  const axios = useAuthenticatedInstance();

  async function importWorkflows(files: File[]): Promise<WorkflowImportData> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post<WorkflowImportResponse>(
        WORKFLOW_IMPORT_URL,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      if (hasWorkflowImportData(response.data)) {
        return normalizeImportData(response.data.data);
      }

      throw new Error('No workflow files were processed.');
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      const responseData = (
        error as { response?: { data?: WorkflowImportResponse } }
      ).response?.data;

      if (status === 400 && hasWorkflowImportData(responseData)) {
        return normalizeImportData(responseData.data);
      }

      if (status === 413) {
        throw new Error(
          'The selected workflow files are too large or too many files were selected. Upload at most 10 files, 5 MB each.',
        );
      }

      const detail = await getErrorDetail(
        error,
        'Failed to import workflow files.',
      );
      throw new Error(detail);
    }
  }

  return {
    importWorkflows,
  };
}
