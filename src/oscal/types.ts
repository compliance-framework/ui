export interface Link {
  href: string;
  rel?: string;
  text?: string;
}

export interface Property {
  uuid?: string;
  name?: string;
  value?: string;
  class?: string;
  ns?: string;
  remarks?: string;
}

export interface Metadata {
  title: string;
  remarks?: string;
  version?: string;
  lastModified?: string;
  published?: string;
  oscalVersion?: string;
}

export interface ResponsibleRole {
  roleId: string;
  props: Property[];
  links: Link[];
  partyUuids?: string[];
  remarks?: string;
}

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

export interface ResourceLink {
  href: string;
  mediaType?: string;
}

export interface Citation {
  text: string;
  props?: Property[];
  links?: Link[];
}

export interface BackMatterResource {
  uuid: string;
  title: string;
  description: string;
  remarks?: string;
  citation?: Citation;
  props?: Property[];
  links?: Link[];
  rlinks?: ResourceLink[];
}

export interface BackMatter {
  resources: BackMatterResource[];
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
