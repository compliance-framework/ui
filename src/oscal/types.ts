

export interface Catalog {
  uuid: string;
  metadata: Metadata;
  groups: Group[];
  controls: Control[];
}

export interface Part {
  class: string;
  id: string;
  links: Link[];
  name: string;
  ns: string;
  parts: Part[];
  props: Property[];
  prose: string;
  title: string;
}

export interface Group {
  id: string;
  title: string;
  class?: string;
  parts: Part[];
  links: Link[];
  props: Property[];
  groups: Group[];
  controls: Control[];
}

export interface Control {
  id: string;
  title: string;
  class: string;
  parts: Part[];
  links: Link[];
  props: Property[];
  controls: Control[];
}

export interface Profile {
  uuid: string;
  metadata: Metadata;
}

export interface PortRange {
  end: number;
  start: number;
  transport: string;
}

export interface Protocol {
  name: string;
  portRanges?: PortRange[];
  title: string;
  uuid: string;
}

export interface SystemComponentStatus {
  remarks: string;
  state: string;
}

export interface SystemComponent {
  uuid: string;
  type: string;
  title: string;
  description: string;
  purpose: string;
  status: SystemComponentStatus;
  protocols: Protocol[];
  remarks: string;
  props: Property[];
  links: Link[];
}

export interface SystemCharacteristics {
  systemName?: string;
  systemNameShort?: string;
  description?: string;
  dateAuthorized?: Date;
  securitySensitivityLevel?: string;
  remarks?: string;
}

export interface SystemSecurityPlan {
  uuid: string;
  metadata: Metadata;
  systemCharacteristics: SystemCharacteristics;
}

export interface SetParameter {
  paramId: string;
  values: string[];
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface ImplementationStatus {
  state: string;
  remarks?: string;
}

export interface Export {
  uuid: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
  provided?: ProvidedControlImplementation[];
  responsibilities?: ControlImplementationResponsibility[];
}

export interface InheritedControlImplementation {
  uuid: string;
  providedUuid: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface SatisfiedControlImplementationResponsibility {
  uuid: string;
  responsibilityUuid: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface ProvidedControlImplementation {
  uuid: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface ControlImplementationResponsibility {
  uuid: string;
  providedUuid?: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface ByComponent {
  uuid: string;
  componentUuid: string;
  description: string;
  props: Property[];
  links: Link[];
  setParameters?: SetParameter[];
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
  implementationStatus?: ImplementationStatus;
  export?: Export;
  inherited?: InheritedControlImplementation[];
  satisfied?: SatisfiedControlImplementationResponsibility[];
}

export interface Statement {
  uuid: string;
  statementId: string;
  description?: string;
  props: Property[];
  links: Link[];
  responsibleRoles?: ResponsibleRole[];
  byComponents?: ByComponent[];
  remarks?: string;
}

export interface ImplementedRequirement {
  uuid: string;
  controlId: string;
  props: Property[];
  links: Link[];
  setParameters?: SetParameter[];
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
  byComponents?: ByComponent[];
  statements?: Statement[];
}

export interface ControlImplementation {
  uuid: string;
  source?: string;
  description: string;
  setParameters?: SetParameter[];
  implementedRequirements: ImplementedRequirement[];
}

export interface ImplementedComponent {
  componentUuid: string;
  props?: Property[];
  links?: Link[];
  responsibleParties?: {
    roleId: string;
    partyUuids: string[];
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  remarks?: string;
}

export interface InventoryItem {
  uuid: string;
  description: string;
  props?: Property[];
  links?: Link[];
  responsibleParties?: {
    roleId: string;
    partyUuids: string[];
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  implementedComponents?: ImplementedComponent[];
  remarks?: string;
}

export interface ReviewedControls {
  description?: string;
  props?: Property[];
  links?: Link[];
  controlSelections?: ControlSelection[];
  controlObjectiveSelections?: ControlObjectiveSelection[];
}

export interface ControlSelection {
  description?: string;
  includeAll?: boolean;
  includeControls?: IncludeControl[];
  excludeControls?: ExcludeControl[];
}

export interface IncludeControl {
  controlId: string;
  statementIds?: string[];
}

export interface ExcludeControl {
  controlId: string;
  statementIds?: string[];
}

export interface ControlObjectiveSelection {
  description?: string;
  includeAll?: boolean;
  includeObjectives?: IncludeObjective[];
  excludeObjectives?: ExcludeObjective[];
}

export interface IncludeObjective {
  objectiveId: string;
}

export interface ExcludeObjective {
  objectiveId: string;
}

export interface Task {
  uuid: string;
  type: string;
  title: string;
  description?: string;
  remarks?: string;
  props?: Property[];
  links?: Link[];
  timing?: TaskTiming;
  dependencies?: TaskDependency[];
  tasks?: Task[];
  associatedActivities?: AssociatedActivity[];
  subjects?: TaskSubject[];
  responsibleRoles?: ResponsibleRole[];
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

export interface IncludeSubject {
  subjectUuid: string;
  type: string;
  description?: string;
  props?: Property[];
  links?: Link[];
}

export interface ExcludeSubject {
  subjectUuid: string;
  type: string;
  description?: string;
  props?: Property[];
  links?: Link[];
}

export interface ActivitySubject {
  type: string;
  includeAll?: boolean;
  includeSubjects?: IncludeSubject[];
  excludeSubjects?: ExcludeSubject[];
}

export interface AssociatedActivity {
  activityUuid: string;
  props?: Property[];
  links?: Link[];
  responsibleRoles?: ResponsibleRole[];
  subjects?: ActivitySubject[];
}

export interface TaskSubject {
  type: string;
  includeAll?: boolean;
  includeSubjects?: IncludeSubject[];
  excludeSubjects?: ExcludeSubject[];
}

export interface Activity {
  uuid: string;
  title?: string;
  description: string;
  remarks?: string;
  props?: Property[];
  links?: Link[];
  steps?: Step[];
  relatedControls?: ReviewedControls;
  responsibleRoles?: ResponsibleRole[];
}

export interface Step {
  uuid: string;
  title?: string;
  description: string;
  remarks?: string;
  props?: Property[];
  links?: Link[];
  responsibleRoles?: ResponsibleRole[];
  reviewedControls?: ReviewedControls;
}
