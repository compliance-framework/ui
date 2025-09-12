

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
