/**
 * Workflow Composables
 *
 * This module exports all composables for managing the CCF Implementation Workflows feature.
 */

export { useWorkflowDefinitions } from './useWorkflowDefinitions';
export { useWorkflowStepDefinitions } from './useWorkflowStepDefinitions';
export { useWorkflowInstances } from './useWorkflowInstances';
export { useWorkflowExecutions } from './useWorkflowExecutions';
export { useStepExecutions } from './useStepExecutions';
export { useControlRelationships } from './useControlRelationships';
export { useMyAssignments } from './useMyAssignments';
export { useUserSearch } from './useUserSearch';

// Re-export types for convenience
export type {
  // Workflow Definition types
  WorkflowDefinition,
  WorkflowDefinitionCreate,
  WorkflowDefinitionUpdate,
  WorkflowDefinitionStatus,
  WorkflowDefinitionListParams,

  // Step Definition types
  StepDefinition,
  StepDefinitionCreate,
  StepDefinitionUpdate,
  StepDependency,

  // Workflow Instance types
  WorkflowInstance,
  WorkflowInstanceCreate,
  WorkflowInstanceUpdate,
  WorkflowInstanceStatus,
  WorkflowInstanceListParams,

  // Workflow Execution types
  WorkflowExecution,
  WorkflowExecutionCreate,
  WorkflowExecutionStatus,
  WorkflowExecutionStatusDetails,
  WorkflowExecutionMetrics,
  WorkflowExecutionListParams,
  StepExecutionMetric,

  // Step Execution types
  StepExecution,
  StepExecutionStatus,
  StepExecutionStatusUpdate,
  StepExecutionEvidence,
  StepExecutionEvidenceSubmit,
  StepExecutionFail,
  StepReassignmentRequest,
  StepReassignmentHistory,
  StepExecutionListParams,

  // Control Relationship types
  ControlRelationship,
  ControlRelationshipCreate,
  ControlRelationshipListParams,

  // Role Assignment types
  RoleAssignment,
  RoleAssignmentCreate,
  RoleAssignmentUpdate,
  RoleAssignmentListParams,

  // Common types
  CadenceType,
  EvidenceType,
} from '@/types/workflows';
