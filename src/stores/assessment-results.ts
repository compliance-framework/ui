import type {
  Metadata,
  Property,
  Link,
  Actor,
  Origin,
} from '@/stores/types';

export interface ImportAp {
  href: string;
  remarks?: string;
}

export interface LocalDefinitions {
  components?: any[];
  inventoryItems?: any[];
  assessmentAssets?: any;
  remarks?: string;
}

export interface SubjectReference {
  subjectUuid: string;
  type: string;
  title?: string;
  props?: Property[];
  links?: Link[];
  remarks?: string;
}

export interface SelectObjectiveForAssessment {
  includes?: string[];
  excludes?: string[];
}

export interface ReviewedControls {
  controlSelections: {
    includeAll?: any;
    includeControls?: {
      controlId: string;
      statementIds?: string[];
    }[];
    excludeControls?: {
      controlId: string;
      statementIds?: string[];
    }[];
  }[];
  props?: Property[];
  links?: Link[];
  remarks?: string;
}

export interface ObservationMethod {
  value: string;
}

export interface Observation {
  uuid: string;
  title?: string;
  description: string;
  methods: ObservationMethod[];
  types?: string[];
  origins?: Origin[];
  props?: Property[];
  links?: Link[];
  subjects?: SubjectReference[];
  relevantEvidence?: {
    href?: string;
    description?: string;
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  collected: string;
  expires?: string;
  remarks?: string;
}

export interface CharacterizationStatus {
  value: string;
}

export interface CharacterizationOrigin {
  actors: Actor[];
}

export interface Characterization {
  props?: Property[];
  links?: Link[];
  origin: CharacterizationOrigin;
  facets: {
    name: string;
    system: string;
    value: string;
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
}

export interface MitigatingFactor {
  uuid: string;
  implementationUuid?: string;
  description: string;
  props?: Property[];
  links?: Link[];
  subjects?: SubjectReference[];
}

export interface RiskLog {
  entries: {
    uuid: string;
    title?: string;
    description?: string;
    start: string;
    end?: string;
    props?: Property[];
    links?: Link[];
    loggedBy?: Actor[];
    statusChange?: CharacterizationStatus;
    relatedResponses?: {
      responseUuid: string;
      props?: Property[];
      links?: Link[];
      relatedTasks?: {
        taskUuid: string;
        props?: Property[];
        links?: Link[];
        identifiedSubject?: SubjectReference;
        subjects?: SubjectReference[];
      }[];
      remarks?: string;
    }[];
    remarks?: string;
  }[];
}

export interface Response {
  uuid: string;
  lifecycle: string;
  title: string;
  description: string;
  props?: Property[];
  links?: Link[];
  origins?: Origin[];
  requiredAssets?: {
    uuid: string;
    subjects?: SubjectReference[];
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  tasks?: {
    uuid: string;
    type: string;
    title: string;
    description: string;
    props?: Property[];
    links?: Link[];
    timing?: {
      onDate?: {
        date: string;
      };
      withinDateRange?: {
        start: string;
        end: string;
      };
      atFrequency?: {
        period: number;
        unit: string;
      };
    };
    dependencies?: {
      taskUuid: string;
      remarks?: string;
    }[];
    subjects?: SubjectReference[];
    responsibleRoles?: {
      roleId: string;
      props?: Property[];
      links?: Link[];
      partyUuids?: string[];
    }[];
    remarks?: string;
  }[];
  remarks?: string;
}

export interface Risk {
  uuid: string;
  title?: string;
  description: string;
  statement?: string;
  props?: Property[];
  links?: Link[];
  status: string;
  origins?: Origin[];
  threatIds?: {
    system?: string;
    href?: string;
    id: string;
  }[];
  characterizations?: Characterization[];
  mitigatingFactors?: MitigatingFactor[];
  deadline?: string;
  remediations?: Response[];
  riskLog?: RiskLog;
  relatedObservations?: {
    observationUuid: string;
  }[];
}

export interface TargetObjectiveStatus {
  title?: string;
  description?: string;
  props?: Property[];
  links?: Link[];
  status: {
    state: string;
    reason?: string;
    remarks?: string;
  };
  implementationStatus?: {
    uuid: string;
    implementationUuid?: string;
    title?: string;
    description?: string;
    props?: Property[];
    links?: Link[];
    implementationStatus?: string;
    responsibleRoles?: {
      roleId: string;
      props?: Property[];
      links?: Link[];
      partyUuids?: string[];
    }[];
    remarks?: string;
  };
}

export interface Target {
  type: string;
  targetId: string;
  title?: string;
  description?: string;
  props?: Property[];
  links?: Link[];
  status?: TargetObjectiveStatus;
  implementationStatus?: {
    uuid: string;
    implementationUuid?: string;
    title?: string;
    description?: string;
    props?: Property[];
    links?: Link[];
    state: string;
    responsibleRoles?: {
      roleId: string;
      props?: Property[];
      links?: Link[];
      partyUuids?: string[];
    }[];
    remarks?: string;
  };
  remarks?: string;
}

export interface Finding {
  uuid: string;
  title?: string;
  description: string;
  props?: Property[];
  links?: Link[];
  origins?: Origin[];
  target: Target;
  implementationStatementUuid?: string;
  relatedObservations?: {
    observationUuid: string;
  }[];
  relatedRisks?: {
    riskUuid: string;
  }[];
  remarks?: string;
}

export interface Attestation {
  responsibleParties: {
    roleId: string;
    partyUuids: string[];
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  parts: {
    id?: string;
    name: string;
    ns?: string;
    class?: string;
    title?: string;
    props?: Property[];
    prose?: string;
    parts?: any[];
    links?: Link[];
  }[];
}

export interface AssessmentLog {
  entries: {
    uuid: string;
    title?: string;
    description?: string;
    start: string;
    end?: string;
    props?: Property[];
    links?: Link[];
    loggedBy?: Actor[];
    relatedTasks?: {
      taskUuid: string;
      props?: Property[];
      links?: Link[];
      identifiedSubject?: SubjectReference;
      subjects?: SubjectReference[];
    }[];
    remarks?: string;
  }[];
}

export interface Result {
  uuid: string;
  title: string;
  description: string;
  props?: Property[];
  links?: Link[];
  start: string;
  end?: string;
  localDefinitions?: LocalDefinitions;
  reviewedControls: ReviewedControls;
  attestations?: Attestation[];
  assessmentLog?: AssessmentLog;
  observations?: Observation[];
  risks?: Risk[];
  findings?: Finding[];
  remarks?: string;
}

export interface Resource {
  uuid: string;
  title?: string;
  description?: string;
  props?: Property[];
  documentIds?: {
    scheme?: string;
    identifier?: string;
  }[];
  citation?: {
    text: string;
    props?: Property[];
    links?: Link[];
  };
  rlinks?: {
    href: string;
    mediaType?: string;
    hashes?: {
      algorithm: string;
      value?: string;
    }[];
  }[];
  base64?: {
    filename?: string;
    mediaType?: string;
    value?: string;
  };
  remarks?: string;
}

export interface BackMatter {
  resources?: Resource[];
}

export interface AssessmentResults {
  uuid: string;
  metadata: Metadata;
  importAp: ImportAp;
  localDefinitions?: LocalDefinitions;
  results: Result[];
  backMatter?: BackMatter;
}
