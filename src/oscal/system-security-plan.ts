import type { BackMatter, Metadata } from './metadata';
import type {
  HasPropAndLink,
  ResponsibleParty,
  ResponsibleRole,
} from './common';
import type {
  ImplementationStatus,
  InventoryItem,
  SetParameter,
  SystemComponent,
  SystemID,
  SystemUser,
} from './implementation';

export interface SystemSecurityPlan {
  uuid: string;
  metadata: Metadata;
  importProfile: ImportProfile;
  systemCharacteristics: SystemCharacteristics;
  systemImplementation: SystemImplementation;
  controlImplementation: ControlImplementation;
  backMatter?: BackMatter;
}

export interface ImportProfile {
  href: string;
  remarks?: string;
}

export interface SystemCharacteristics extends HasPropAndLink {
  systemIds: SystemID[];
  systemName: string;
  systemNameShort?: string;
  description: string;
  dateAuthorized?: string;
  securitySensitivityLevel?: string;
  status?: Status;
  securityImpactLevel?: SecurityImpactLevel;
  systemInformation: SystemInformation;
  authorizationBoundary: AuthorizationBoundary;
  networkArchitecture?: NetworkArchitecture;
  dataFlow?: DataFlow;
  responsibleParties?: ResponsibleParty[];
  remarks?: string;
}

export interface SystemImplementation extends HasPropAndLink {
  users: SystemUser[];
  components: SystemComponent[];
  inventoryItems?: InventoryItem[];
  leveragedAuthorizations?: LeveragedAuthorization[];
  remarks?: string;
}

export interface ControlImplementation {
  description: string;
  setParameters?: SetParameter[];
  implementedRequirements: ImplementedRequirement[];
}

export interface LeveragedAuthorization extends HasPropAndLink {
  uuid: string;
  title: string;
  partyUuid: string;
  dateAuthorized: string;
  remarks?: string;
}

export interface SystemInformation extends HasPropAndLink {
  informationTypes: SystemInformationType[];
}

export interface SystemInformationType extends HasPropAndLink {
  uuid: string;
  title: string;
  description: string;
  categorizations?: SystemInformationTypeCharacterization[];
  confidentialityImpact?: Impact;
  integrityImpact?: Impact;
  availabilityImpact?: Impact;
}

enum SystemInformationTypeCharacterizationSystem {
  NIST800_60 = 'http://doi.org/10.6028/NIST.SP.800-60v2r1',
}

export interface SystemInformationTypeCharacterization {
  system: SystemInformationTypeCharacterizationSystem | string;
  informationTypeIds?: string[];
}

export interface Impact extends HasPropAndLink {
  base: string;
  selected?: string;
  adjustmentJustification?: string;
}

export interface SecurityImpactLevel {
  securityObjectiveConfidentiality: string;
  securityObjectiveIntegrity: string;
  securityObjectiveAvailability: string;
}

enum StatusState {
  Operational = 'operational',
  UnderDevelopment = 'under-development',
  UnderMajorModification = 'under-major-modification',
  Disposition = 'disposition',
  Other = 'other',
}

export interface Status {
  state: StatusState | string;
  remarks?: string;
}

export interface AuthorizationBoundary extends HasPropAndLink, HasDiagrams {
  uuid: string;
  description: string;
  remarks?: string;
}

export interface NetworkArchitecture extends HasPropAndLink, HasDiagrams {
  uuid: string;
  description: string;
  remarks?: string;
}

export interface DataFlow extends HasPropAndLink, HasDiagrams {
  uuid: string;
  description: string;
  remarks?: string;
}

export interface HasDiagrams {
  diagrams?: Diagram[];
}

export interface Diagram extends HasPropAndLink {
  uuid: string;
  description?: string;
  caption?: string;
  remarks?: string;
}

export interface ImplementedRequirement extends HasPropAndLink {
  uuid: string;
  controlId: string;
  setParameters?: SetParameter[];
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
  byComponents?: ByComponent[];
  statements?: Statement[];
}

export interface Statement extends HasPropAndLink {
  uuid: string;
  statementId: string;
  description?: string;
  responsibleRoles?: ResponsibleRole[];
  byComponents?: ByComponent[];
  remarks?: string;
}

export interface ByComponent extends HasPropAndLink {
  uuid: string;
  componentUuid: string;
  description: string;
  setParameters?: SetParameter[];
  implementationStatus?: ImplementationStatus;
  export?: ByComponentExport;
  inherited?: ByComponentInherit[];
  satisfied?: ByComponentSatisfy[];
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
}

export interface ByComponentExport extends HasPropAndLink {
  uuid: string;
  description: string;
  provided?: ByComponentExportProvided[];
  responsibilities?: ByComponentExportResponsibility[];
  remarks?: string;
}

export interface ByComponentExportProvided extends HasPropAndLink {
  uuid: string;
  description: string;
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
}

export interface ByComponentExportResponsibility extends HasPropAndLink {
  uuid: string;
  description: string;
  providedUuid?: string;
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
}

export interface ByComponentInherit extends HasPropAndLink {
  uuid: string;
  description: string;
  providedUuid?: string;
  responsibleRoles?: ResponsibleRole[];
}

export interface ByComponentSatisfy extends HasPropAndLink {
  uuid: string;
  description: string;
  responsibilityUuid?: string;
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
}
