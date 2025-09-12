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
