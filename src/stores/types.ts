export interface Metadata {
  title: string;
  remarks?: string;
}

export type FindingStatusState = 'satisfied' | 'not satisfied' | string;

export interface FindingStatus {
  title?: string;
  description?: string;
  remarks?: string;
  state: FindingStatusState;
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

export interface RelevantEvidence {
  description: string;
  remarks?: string;
  href?: string;
  links?: Link[];
  props?: Property[];
}

export interface Activity {
  uuid?: string;
  title: string;
  description: string;
  remarks?: string;
  steps?: Step[];
  links?: Link[];
  props?: Property[];
}

export interface Step {
  uuid?: string;
  title: string;
  description: string;
  remarks?: string;
  links?: Link[];
  props?: Property[];
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

export interface Parent {
  id: string;
  class: string;
  type: string;
}

export interface DataResponse<T> {
  data: T;
}

