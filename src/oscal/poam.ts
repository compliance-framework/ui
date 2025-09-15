import type {
  HasPropAndLink,
  RelatedFinding,
  RelatedObservation,
  RelatedRisk,
} from './common';
import type { BackMatter, Metadata } from './metadata';
import type {
  AssessmentAssets,
  Finding,
  ImportSSP,
  Observation,
  Origin,
  Risk,
} from './assessment';
import type {
  InventoryItem,
  SystemComponent,
  SystemID,
} from './implementation';

export interface POAM {
  uuid: string;
  metadata: Metadata;
  importSSP?: ImportSSP;
  systemID?: SystemID;
  localDefinitions?: POAMLocalDefinitions;
  observations?: Observation[];
  risks?: Risk[];
  findings?: Finding[];
  poamItems: POAMItem[];
  backMatter?: BackMatter;
}

export interface POAMItem extends HasPropAndLink {
  uuid?: string;
  title: string;
  description: string;
  origins?: Origin[];
  relatedFindings?: RelatedFinding[];
  relatedObservations?: RelatedObservation[];
  relatedRisks?: RelatedRisk[];
  remarks?: string;
}

export interface POAMLocalDefinitions {
  components?: SystemComponent[];
  inventoryItems?: InventoryItem[];
  assessmentAssets?: AssessmentAssets;
  remarks?: string;
}
