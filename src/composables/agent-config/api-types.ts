// Shared types of the agent config client (kept apart from useAgentConfigApi.ts so components
// and tests can import them without pulling in the HTTP client).

import type {
  AgentConfigRevision,
  ArtifactFileList,
  ArtifactFileSource,
  AgentConfigRevisionSummary,
  AgentInstanceDetail,
  AgentInstanceSummary,
  ConfigErrorBody,
  ConfigPreview,
  InstancesMeta,
  OverlayDoc,
  SaveConfigRequest,
  SaveResult,
} from '@/types/agent-config';

export type AgentConfigErrorKind =
  | 'conflict'
  | 'invalid'
  | 'forbidden'
  | 'unsupported'
  | 'too-large'
  | 'network'
  | 'other';

export class AgentConfigApiError extends Error {
  readonly status?: number;
  readonly kind: AgentConfigErrorKind;
  readonly body?: ConfigErrorBody;
  readonly currentRevision?: number;

  constructor(init: {
    kind: AgentConfigErrorKind;
    message: string;
    status?: number;
    body?: ConfigErrorBody;
    currentRevision?: number;
  }) {
    super(init.message);
    this.name = 'AgentConfigApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.body = init.body;
    this.currentRevision = init.currentRevision;
  }
}

export function isAgentConfigApiError(e: unknown): e is AgentConfigApiError {
  return e instanceof AgentConfigApiError;
}

export interface RevisionsPage {
  items: AgentConfigRevisionSummary[];
  total: number;
  totalPages: number;
}

export interface InstancesList {
  items: AgentInstanceSummary[];
  meta: InstancesMeta;
}

export interface AgentConfigApi {
  getConfig(agentId: string): Promise<AgentConfigRevision>;
  putConfig(
    agentId: string,
    body: SaveConfigRequest,
    ifMatchRevision: number,
  ): Promise<SaveResult>;
  preview(
    agentId: string,
    overlay: OverlayDoc,
    signal?: AbortSignal,
  ): Promise<ConfigPreview>;
  listRevisions(
    agentId: string,
    page: number,
    limit: number,
  ): Promise<RevisionsPage>;
  getRevision(agentId: string, rev: number): Promise<AgentConfigRevision>;
  revert(
    agentId: string,
    rev: number,
    ifMatchRevision: number,
    comment?: string,
  ): Promise<SaveResult>;
  listInstances(agentId: string): Promise<InstancesList>;
  getInstance(
    agentId: string,
    instanceId: string,
  ): Promise<AgentInstanceDetail>;
  /** R62: files of a policy bundle artifact (vendor sources reported by agents). */
  listArtifactFiles(digest: string): Promise<ArtifactFileList>;
  /** R62: one file's source; 404 = unknown digest or path, 415/422 = not readable as text. */
  getArtifactFile(digest: string, path: string): Promise<ArtifactFileSource>;
}
