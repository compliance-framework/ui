import { type Filter } from '@/parsers/labelfilter.ts';
import type { Control, DefinedComponent } from '@/oscal';

export interface Dashboard {
  id?: string;
  uuid?: string;
  name: string;
  filter: Filter;
  controls: Control[];
  components: DefinedComponent[];
}

/** Used for creating a Dashboard: controls and components passed as arrays of IDs */
export interface DashboardCreate
  extends Omit<Dashboard, 'controls' | 'components'> {
  controls: string[];
  components: string[];
}
