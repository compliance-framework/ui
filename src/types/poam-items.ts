/**
 * TypeScript types for the CCF POAM Items REST API (/api/poam-items)
 * These are separate from the OSCAL POAMItem type (oscal/poam.ts) which
 * represents the document model. These types represent the relational
 * API model introduced in POAM Phase 1.
 */

export type PoamItemStatus =
  | 'open'
  | 'in-progress'
  | 'completed'
  | 'overdue'
  | 'cancelled'
  | 'risk-accepted';

export type MilestoneStatus =
  | 'open'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export type PoamSourceType =
  | 'security-assessment'
  | 'continuous-monitoring'
  | 'penetration-test'
  | 'self-assessment'
  | 'other';

// ─── Milestone ────────────────────────────────────────────────────────────────

export interface PoamItemMilestone {
  id: string;
  poamItemId: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  plannedCompletionDate: string; // ISO 8601
  completedAt?: string;
  lastStatusChangeAt?: string;
  orderIndex: number;
  responsibleParty?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneRequest {
  title: string;
  description?: string;
  status?: MilestoneStatus;
  plannedCompletionDate: string;
  orderIndex?: number;
  responsibleParty?: string;
  remarks?: string;
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  status?: MilestoneStatus;
  plannedCompletionDate?: string;
  orderIndex?: number;
  responsibleParty?: string;
  remarks?: string;
}

// ─── POAM Item ────────────────────────────────────────────────────────────────

export interface PoamItem {
  id: string;
  sspId: string;
  title: string;
  description?: string;
  status: PoamItemStatus;
  sourceType?: PoamSourceType;
  primaryOwnerUserId?: string;
  plannedCompletionDate?: string;
  completedAt?: string;
  lastStatusChangeAt?: string;
  acceptanceRationale?: string;
  resourceRequired?: string;
  createdFromRiskId?: string;
  remarks?: string;
  milestones?: PoamItemMilestone[];
  riskLinks?: PoamRiskLink[];
  evidenceLinks?: PoamEvidenceLink[];
  controlLinks?: PoamControlLink[];
  findingLinks?: PoamFindingLink[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoamItemRequest {
  sspId: string;
  title: string;
  description?: string;
  status?: PoamItemStatus;
  sourceType?: PoamSourceType;
  primaryOwnerUserId?: string;
  plannedCompletionDate?: string;
  acceptanceRationale?: string;
  resourceRequired?: string;
  createdFromRiskId?: string;
  remarks?: string;
  milestones?: CreateMilestoneRequest[];
}

export interface UpdatePoamItemRequest {
  title?: string;
  description?: string;
  status?: PoamItemStatus;
  sourceType?: PoamSourceType;
  primaryOwnerUserId?: string;
  plannedCompletionDate?: string;
  acceptanceRationale?: string;
  resourceRequired?: string;
  remarks?: string;
}

// ─── Link types ───────────────────────────────────────────────────────────────

export interface PoamRiskLink {
  id: string;
  poamItemId: string;
  riskId: string;
  createdAt: string;
}

export interface PoamEvidenceLink {
  id: string;
  poamItemId: string;
  evidenceId: string;
  createdAt: string;
}

export interface PoamControlLink {
  id: string;
  poamItemId: string;
  catalogId: string;
  controlId: string;
  createdAt: string;
}

export interface PoamFindingLink {
  id: string;
  poamItemId: string;
  findingId: string;
  createdAt: string;
}

// ─── List filters ─────────────────────────────────────────────────────────────

export interface PoamItemListFilters {
  sspId?: string;
  status?: PoamItemStatus;
  overdueOnly?: boolean;
  deadlineBefore?: string; // ISO 8601
  riskId?: string;
  ownerRef?: string;
}

// ─── API response wrapper ─────────────────────────────────────────────────────

export interface PoamItemsResponse {
  data: PoamItem[];
}

export interface PoamItemResponse {
  data: PoamItem;
}

export interface MilestoneResponse {
  data: PoamItemMilestone;
}

export interface MilestonesResponse {
  data: PoamItemMilestone[];
}

// ─── Milestone progress helper ────────────────────────────────────────────────

export interface MilestoneProgress {
  total: number;
  completed: number;
  inProgress: number;
  open: number;
  overdue: number;
  percentage: number;
}

export function computeMilestoneProgress(
  milestones: PoamItemMilestone[],
): MilestoneProgress {
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === 'completed').length;
  const inProgress = milestones.filter(
    (m) => m.status === 'in-progress',
  ).length;
  const open = milestones.filter((m) => m.status === 'open').length;
  // Compare dates in local timezone: parse YYYY-MM-DD as local date to avoid
  // UTC-vs-local skew that can mark items overdue a day early/late.
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  const overdue = milestones.filter(
    (m) =>
      m.status !== 'completed' &&
      m.status !== 'cancelled' &&
      m.plannedCompletionDate.substring(0, 10) < todayStr,
  ).length;
  return {
    total,
    completed,
    inProgress,
    open,
    overdue,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
