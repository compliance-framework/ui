import type { HasPropAndLink, ResponsibleRole } from './common';
import type { Protocol, SetParameter } from './implementation';
import type { BackMatter, Metadata } from './metadata';

export interface ComponentDefinition {
  uuid: string;
  metadata: Metadata;
  importComponentDefinitions?: ImportComponentDefinition[];
  components?: DefinedComponent[];
  capabilities?: Capability[];
  backMatter?: BackMatter;
}

export interface ImportComponentDefinition {
  href: string;
}

export interface DefinedComponent extends HasPropAndLink {
  uuid: string;
  type: DefinedComponentType | string;
  title: string;
  description: string;
  purpose?: string;
  responsibleRoles?: ResponsibleRole[];
  protocols?: Protocol[];
  controlImplementations?: ComponentDefinitionControlImplementation[];
  remarks?: string;
}

enum DefinedComponentType {
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
}

export interface Capability extends HasPropAndLink {
  uuid: string;
  name: string;
  description: string;
  incorporatesComponents?: IncorporatesComponent[];
  controlImplementations?: ComponentDefinitionControlImplementation[];
  remarks?: string;
}

export interface IncorporatesComponent {
  componentUuid: string;
  description: string;
}

export interface ComponentDefinitionControlImplementation
  extends HasPropAndLink {
  uuid: string;
  source: string;
  description: string;
  setParameters?: SetParameter[];
  implementedRequirements: ComponentDefinitionImplementedRequirement[];
}

export interface ComponentDefinitionImplementedRequirement
  extends HasPropAndLink {
  uuid: string;
  controlId: string;
  description: string;
  setParameters?: SetParameter[];
  responsibleRoles?: ResponsibleRole[];
  statements?: ComponentDefinitionStatement[];
  remarks?: string;
}

export interface ComponentDefinitionStatement extends HasPropAndLink {
  statementId: string;
  uuid: string;
  description: string;
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
}
