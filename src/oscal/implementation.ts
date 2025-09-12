import type { HasPropAndLink, ResponsibleRole } from './common';
import type { Metadata } from './metadata';

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

export interface AuthorizedPrivilege {
  title: string;
  description?: string;
  functionsPerformed: string[];
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
