// Shared types of the agent config client (kept apart from useAgentConfigApi.ts so components
// and tests can import them without pulling in the HTTP client).

import type {
  AgentConfigRevision,
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

/** One page of an agent's instances (last seen first); `meta.counts` cover every instance. */
export interface InstancesList {
  items: AgentInstanceSummary[];
  meta: InstancesMeta;
}

/** The instance list's page (1-based, default 1) and size (default and max 25). */
export interface InstancesPageQuery {
  page?: number;
  limit?: number;
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
  listInstances(
    agentId: string,
    query?: InstancesPageQuery,
  ): Promise<InstancesList>;
  getInstance(
    agentId: string,
    instanceId: string,
  ): Promise<AgentInstanceDetail>;
}
