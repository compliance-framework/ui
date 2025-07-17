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
