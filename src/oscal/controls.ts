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
