import type {
  HasPropAndLink,
  RelatedObservation,
  RelatedRisk,
  ResponsibleParty,
  ResponsibleRole,
} from './common';
import type { Part } from './controls';
import type { ImplementationStatus, SystemComponent } from './implementation';

export interface ImportSSP {
  href: string;
  remarks?: string;
}

export interface LocalObjective extends HasPropAndLink {
  controlId: string;
  description?: string;
  parts: Part[];
  remarks?: string;
}

export interface AssessmentMethod extends HasPropAndLink {
  uuid: string;
  description?: string;
  part: Part;
  remarks?: string;
}

export interface Activity extends HasPropAndLink {
  uuid: string;
  title?: string;
  description: string;
  steps?: Step[];
  relatedControls?: ReviewedControls;
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
}

export interface Step extends HasPropAndLink {
  uuid: string;
  title?: string;
  description: string;
  remarks?: string;
  reviewedControls?: ReviewedControls;
  responsibleRoles?: ResponsibleRole[];
}

enum TaskType {
  Milestone = 'milestone',
  Action = 'action',
}

export interface Task extends HasPropAndLink {
  uuid: string;
  type: TaskType | string;
  title: string;
  description?: string;
  timing?: TaskTiming;
  dependencies?: TaskDependency[];
  tasks?: Task[];
  associatedActivities?: AssociatedActivity[];
  subjects?: AssessmentSubject[];
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
}

