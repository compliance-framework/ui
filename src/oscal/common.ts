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

export interface HasPropAndLink {
  props?: Property[];
  links?: Link[];
}

export interface Responsible extends HasPropAndLink {
  roleId: string;
  remarks?: string;
}

export interface ResponsibleRole extends Responsible {
  partyUuids?: string[];
}

export interface ResponsibleParty extends Responsible {
  partyUuids: string[];
}

export interface RelatedFinding {
  findingUuid: string;
}

export interface RelatedObservation {
  observationUuid: string;
}

export interface RelatedRisk {
  riskUuid: string;
}
