import type { Link, Property } from './common';
import type { Parameter, Part } from './controls';
import type { BackMatter, Metadata } from './metadata';

export interface Catalog {
  uuid: string;
  metadata: Metadata;
  params?: Parameter[];
  groups?: Group[];
  controls?: Control[];
  backMatter?: BackMatter;
}

export interface Group {
  id: string;
  title: string;
  class?: string;
  params?: Parameter[];
  parts?: Part[];
  links?: Link[];
  props?: Property[];
  groups?: Group[];
  controls?: Control[];
}

export interface Control {
  id: string;
  title: string;
  class?: string;
  params?: Parameter[];
  parts?: Part[];
  links?: Link[];
  props?: Property[];
  controls?: Control[];
}
