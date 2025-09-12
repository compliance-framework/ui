import type {
  Activity,
  AssessmentAssets,
  AssessmentPart,
  AssessmentSubject,
  ImportSSP,
  LocalObjective,
  ReviewedControls,
  Task,
} from './assessment';
import type {
  InventoryItem,
  SystemComponent,
  SystemUser,
} from './implementation';
import type { BackMatter, Metadata } from './metadata';

export interface AssessmentPlan {
  uuid: string;
  metadata: Metadata;
  importSsp: ImportSSP;
  localDefinitions?: LocalDefinitions;
  termsAndConditions?: TermsAndConditions;
  reviewedControls: ReviewedControls;
  assessmentSubjects?: AssessmentSubject[];
  assessmentAssets?: AssessmentAssets;
  tasks?: Task[];
  backMatter?: BackMatter;
}

export interface LocalDefinitions {
  components?: SystemComponent[];
  inventoryItems?: InventoryItem[];
  users?: SystemUser[];
  objectivesAndMethods?: LocalObjective[];
  activities?: Activity[];
  remarks?: string;
}

export interface TermsAndConditions {
  Parts: AssessmentPart[];
}
