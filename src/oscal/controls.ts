import type { HasPropAndLink } from './common';

export interface Part extends HasPropAndLink {
  id: string;
  name: string;
  ns?: string;
  class?: string;
  title?: string;
  prose?: string;
  parts?: Part[];
}

export interface Parameter extends HasPropAndLink {
  id: string;
  class?: string;
  label?: string;
  usage?: string;
  constraints?: ParameterConstraint[];
  guidelines?: ParameterGuideline[];
  values?: string[];
  select?: ParameterSelection;
  remarks?: string;
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
