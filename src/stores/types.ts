export type FindingStatusState = 'satisfied' | 'not satisfied' | string;

export interface FindingStatus {
  title?: string
  description?: string
  remarks?: string
  state: FindingStatusState
  links?: Link[];
  props?: Property[];
}

export interface Origin {
  actors: Actor[];
}

export interface Actor {
  title: string;
  type: string;
  links?: Link[];
  props?: Property[];
}

export interface ControlReference {
  uuid: string;
  origin?: string;
  prose?: string;
}

export interface RiskReference {
  uuid: string;
  origin?: string;
  prose?: string;
}

export interface Link {
  href: string;
  rel?: string;
  text?: string;
}

export interface Property {
  name?: string;
  value?: string;
  class?: string;
  ns?: string;
}
