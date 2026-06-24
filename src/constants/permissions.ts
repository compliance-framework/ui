// Authorization vocabulary mirrored from the API manifest
// (compliance-framework/api: internal/authz/manifest.yaml, BCH-1314).
//
// These are the resource and action keys returned verbatim by GET /api/me/permissions
// (BCH-1318). The keys are DATA, not API response fields, so they are NOT camelCased by the
// axios interceptor and must match the manifest exactly (e.g. `poam_item`,
// `component-definition`, `dashboard-suggestion`). Use these consts everywhere instead of
// string literals so call sites are typo-safe and greppable.

export const RESOURCES = {
  // Telemetry / ingest
  EVIDENCE: 'evidence',
  HEARTBEAT: 'heartbeat',

  // OSCAL authoring documents
  CATALOG: 'catalog',
  PROFILE: 'profile',
  COMPONENT_DEFINITION: 'component-definition',
  SSP: 'ssp',
  ASSESSMENT_PLAN: 'assessment-plan',
  ASSESSMENT_RESULTS: 'assessment-results',
  POAM_OSCAL: 'poam_oscal',
  INVENTORY: 'inventory',
  PARTY: 'party',
  ROLE: 'role',
  ACTIVITY: 'activity',

  // SSP-scoped register items
  RISK: 'risk',
  POAM_ITEM: 'poam_item',

  // Dashboard / config
  FILTER: 'filter',
  DASHBOARD_SUGGESTION: 'dashboard-suggestion',

  // Workflow engine
  WORKFLOW_DEFINITION: 'workflow-definition',
  WORKFLOW_STEP_DEFINITION: 'workflow-step-definition',
  WORKFLOW_INSTANCE: 'workflow-instance',
  WORKFLOW_EXECUTION: 'workflow-execution',
  STEP_EXECUTION: 'step-execution',
  ROLE_ASSIGNMENT: 'role-assignment',
  CONTROL_RELATIONSHIP: 'control-relationship',

  // Platform / admin
  ADMIN: 'admin',
  USER: 'user',
  AGENT: 'agent',
  NOTIFICATION: 'notification',
  RISK_TEMPLATE: 'risk-template',
  SUBJECT_TEMPLATE: 'subject-template',
  DIGEST: 'digest',
  AI_DIAGNOSTICS: 'ai-diagnostics',
  IMPORT: 'import',
} as const;

export const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  PROMOTE: 'promote',
  INGEST: 'ingest',
  REGISTER: 'register',
  // admin actions
  MANAGE: 'manage',
  USERS_MANAGE: 'users.manage',
  SSO_MANAGE: 'sso.manage',
  SETTINGS_MANAGE: 'settings.manage',
  // action-only resources
  TRIGGER: 'trigger',
  EXECUTE: 'execute',
} as const;

export type ResourceName = (typeof RESOURCES)[keyof typeof RESOURCES];
export type ActionName = (typeof ACTIONS)[keyof typeof ACTIONS];

// Assignable system roles, mirrored from the authz manifest's `roles:` block
// (compliance-framework/api: internal/authz/manifest.yaml). The API has no "list roles"
// endpoint, and these change rarely, so the role-assignment UI sources the picker options
// from this list. `roleName` is still validated server-side against the manifest on every
// grant (POST /admin/role-assignments → 400 on an unknown role), so this list is only a
// convenience for the dropdown — keep it in sync with the manifest.
export const MANIFEST_ROLES = [
  { name: 'admin', description: 'Full access to everything.' },
  { name: 'viewer', description: 'Read everything; cannot write.' },
  {
    name: 'auditor',
    description:
      'Read everything; record evidence and maintain the risk/POA&M register.',
  },
  {
    name: 'contributor',
    description:
      'Author content (OSCAL docs, register items, workflows, dashboards); no admin.',
  },
  {
    name: 'agent',
    description:
      'Service accounts: ingest telemetry and reconcile plugin templates.',
  },
] as const;

export type ManifestRoleName = (typeof MANIFEST_ROLES)[number]['name'];

// Human-readable labels for the resources users actually act on, for tooltips/messages.
const RESOURCE_LABELS: Partial<Record<string, string>> = {
  [RESOURCES.EVIDENCE]: 'evidence',
  [RESOURCES.CATALOG]: 'catalogs',
  [RESOURCES.PROFILE]: 'profiles',
  [RESOURCES.COMPONENT_DEFINITION]: 'component definitions',
  [RESOURCES.SSP]: 'system security plans',
  [RESOURCES.ASSESSMENT_PLAN]: 'assessment plans',
  [RESOURCES.ASSESSMENT_RESULTS]: 'assessment results',
  [RESOURCES.POAM_OSCAL]: 'plans of action and milestones',
  [RESOURCES.POAM_ITEM]: 'POA&M items',
  [RESOURCES.INVENTORY]: 'inventory',
  [RESOURCES.PARTY]: 'parties',
  [RESOURCES.ROLE]: 'roles',
  [RESOURCES.ACTIVITY]: 'activities',
  [RESOURCES.RISK]: 'risks',
  [RESOURCES.FILTER]: 'dashboards',
  [RESOURCES.DASHBOARD_SUGGESTION]: 'dashboard suggestions',
  [RESOURCES.WORKFLOW_DEFINITION]: 'workflow definitions',
  [RESOURCES.WORKFLOW_STEP_DEFINITION]: 'workflow steps',
  [RESOURCES.WORKFLOW_INSTANCE]: 'workflow instances',
  [RESOURCES.WORKFLOW_EXECUTION]: 'workflow executions',
  [RESOURCES.STEP_EXECUTION]: 'workflow steps',
  [RESOURCES.ROLE_ASSIGNMENT]: 'role assignments',
  [RESOURCES.CONTROL_RELATIONSHIP]: 'control relationships',
  [RESOURCES.AGENT]: 'agents',
  [RESOURCES.USER]: 'users',
  [RESOURCES.NOTIFICATION]: 'notifications',
  [RESOURCES.RISK_TEMPLATE]: 'risk templates',
  [RESOURCES.SUBJECT_TEMPLATE]: 'subject templates',
  [RESOURCES.AI_DIAGNOSTICS]: 'AI diagnostics',
  [RESOURCES.IMPORT]: 'imports',
  [RESOURCES.DIGEST]: 'digests',
};

const ACTION_VERBS: Partial<Record<string, string>> = {
  [ACTIONS.CREATE]: 'create',
  [ACTIONS.UPDATE]: 'edit',
  [ACTIONS.DELETE]: 'delete',
  [ACTIONS.PROMOTE]: 'promote',
  [ACTIONS.REGISTER]: 'register',
  [ACTIONS.INGEST]: 'ingest',
  [ACTIONS.EXECUTE]: 'import',
  [ACTIONS.TRIGGER]: 'trigger',
  [ACTIONS.MANAGE]: 'manage',
  [ACTIONS.USERS_MANAGE]: 'manage',
  [ACTIONS.SSO_MANAGE]: 'manage',
  [ACTIONS.SETTINGS_MANAGE]: 'manage',
};

// Tooltip shown on a disabled action the user lacks permission for.
export function permissionTooltip(resource: string, action: string): string {
  const verb = ACTION_VERBS[action] ?? action;
  const noun = RESOURCE_LABELS[resource] ?? resource;
  return `You don't have permission to ${verb} ${noun}.`;
}
