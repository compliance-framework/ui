export interface Agent {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  lastAuthenticatedAt?: string | null;
  serviceAccountKeyCount: number;
}

export interface AgentServiceAccountKey {
  id: string;
  createdAt: string;
  updatedAt: string;
  name?: string | null;
  clientId: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  neverExpires: boolean;
  revokedAt?: string | null;
}

export interface CreatedAgentServiceAccountKey extends AgentServiceAccountKey {
  clientSecret: string;
}

export interface UpsertAgentRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateAgentServiceAccountKeyRequest {
  name?: string;
  expiresAt?: string;
  neverExpires: boolean;
}
