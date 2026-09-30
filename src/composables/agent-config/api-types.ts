// Shared types of the agent config client (kept apart from useAgentConfigApi.ts so the
// fixture implementation can import them without a module cycle).

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
  /** True when this client serves in-memory fixtures (LLD U0.6). */
  readonly fixtures: boolean;
}
