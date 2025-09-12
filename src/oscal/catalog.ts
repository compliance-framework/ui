import type { Link, Property } from './common';
import type { BackMatter, Metadata } from './metadata';

export interface Catalog {
  uuid: string;
  metadata: Metadata;
  params?: Parameter[];
  groups?: Group[];
  controls?: Control[];
  backMatter?: BackMatter;
}

export interface Part {
  id: string;
  name: string;
  ns?: string;
  class?: string;
  title?: string;
  prose?: string;
  props?: Property[];
  links?: Link[];
  parts?: Part[];
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

export interface ParameterGuideline {
  prose: string;
}

export interface ParameterConstraintTest {
  expression: string;
  remarks?: string;
}

export interface ParameterConstraint {
  description: string;
  tests: ParameterConstraintTest[];
}

export interface ParameterSelection {
  howMany: 'one' | 'one-or-more';
  choice: string[];
}

export interface Parameter {
  id: string;
  class?: string;
  props?: Property[];
  links?: Link[];
  label?: string;
  usage?: string;
  constraints?: ParameterConstraint[];
  guidelines?: ParameterGuideline[];
  values?: string[];
  select?: ParameterSelection;
  remarks?: string;
}
