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

export interface Responsible {
  roleId: string;
  remarks?: string;
  props?: Property[];
  links?: Link[];
}

export interface ResponsibleRole extends Responsible {
  partyUuids?: string[];
}

export interface ResponsibleParty extends Responsible {
  partyUuids: string[];
}
