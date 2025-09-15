import type { HasPropAndLink, ResponsibleParty } from './common';
import type { BackMatter, Metadata } from './metadata';
import type {
  Activity,
  AssessmentAsset,
  AssessmentPart,
  Finding,
  LocalObjective,
  LoggedBy,
  Observation,
  RelatedTask,
  ReviewedControls,
  Risk,
  Task,
} from './assessment';

import type {
  InventoryItem,
  SystemComponent,
  SystemUser,
} from './implementation';

export interface AssessmentResult {
  uuid: string;
  metadata: Metadata;
  importAP: ImportAP;
  localDefinitions?: AssessmentResultLocalDefinitions;
  results: Result[];
  backMatter?: BackMatter;
}

export interface Result extends HasPropAndLink {
  uuid: string;
  title: string;
  description: string;
  start: string;
  end?: string;
  localDefinitions?: ResultLocalDefinitions;
  reviewedControls: ReviewedControls;
  attestations?: Attestation[];
  assessmentLog?: AssessmentLog;
  observations?: Observation[];
  risks?: Risk[];
  findings?: Finding[];
  remarks?: string;
}

export interface AssessmentResultLocalDefinitions {
  objectivesAndMethods?: LocalObjective[];
  activities?: Activity[];
  remarks?: string;
}

export interface ResultLocalDefinitions {
  components?: SystemComponent[];
  inventoryItems?: InventoryItem[];
  users?: SystemUser[];
  assessmentAssets?: AssessmentAsset[];
  tasks?: Task[];
}

export interface ImportAP {
  href: string;
  remarks?: string;
}

export interface Attestation {
  parts: AssessmentPart[];
  responsibleParties?: ResponsibleParty[];
}

export interface AssessmentLog {
  entries: AssessmentLogEntry[];
}

export interface AssessmentLogEntry extends HasPropAndLink {
  uuid: string;
  title?: string;
  description?: string;
  start: string;
  end?: string;
  loggedBy?: LoggedBy[];
  relatedTasks?: RelatedTask[];
  remarks?: string;
}