export interface TaskTiming {
  onDate?: string;
  withinDateRange?: DateRange;
  atFrequency?: Frequency;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface Frequency {
  period: string;
  unit: string;
}

export interface TaskDependency {
  taskUuid: string;
  remarks?: string;
}

export interface AssociatedActivity extends HasPropAndLink {
  activityUuid: string;
  responsibleRoles?: ResponsibleRole[];
  subjects: AssessmentSubject[];
  remarks?: string;
}

export interface ReviewedControls extends HasPropAndLink {
  description?: string;
  controlSelections: ControlSelection[];
  controlObjectiveSelections?: ControlObjectiveSelection[];
  remarks?: string;
}

export interface ControlSelection extends HasPropAndLink {
  description?: string;
  includeAll?: boolean;
  includeControls?: SelectControlByID[];
  excludeControls?: SelectControlByID[];
  remarks?: string;
}

export interface SelectControlByID {
  controlId: string;
  statementIds?: string[];
}

export interface ControlObjectiveSelection extends HasPropAndLink {
  description?: string;
  includeAll?: boolean;
  includeObjectives?: SelectObjectiveByID[];
  excludeObjectives?: SelectObjectiveByID[];
  remarks?: string;
}

export interface SelectObjectiveByID {
  objectiveId: string;
}

export interface AssessmentSubjectPlaceholder extends HasPropAndLink {
  uuid: string;
  description?: string;
  sources: AssessmentSubjectSource[];
  remarks?: string;
}

export interface AssessmentSubjectSource {
  taskUuid: string;
}

export interface AssessmentSubject extends HasPropAndLink {
  type: AssessmentSubjectType | string;
  description?: string;
  includeAll?: boolean;
  includeSubjects?: SelectSubjectByID[];
  excludeSubjects?: SelectSubjectByID[];
  remarks?: string;
}

enum AssessmentSubjectType {
  Component = 'component',
  InventoryItem = 'inventory-item',
  Location = 'location',
  Party = 'party',
  User = 'user',
  Resource = 'resource',
}

export interface SelectSubjectByID extends HasPropAndLink {
  subjectUuid: string;
  type: AssessmentSubjectType | string;
  remarks?: string;
}

export interface SubjectReference extends HasPropAndLink {
  subjectUuid: string;
  type: AssessmentSubjectType | string;
  title?: string;
  remarks?: string;
}

export interface AssessmentAssets {
  components?: SystemComponent[];
  assessmentPlatforms: AssessmentPlatform[];
}

export interface AssessmentPlatform extends HasPropAndLink {
  uuid: string;
  title?: string;
  usesComponents?: UsesComponent[];
  remarks?: string;
}

export interface UsesComponent extends HasPropAndLink {
  componentUuid: string;
  responsibleParties?: ResponsibleParty[];
  remarks?: string;
}

export interface FindingTarget extends HasPropAndLink {
  type: FindingTargetType | string;
  targetId: string;
  title?: string;
  description?: string;
  status: ObjectiveStatus;
  implementationStatus?: ImplementationStatus;
  remarks?: string;
}

enum FindingTargetType {
  StatementID = 'statement-id',
  ObjectiveID = 'objective-id',
}

export interface ObjectiveStatus extends HasPropAndLink {
  state: ObjectiveStatusState | string;
  reason?: ObjectiveStatusReason | string;
  remarks?: string;
}

enum ObjectiveStatusState {
  Satisfied = 'satisfied',
  NotSatisfied = 'not-satisfied',
}

enum ObjectiveStatusReason {
  Pass = 'pass',
  Fail = 'fail',
  Other = 'other',
}

export interface Finding extends HasPropAndLink {
  uuid: string;
  title: string;
  description: string;
  origins?: Origin[];
  target: FindingTarget;
  implementationStatementUuid?: string;
  relatedObservations?: RelatedObservation[];
  relatedRisks?: RelatedRisk[];
  remarks?: string;
}

export interface Origin {
  actors: OriginActor[];
  relatedTasks?: RelatedTask[];
}

export interface OriginActor extends HasPropAndLink {
  type: OriginActorType | string;
  actorUuid: string;
  roleId?: string;
}

enum OriginActorType {
  Tool = 'tool',
  AssessmentPlatform = 'assessment-platform',
  Party = 'party',
}

export interface RelatedTask extends HasPropAndLink {
  taskUuid: string;
  identifiedSubject?: IdentifiedSubject;
  responsibleParties?: ResponsibleParty[];
  subjects?: AssessmentSubject[];
  remarks?: string;
}

export interface IdentifiedSubject {
  subjectPlaceholderUuid: string;
  subjects: AssessmentSubject[];
}

export interface Observation extends HasPropAndLink {
  uuid: string;
  title?: string;
  description: string;
  methods: Array<ObservationMethod | string>;
  types?: Array<ObservationType | string>;
  origins?: Origin[];
  subjects?: SubjectReference[];
  relevantEvidence?: RelevantEvidence[];
  collected: string;
  expires?: string;
  remarks?: string;
}

enum ObservationMethod {
  Examine = 'EXAMINE',
  Interview = 'INTERVIEW',
  Test = 'TEST',
  Unknown = 'UNKNOWN',
}

enum ObservationType {
  SspStatementIssue = 'ssp-statement-issue',
  ControlObjective = 'control-objective',
  Mitigation = 'mitigation',
  Finding = 'finding',
  Historic = 'historic',
}

export interface RelevantEvidence extends HasPropAndLink {
  href?: string;
  description: string;
  remarks?: string;
}

export interface ThreatID {
  id: string;
  system: ThreatIDSystem | string;
  href?: string;
}

export enum ThreatIDSystem {
  FedRAMP = 'http://fedramp.gov',
  OSCAL = 'http://fedramp.gov/ns/oscal',
}

export interface Risk extends HasPropAndLink {
  uuid: string;
  title: string;
  description: string;
  statement: string;
  status: RiskStatus | string;
  origins?: Origin[];
  threatIds?: ThreatID[];
  characterizations?: Characterization[];
  mitigatingFactors?: MitigatingFactor[];
  deadline?: string;
  remediations?: Response[];
  riskLog?: RiskLog;
  relatedObservations?: RelatedObservation[];
  remarks?: string;
}

export interface MitigatingFactor extends HasPropAndLink {
  uuid: string;
  description: string;
  implementationUuid?: string;
  subjects?: SubjectReference[];
}

enum RiskStatus {
  Open = 'open',
  Investigating = 'investigating',
  Remediating = 'remediating',
  DeviationRequested = 'deviation-requested',
  DeviationApproved = 'deviation-approved',
  Closed = 'closed',
}

export interface Response extends HasPropAndLink {
  uuid: string;
  lifecycle: ResponseLifecycle | string;
  title: string;
  description: string;
  origins?: Origin[];
  requiredAssets?: RequiredAsset[];
  tasks?: Task[];
  remarks?: string;
}

enum ResponseLifecycle {
  Recommendation = 'recommendation',
  Planned = 'planned',
  Completed = 'completed',
}

export interface RequiredAsset extends HasPropAndLink {
  uuid: string;
  subjects?: SubjectReference[];
  title?: string;
  description: string;
  remarks?: string;
}

export interface RiskLog {
  entries: RiskLogEntry[];
}

export interface RiskLogEntry {
  uuid: string;
  title?: string;
  description?: string;
  start: string;
  end?: string;
  loggedBy?: LoggedBy[];
  statusChange?: RiskStatus | string;
  relatedResponses?: RiskResponseReference[];
  remarks?: string;
}

export interface RiskResponseReference extends HasPropAndLink {
  responseUuid: string;
  relatedTasks?: RelatedTask[];
  remarks?: string;
}

export interface LoggedBy {
  partyUuid: string;
  roleId?: string;
}

enum AssessmentPartName {
  Asset = 'asset',
  Method = 'method',
  Objective = 'objective',
}

export interface AssessmentPart extends HasPropAndLink {
  uuid?: string;
  name: AssessmentPartName | string;
  ns?: string;
  class?: string;
  title?: string;
  prose?: string;
  parts?: AssessmentPart[];
}

export interface Characterization extends HasPropAndLink {
  origin: Origin;
  facets: Facet[];
}

enum FacetSystem {
  FedRAMP = 'http://fedramp.gov',
  FedRAMP_OSCAL = 'http://fedramp.gov/ns/oscal',
  NIST_OSCAL = 'http://csrc.nist.gov/ns/oscal',
  NIST_OSCAL_Unknown = 'http://csrc.nist.gov/ns/oscal/unknown',
  MITRE = 'http://cve.mitre.org',
  CVSS_2 = 'http://www.first.org/cvss/v2.0',
  CVSS_3_0 = 'http://www.first.org/cvss/v3.0',
  CVSS_3_1 = 'http://www.first.org/cvss/v3.1',
  CVSS_4_0 = 'https://www.first.org/cvss/v4-0',
}

export interface Facet extends HasPropAndLink {
  name: string;
  system: FacetSystem | string;
  value: string;
  remarks?: string;
}
