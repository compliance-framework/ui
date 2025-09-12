import type {
  HasPropAndLink,
  ResponsibleParty,
  ResponsibleRole,
} from './common';

export interface SystemComponent extends HasPropAndLink {
  uuid: string;
  type: SystemComponentType | string;
  title: string;
  description: string;
  purpose?: string;
  status: SystemComponentStatus;
  protocols?: Protocol[];
  remarks?: string;
  responsibleRoles?: ResponsibleRole[];
}

enum SystemComponentType {
  ThisSystem = 'this-system',
  System = 'system',
  Interconnection = 'interconnection',
  Software = 'software',
  Hardware = 'hardware',
  Service = 'service',
  Policy = 'policy',
  Physical = 'physical',
  ProcessProcedure = 'process-procedure',
  Plan = 'plan',
  Guidance = 'guidance',
  Standard = 'standard',
  Validation = 'validation',
  Network = 'network',
}

enum SystemComponentStatusState {
  UnderDevelopment = 'under-development',
  Operational = 'operational',
  Disposition = 'disposition',
  Other = 'other',
}

export interface SystemComponentStatus {
  state: SystemComponentStatusState | string;
  remarks?: string;
}

export interface SystemUser extends HasPropAndLink {
  uuid: string;
  title?: string;
  shortName?: string;
  description?: string;
  remarks?: string;
  roleIds?: string[];
  authorizedPrivileges?: AuthorizedPrivilege[];
}

export interface InventoryItem extends HasPropAndLink {
  uuid: string;
  description: string;
  responsibleParties?: ResponsibleParty[];
  implementedComponents?: ImplementedComponent[];
  remarks?: string;
}

export interface ImplementedComponent extends HasPropAndLink {
  componentUuid: string;
  responsibleParties?: ResponsibleParty[];
  remarks?: string;
}

export interface AuthorizedPrivilege {
  title: string;
  description?: string;
  functionsPerformed: string[];
}

enum SystemIDType {
  FedRAMP = "https://fedramp.gov",
  OSCAL = "http://fedramp.gov/ns/oscal",
  RFC4122 = "https://ietf.org/rfc/rfc4122",
}

export interface SystemID {
  id: string;
  identifierType?: SystemIDType | string;
}

export interface Protocol {
  uuid?: string;
  name?: string;
  title?: string;
  portRanges?: PortRange[];
}

enum PortRangeTransport {
  TCP = 'TCP',
  UDP = 'UDP',
}

export interface PortRange {
  end?: number;
  start?: number;
  transport?: PortRangeTransport | string;
}

enum ImplementationStatusState {
  Implemented = 'implemented',
  Partial = 'partial',
  Planned = 'planned',
  Alternative = 'alternative',
  NotApplicable = 'not-applicable',
}

export type ImplementationStatus = {
  state: ImplementationStatusState | string;
  remarks?: string;
};

export interface SetParameter {
  paramId: string;
  values: string[];
  remarks?: string;
}
