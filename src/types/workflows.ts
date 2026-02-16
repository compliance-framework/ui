/**
 * TypeScript types for CCF Implementation Workflows
 *
 * These types correspond to the backend API entities for the workflow system.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type WorkflowDefinitionStatus = 'draft' | 'published' | 'deprecated';

export type WorkflowInstanceStatus = 'active' | 'inactive';

export type WorkflowExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type StepExecutionStatus =
  | 'pending'
  | 'blocked'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped';

export type CadenceType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'on_demand'
  | `cron:${string}`;

export type EvidenceType =
  | 'document'
  | 'attestation'
  | 'screenshot'
  | 'link'
  | 'text'
  | 'automatic';

// ============================================================================
// Workflow Definition
// ============================================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: WorkflowDefinitionStatus;
  suggestedCadence?: CadenceType;
  evidenceRequired: string;
  createdAt: string;
  updatedAt: string;
  stepCount?: number;
  steps?: StepDefinition[];
}

export interface WorkflowDefinitionCreate {
  name: string;
  description?: string;
  version?: string;
  suggestedCadence?: CadenceType;
  evidenceRequired?: string;
}

export interface WorkflowDefinitionUpdate {
  name?: string;
  description?: string;
  version?: string;
  status?: WorkflowDefinitionStatus;
  suggestedCadence?: CadenceType;
  evidenceRequired?: string;
}

// ============================================================================
// Step Definition
// ============================================================================

export interface StepDependency {
  id: string;
  workflowStepDefinitionId: string;
  dependsOnStepId: string;
}

export interface StepDefinition {
  id: string;
  workflowDefinitionId: string;
  name: string;
  description?: string;
  responsibleRole?: string;
  evidenceRequired: EvidenceRequirement[];
  estimatedDurationMinutes?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  dependsOn?: StepDependency[];
}

export interface StepDefinitionCreate {
  workflowDefinitionId: string;
  name: string;
  description?: string;
  responsibleRole?: string;
  evidenceRequired?: EvidenceRequirement[];
  estimatedDurationMinutes?: number;
  order?: number;
  dependsOn?: string[];
}

export interface StepDefinitionUpdate {
  name?: string;
  description?: string;
  responsibleRole?: string;
  evidenceRequired?: EvidenceRequirement[];
  estimatedDurationMinutes?: number;
  order?: number;
  dependsOn?: string[];
}

// ============================================================================
// Workflow Instance
// ============================================================================

export interface WorkflowInstance {
  id: string;
  workflowDefinitionId: string;
  workflowDefinition?: WorkflowDefinition;
  name: string;
  description?: string;
  systemId?: string;
  controlId?: string;
  cadence: CadenceType;
  status: WorkflowInstanceStatus;
  isActive?: boolean; // Backend field for active status (camelCase)
  lastExecutionId?: string;
  lastExecutionAt?: string;
  nextScheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstanceCreate {
  workflowDefinitionId: string;
  name: string;
  description?: string;
  systemId?: string;
  controlId?: string;
  cadence: CadenceType;
}

export interface WorkflowInstanceUpdate {
  name?: string;
  description?: string;
  cadence?: CadenceType;
}

// ============================================================================
// Workflow Execution
// ============================================================================

export interface WorkflowExecution {
  id: string;
  workflowInstanceId: string;
  workflowInstance?: WorkflowInstance;
  status: WorkflowExecutionStatus;
  triggeredBy: string;
  triggeredAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  dueDate?: string;
  parentExecutionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionCreate {
  workflowInstanceId: string;
  triggeredBy?: string; // 'manual', 'scheduled', etc.
  triggeredById?: string; // User ID who triggered it
}

export interface WorkflowExecutionStatusDetails {
  executionId: string;
  status: WorkflowExecutionStatus;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  pendingSteps: number;
  blockedSteps: number;
  inProgressSteps: number;
}

export interface WorkflowExecutionMetrics {
  executionId: string;
  totalDurationMinutes?: number;
  averageStepDurationMinutes?: number;
  stepMetrics?: StepExecutionMetric[];
}

export interface StepExecutionMetric {
  stepDefinitionId: string;
  stepName: string;
  durationMinutes?: number;
  startedAt?: string;
  completedAt?: string;
}

// ============================================================================
// Step Execution
// ============================================================================

export interface StepExecution {
  id: string;
  workflowExecutionId: string;
  workflowStepDefinitionId: string;
  workflowStepDefinition?: StepDefinition;
  // Legacy aliases for backward compatibility
  stepDefinitionId?: string;
  stepDefinition?: StepDefinition;
  status: StepExecutionStatus;
  assigneeId?: string;
  assignedToType?: string;
  assignedToId?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
  evidence?: StepExecutionEvidence[];
  reassignmentHistory?: StepReassignmentHistory[];
  // Preloaded relationship (from API)
  workflowExecution?: WorkflowExecution;
}

export interface StepExecutionStatusUpdate {
  status: StepExecutionStatus;
}

// New transition request matching the updated API
export interface StepTransitionRequest {
  status: 'in_progress' | 'completed';
  evidence?: StepExecutionEvidenceSubmit[];
  notes?: string;
  userId: string;
  userType: 'user' | 'group' | 'email';
}

export interface CanTransitionResponse {
  canTransition: boolean;
  userId: string;
  userType: string;
}

export interface EvidenceRequirement {
  type: EvidenceType;
  required: boolean;
  description?: string;
}

export interface StepExecutionEvidence {
  id: string;
  stepExecutionId: string;
  evidenceType: EvidenceType;
  fileName?: string;
  fileUrl?: string;
  attestationText?: string;
  linkUrl?: string;
  submittedBy: string;
  submittedAt: string;
}

export interface StepExecutionEvidenceSubmit {
  evidenceType: EvidenceType;
  file?: File;
  fileName?: string;
  fileData?: string; // base64 encoded file data
  fileSize?: number;
  attestationText?: string;
  linkUrl?: string;
  metadata?: string; // Additional metadata for the evidence
}

export interface StepExecutionFail {
  reason: string;
}

export interface StepReassignmentRequest {
  assignedToType: 'email';
  assignedToId: string;
  reason?: string;
}

export interface StepReassignmentHistory {
  id: string;
  stepExecutionId: string;
  workflowExecutionId: string;
  previousAssignedToType?: string;
  previousAssignedToId?: string;
  newAssignedToType: string;
  newAssignedToId: string;
  reason?: string;
  reassignedByUserId?: string;
  reassignedByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Control Relationships
// ============================================================================

export interface ControlRelationship {
  id: string;
  workflowDefinitionId: string;
  catalogId: string;
  controlId: string;
  controlTitle?: string;
  catalogTitle?: string;
  controlSource?: string;
  createdAt: string;
}

export interface ControlRelationshipCreate {
  workflowDefinitionId: string;
  catalogId: string;
  controlId: string;
}

// ============================================================================
// Role Assignments
// ============================================================================

export interface RoleAssignment {
  id: string;
  workflowInstanceId: string;
  role: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  assignedToId?: string;
  assignedToType?: string;
  roleName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleAssignmentCreate {
  workflowInstanceId: string;
  roleName: string;
  assignedToType: string;
  assignedToId: string;
}

export interface RoleAssignmentUpdate {
  userId: string;
}

// ============================================================================
// List/Filter Parameters
// ============================================================================

export interface WorkflowDefinitionListParams {
  status?: WorkflowDefinitionStatus;
  search?: string;
}

export interface WorkflowInstanceListParams {
  workflowDefinitionId?: string;
  systemId?: string;
  controlId?: string;
  status?: WorkflowInstanceStatus;
}

export interface WorkflowExecutionListParams {
  workflowInstanceId?: string;
  status?: WorkflowExecutionStatus;
}

export interface StepExecutionListParams {
  workflowExecutionId?: string;
  status?: StepExecutionStatus;
}

export interface ControlRelationshipListParams {
  workflowDefinitionId?: string;
  catalogId?: string;
  controlId?: string;
}

export interface RoleAssignmentListParams {
  workflowInstanceId?: string;
  role?: string;
  userId?: string;
}
